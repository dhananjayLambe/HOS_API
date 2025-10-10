from rest_framework import serializers
from django.utils.text import slugify
from diagnostic.models import (
    MedicalTest, TestCategory, ImagingView, TestRecommendation,PackageRecommendation,
    TestPackage,DiagnosticLabAddress,TestLabMapping,PackageLabMapping,TestRecommendation,
    TestBooking,BookingGroup,TestReport,
    DiagnosticLab,
    DiagnosticLabAddress,
    LabAdminUser,
    ServiceCategory,
    )
from django.db import transaction
from account.models import User
from diagnostic.models import DiagnosticLab, LabAdminUser
from django.contrib.auth.models import Group
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from consultations.models import Consultation
from patient_account.api.serializers import PatientProfileSearchSerializer,PatientInfoSerializer
import os

class PackageRecommendationSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.name', read_only=True)

    class Meta:
        model = PackageRecommendation
        fields = [
            'id', 'consultation', 'package', 'package_name', 'notes', 'doctor_comment',
            'is_completed', 'recommended_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'recommended_by', 'consultation', 'package_name']

    def validate(self, data):
        request = self.context.get('request')
        consultation_id = self.context['view'].kwargs.get('consultation_id')
        package = data.get('package')

        # Check for duplicate
        qs = PackageRecommendation.objects.filter(consultation_id=consultation_id, package=package)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("This package is already recommended for this consultation.")

        return data

class TestPackageSerializer(serializers.ModelSerializer):
    tests = serializers.PrimaryKeyRelatedField(queryset=MedicalTest.objects.all(), many=True)

    class Meta:
        model = TestPackage
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        if TestPackage.objects.filter(name=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("A package with this name already exists.")
        return value

    def validate(self, data):
        test_ids = data.get('tests', [])
        if len(test_ids) != len(set(test_ids)):
            raise serializers.ValidationError("Duplicate tests in the package are not allowed.")
        return data

    def create(self, validated_data):
        tests = validated_data.pop('tests')
        with transaction.atomic():
            package = TestPackage.objects.create(**validated_data)
            package.tests.set(tests)
        return package

    def update(self, instance, validated_data):
        tests = validated_data.pop('tests', None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            if tests is not None:
                instance.tests.set(tests)
        return instance

class DiagnosticLabSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticLab
        fields = '__all__'

    def validate_license_valid_till(self, value):
        if value and value < timezone.localdate():
            raise serializers.ValidationError("License expiry date cannot be in the past.")
        return value

    def validate_name(self, value):
        if DiagnosticLab.objects.filter(name__iexact=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("Lab with this name already exists.")
        return value

class DiagnosticLabAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticLabAddress
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_pincode(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("Pincode must be a 6-digit number.")
        return value

    def validate(self, data):
        lab = data.get('lab')
        if self.instance is None and DiagnosticLabAddress.objects.filter(lab=lab).exists():
            raise serializers.ValidationError("Address for this lab already exists.")
        return data

class LabAdminRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    mobile_number = serializers.CharField()
    password = serializers.CharField(write_only=True)
    lab_id = serializers.UUIDField()

    def validate_lab_id(self, lab_id):
        if LabAdminUser.objects.filter(lab_id=lab_id).exists():
            raise serializers.ValidationError("Lab already has an admin user.")
        if not DiagnosticLab.objects.filter(id=lab_id).exists():
            raise serializers.ValidationError("Lab does not exist.")
        return lab_id

    def validate_email(self, email):
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Email is already taken.")
        return email

    def validate_mobile_number(self, mobile_number):
        if User.objects.filter(username=mobile_number).exists():
            raise serializers.ValidationError("Mobile number is already taken.")
        return mobile_number

    def create(self, validated_data):
        lab = DiagnosticLab.objects.get(id=validated_data["lab_id"])
        mobile_number = validated_data["mobile_number"]

        user = User.objects.create_user(
            username=mobile_number,  # Username is mobile number
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            status=True
        )

        lab_group, _ = Group.objects.get_or_create(name="lab-admin")
        user.groups.add(lab_group)

        lab_admin = LabAdminUser.objects.create(
            user=user,
            lab=lab,
            mobile_number=mobile_number
        )
        return lab_admin

class LabAdminLoginSerializer(serializers.Serializer):
    mobile_number = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        mobile_number = data.get("mobile_number")
        password = data.get("password")

        if not mobile_number or not password:
            raise serializers.ValidationError("Mobile number and password are required.")

        user = authenticate(username=mobile_number, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials.")

        try:
            lab_admin_profile = user.lab_admin_profile
        except LabAdminUser.DoesNotExist:
            raise serializers.ValidationError("User is not a Lab Admin.")

        if not lab_admin_profile.is_active or not user.is_active:
            raise serializers.ValidationError("Lab admin account is inactive.")

        tokens = RefreshToken.for_user(user)
        return {
            "access": str(tokens.access_token),
            "refresh": str(tokens),
            "user_id": str(user.id),
            "lab_admin_id": str(lab_admin_profile.id),
            "lab_id": str(lab_admin_profile.lab.id),
            "name": user.first_name,
            "email": user.email
        }

class TestCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCategory
        fields = ['id', 'name', 'slug', 'modality', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def validate_name(self, value):
        value = value.strip()
        if TestCategory.objects.filter(name__iexact=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("A test category with this name already exists.")
        return value

class ImagingViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingView
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        value = value.strip()
        if ImagingView.objects.filter(name__iexact=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("Imaging view with this name already exists.")
        return value

    def validate_code(self, value):
        value = value.strip().lower()
        if ImagingView.objects.filter(code__iexact=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("Imaging view with this code already exists.")
        return value

class MedicalTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalTest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        value = value.strip().lower()
        qs = MedicalTest.objects.filter(name__iexact=value, is_active=True)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("A medical test with this name already exists.")
        return value

class TestPackageSerializer(serializers.ModelSerializer):
    tests = serializers.PrimaryKeyRelatedField(queryset=MedicalTest.objects.filter(is_active=True), many=True)

    class Meta:
        model = TestPackage
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        value = value.strip()
        qs = TestPackage.objects.filter(name__iexact=value, is_active=True)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("A package with this name already exists.")
        return value

    def validate_tests(self, value):
        if not value:
            raise serializers.ValidationError("At least one test must be selected.")
        test_ids = [test.id for test in value]
        if len(test_ids) != len(set(test_ids)):
            raise serializers.ValidationError("Duplicate tests in the package are not allowed.")
        return value

class TestLabMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestLabMapping
        fields = "__all__"
        read_only_fields = ["id", "lab", "created_at", "updated_at"]

    def validate(self, data):
        test = data.get("test")
        lab = self.context["lab"]  # Passed from view
        if TestLabMapping.objects.filter(test=test, lab=lab, is_active=True).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("This test is already mapped to your lab.")
        return data

class PackageLabMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackageLabMapping
        fields = "__all__"
        read_only_fields = ["id", "lab", "created_at", "updated_at"]

    def validate(self, data):
        package = data.get("package")
        lab = self.context.get("lab")

        if PackageLabMapping.objects.filter(package=package, lab=lab, is_active=True).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("This package is already mapped to your lab.")
        return data

class TestRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestRecommendation
        fields = '__all__'
        read_only_fields = ('recommended_by', 'test_pnr', 'created_at', 'updated_at')

    def validate(self, attrs):
        test = attrs.get("test")
        custom_name = attrs.get("custom_name")
        if not test and not custom_name:
            raise serializers.ValidationError("Either test or custom_name must be provided.")
        return attrs

class PackageRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackageRecommendation
        fields = '__all__'
        read_only_fields = ['id', 'recommended_by', 'created_at', 'updated_at', 'is_active']

    def validate(self, data):
        consultation = data.get("consultation")
        package = data.get("package")
        if PackageRecommendation.objects.filter(
            consultation=consultation, package=package, is_active=True
        ).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("Package already recommended for this consultation.")
        return data

class BulkPackageRecommendationSerializer(serializers.Serializer):
    consultation = serializers.UUIDField()
    packages = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    doctor_comment = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        consultation_id = data['consultation']
        package_ids = data['packages']
        if len(package_ids) != len(set(package_ids)):
            raise serializers.ValidationError("Duplicate packages in request.")
        existing = PackageRecommendation.objects.filter(
            consultation_id=consultation_id,
            package_id__in=package_ids,
            is_active=True
        ).values_list("package_id", flat=True)
        if existing:
            names = TestPackage.objects.filter(id__in=existing).values_list("name", flat=True)
            raise serializers.ValidationError(f"Already recommended: {', '.join(names)}")
        return data

class AutoBookingRequestSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    patient_profile_id = serializers.UUIDField()
    pincode = serializers.CharField(max_length=10)
    scheduled_time = serializers.DateTimeField()
    booked_by = serializers.ChoiceField(choices=[('patient', 'Patient'), ('helpdesk', 'Helpdesk')])

    def validate_scheduled_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value

class ManualBookingSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    patient_profile_id = serializers.UUIDField()
    scheduled_time = serializers.DateTimeField()
    booked_by = serializers.ChoiceField(choices=['patient', 'helpdesk'])
    bookings = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        help_text="Each item must contain test_id and lab_id."
    )

    def validate(self, data):
        if data['scheduled_time'] < timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        if not data['bookings']:
            raise serializers.ValidationError("Booking list cannot be empty.")
        return data

class UpdateBookingSerializer(serializers.Serializer):
    scheduled_time = serializers.DateTimeField(required=False)
    status = serializers.ChoiceField(choices=TestBooking.STATUS_CHOICES, required=False)


class TestBookingSummarySerializer(serializers.ModelSerializer):
    test = serializers.CharField(source="recommendation.test.name", read_only=True)
    lab = serializers.CharField(source="lab.name", read_only=True)

    class Meta:
        model = TestBooking
        fields = ["id", "test", "lab", "scheduled_time", "status"]

class BookingGroupSerializer(serializers.ModelSerializer):
    bookings = TestBookingSummarySerializer(source="test_bookings", many=True, read_only=True)

    class Meta:
        model = BookingGroup
        fields = [
            "id", "consultation", "patient_profile", "booked_by", "status",
            "preferred_schedule_time", "lab_grouping_type", "notes",
            "created_at", "updated_at", "bookings"
        ]
        read_only_fields = ["id", "created_at", "updated_at", "bookings"]

    def update(self, instance, validated_data):
        instance.preferred_schedule_time = validated_data.get("preferred_schedule_time", instance.preferred_schedule_time)
        instance.notes = validated_data.get("notes", instance.notes)
        instance.save()
        return instance


class TestBookingListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    test_name = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    lab_name = serializers.CharField(source="lab.name")

    class Meta:
        model = TestBooking
        fields = [
            "id",
            "status",
            "scheduled_time",
            "test_price",
            "tat_hours",
            "booked_by",
            "patient_name",
            "test_name",
            "category",
            "lab_name"
        ]

    def get_patient_name(self, obj):
        return obj.patient_profile.get_full_name() if obj.patient_profile else ""

    def get_test_name(self, obj):
        return obj.recommendation.test.name.title() if obj.recommendation and obj.recommendation.test else ""

    def get_category(self, obj):
        return obj.recommendation.test.category.name if obj.recommendation and obj.recommendation.test and obj.recommendation.test.category else ""



class BookingListSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="recommendation.test.name", read_only=True)
    category = serializers.CharField(source="recommendation.test.category.name", read_only=True)
    patient_name = serializers.CharField(source="patient_profile.get_full_name", read_only=True)
    mobile_number = serializers.CharField(source="patient_profile.account.mobile_number", read_only=True)
    lab_name = serializers.CharField(source="lab.name", read_only=True)

    class Meta:
        model = TestBooking
        fields = [
            "id", "booking_group_id", "consultation_id", "scheduled_time",
            "test_name", "category", "status", "booked_by",
            "patient_name", "mobile_number", "lab_name", "is_home_collection",
            "created_at", "updated_at"
        ]
    

class BookingStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TestBooking.STATUS_CHOICES)


class RescheduleBookingSerializer(serializers.Serializer):
    scheduled_time = serializers.DateTimeField()


class HomeCollectionConfirmSerializer(serializers.Serializer):
    collector_name = serializers.CharField(max_length=100)
    collector_contact = serializers.CharField(max_length=15)
    home_collection_address = serializers.CharField()
    scheduled_time = serializers.DateTimeField(required=False)

    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value


class HomeCollectionRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255)

# --- Serializer for Rescheduling Home Collection ---
class HomeCollectionRescheduleSerializer(serializers.Serializer):
    scheduled_time = serializers.DateTimeField(required=True)

    def validate_scheduled_time(self, value):
        now = timezone.localtime()
        if value <= now:
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value

# --- Serializer for Marking Collection ---
class MarkCollectedSerializer(serializers.Serializer):
    collector_name = serializers.CharField(max_length=100)
    collector_contact = serializers.CharField(max_length=15)


class BookingGroupListSerializer(serializers.ModelSerializer):
    bookings = TestBookingListSerializer(source="test_bookings", many=True, read_only=True)
    patient_profile = PatientProfileSearchSerializer(read_only=True)

    class Meta:
        model = BookingGroup
        fields = [
            "id",
            "consultation",
            "patient_profile",
            "booked_by",
            "status",
            "is_home_collection",
            "preferred_schedule_time",
            "notes",
            "lab_grouping_type",
            "total_price",
            "source",
            "created_at",
            "updated_at",
            "bookings"
        ]


ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.xls', '.xlsx']

class LabReportUploadSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField(required=True)
    file = serializers.FileField(required=True)
    comments = serializers.CharField(required=False, allow_blank=True)
    is_external = serializers.BooleanField(required=False)

    def validate_booking_id(self, value):
        if not TestBooking.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Invalid or inactive booking ID.")
        return value
    def validate_file_extension(file):
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        return file


class TestBookingSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='recommendation.test.name', read_only=True)
    test_type = serializers.CharField(source='recommendation.test.type', read_only=True)
    lab_name = serializers.CharField(source='lab.name', read_only=True)
    test_pnr = serializers.CharField(source='recommendation.test_pnr', read_only=True)

    class Meta:
        model = TestBooking
        fields = [
            'id', 'test_name', 'test_type', 'status', 'test_pnr',
            'lab_name', 'is_home_collection', 'scheduled_time', 'collected_time'
        ]

class BookingGroupTestListSerializer(serializers.Serializer):
    patient = PatientProfileSearchSerializer()
    tests = TestBookingSerializer(many=True)

class TestReportDownloadSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient_profile.full_name", read_only=True)
    patient_mobile = serializers.CharField(source="patient_profile.mobile", read_only=True)
    consultation_id = serializers.UUIDField(source="consultation.id", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TestReport
        fields = [
            "id",
            "test_pnr",
            "patient_name",
            "patient_mobile",
            "consultation_id",
            "file_url",
            "uploaded_at",
            "is_external",
            "comments"
        ]

class TestReportDetailsSerializer(serializers.ModelSerializer):
    test_name = serializers.SerializerMethodField()
    booking_id = serializers.UUIDField(source="booking.id")
    consultation_id = serializers.UUIDField(source="consultation.id")
    patient_name = serializers.CharField(source="patient_profile.get_full_name", default="")
    report_url = serializers.FileField(source="file")
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = TestReport
        fields = [
            "id",  # report_id
            "test_pnr",
            "booking_id",
            "consultation_id",
            "patient_name",
            "test_name",
            "report_url",
            "uploaded_at"
        ]

    def get_test_name(self, obj):
        return obj.booking.recommendation.test.name if obj.booking and obj.booking.recommendation and obj.booking.recommendation.test else None

    def get_uploaded_at(self, obj):
        return timezone.localtime(obj.uploaded_at).strftime("%Y-%m-%d %H:%M:%S")

class TestReportDetailsSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="booking.recommendation.test_name", read_only=True)
    lab_name = serializers.CharField(source="booking.lab.name", read_only=True)

    class Meta:
        model = TestReport
        fields = [
            'id', 'file', 'test_pnr', 'comments', 'is_external', 'uploaded_at',
            'consultation_id', 'patient_profile_id', 'test_name', 'lab_name'
        ]



class AdminDetailsSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=15)  # mobile number used as username
    email = serializers.EmailField(required=False, allow_blank=True)
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True)


class LabDetailsSerializer(serializers.Serializer):
    lab_name = serializers.CharField(max_length=255)
    lab_type = serializers.ChoiceField(
        choices=[c[0] for c in DiagnosticLab._meta.get_field("lab_type").choices],
        default="diagnostic_lab",
    )
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    license_valid_till = serializers.DateField(required=False, allow_null=True)
    certifications = serializers.CharField(required=False, allow_blank=True)
    service_categories = serializers.ListField(
        child=serializers.CharField(max_length=150),
        allow_empty=True,
        required=False,
    )
    home_sample_collection = serializers.BooleanField(required=False, default=False)
    pricing_tier = serializers.ChoiceField(
        choices=[c[0] for c in DiagnosticLab._meta.get_field("pricing_tier").choices],
        default="medium",
    )
    turnaround_time_hours = serializers.IntegerField(required=False, default=24)


class AddressDetailsSerializer(serializers.Serializer):
    address = serializers.CharField(max_length=255)
    address2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    pincode = serializers.CharField(max_length=10)
    latitude = serializers.DecimalField(max_digits=30, decimal_places=20, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=30, decimal_places=20, required=False, allow_null=True)


class KYCDetailsSerializer(serializers.Serializer):
    kyc_document_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    kyc_document_number = serializers.CharField(max_length=50, required=False, allow_blank=True)


class LabOnboardSerializer(serializers.Serializer):
    admin_details = AdminDetailsSerializer()
    lab_details = LabDetailsSerializer()
    address_details = AddressDetailsSerializer()
    kyc_details = KYCDetailsSerializer(required=False)

    def validate_admin_details(self, value):
        username = value.get("username")
        if not username:
            raise serializers.ValidationError("username (mobile number) is required.")
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError(
                "This mobile number is already registered. Please use a different one."
            )
        return value

    def validate_lab_details(self, value):
        lab_name = value.get("lab_name")
        if DiagnosticLab.objects.filter(name__iexact=lab_name.strip()).exists():
            raise serializers.ValidationError({"lab_name": "This lab name already exists."})
        return value

    def _get_or_create_service_categories(self, category_names):
        categories = []
        for name in category_names or []:
            name = name.strip()
            if not name:
                continue
            category = ServiceCategory.objects.filter(name__iexact=name).first()
            if not category:
                category = ServiceCategory.objects.create(name=name)
            categories.append(category)
        return categories

    @transaction.atomic
    def create(self, validated_data):
        admin_data = validated_data["admin_details"]
        lab_data = validated_data["lab_details"]
        address_data = validated_data["address_details"]
        kyc_data = validated_data.get("kyc_details", {})

        # ✅ Create User
        username = admin_data["username"].strip()
        user = User.objects.create(
            username=username,
            first_name=admin_data.get("first_name", "").strip(),
            last_name=admin_data.get("last_name", "").strip(),
            email=admin_data.get("email", "").strip(),
            is_active=False,
        )
        user.set_unusable_password()  # OTP-based login
        # Add user to 'lab-admin' group
        lab_admin_group, _ = Group.objects.get_or_create(name="labadmin")
        user.groups.add(lab_admin_group)
        user.save()

        # ✅ Create Lab
        lab = DiagnosticLab.objects.create(
            name=lab_data["lab_name"].strip(),
            lab_type=lab_data.get("lab_type", "diagnostic_lab"),
            license_number=lab_data.get("license_number") or None,
            license_valid_till=lab_data.get("license_valid_till") or None,
            certifications=lab_data.get("certifications") or None,
            home_sample_collection=lab_data.get("home_sample_collection", False),
            pricing_tier=lab_data.get("pricing_tier", "medium"),
            turnaround_time_hours=lab_data.get("turnaround_time_hours", 24),
            contact=username,
            is_active=False,  # until admin approval
        )

        # ✅ Link Service Categories
        category_list = self._get_or_create_service_categories(lab_data.get("service_categories", []))
        if hasattr(lab, "service_categories"):
            lab.service_categories.add(*category_list)

        # ✅ Create Address
        DiagnosticLabAddress.objects.create(
            lab=lab,
            address=address_data.get("address"),
            address2=address_data.get("address2") or "",
            city=address_data.get("city"),
            state=address_data.get("state"),
            pincode=address_data.get("pincode"),
            latitude=address_data.get("latitude"),
            longitude=address_data.get("longitude"),
        )

        # ✅ Create Lab Admin
        lab_admin = LabAdminUser.objects.create(
            user=user,
            lab=lab,
            secondary_mobile_number="NA",
            status="pending",
            is_approved=False,
            kyc_completed=bool(kyc_data.get("kyc_document_number")),
            kyc_verified=False,
            kyc_document_type=kyc_data.get("kyc_document_type"),
            kyc_document_number=kyc_data.get("kyc_document_number"),
            is_active=False,
        )

        return {"lab": lab, "lab_admin": lab_admin}

    def to_representation(self, instance):
        lab = instance["lab"]
        lab_admin = instance["lab_admin"]

        categories = (
            list(lab.service_categories.values_list("name", flat=True))
            if hasattr(lab, "service_categories")
            else []
        )

        return {
            "message": "Lab registration submitted successfully. Pending approval by DoctorProCare Admin.",
            "data": {
                "lab_id": str(lab.id),
                "lab_name": lab.name,
                "lab_type": lab.lab_type,
                "status": lab_admin.status,
                "is_approved": lab_admin.is_approved,
                "service_categories": categories,
                "lab_admin": {
                    "admin_id": str(lab_admin.id),
                    "name": f"{lab_admin.user.first_name} {lab_admin.user.last_name}".strip(),
                    "username": lab_admin.user.username,
                    "email": lab_admin.user.email,
                    "status": lab_admin.status,
                    "is_approved": lab_admin.is_approved,
                    "kyc_completed": lab_admin.kyc_completed,
                },
                "address": {
                    "address": lab.address.address if hasattr(lab, "address") else "",
                    "city": lab.address.city if hasattr(lab, "address") else "",
                    "state": lab.address.state if hasattr(lab, "address") else "",
                    "pincode": lab.address.pincode if hasattr(lab, "address") else "",
                },
                "created_at": lab.created_at.isoformat(),
            },
        }