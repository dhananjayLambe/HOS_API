from rest_framework import serializers
from django.utils.text import slugify
from diagnostic.models import (
    MedicalTest, TestCategory, ImagingView, TestRecommendation,PackageRecommendation,
    TestPackage
    )
from django.db import transaction
from account.models import User
from diagnostic.models import DiagnosticLab, LabAdminUser
from django.contrib.auth.models import Group
from django.utils import timezone

class MedicalTestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    view_name = serializers.CharField(source="view.name", read_only=True)

    class Meta:
        model = MedicalTest
        fields = [
            "id", "name", "category", "category_name", "view", "view_name",
            "type", "description", "default_instructions",
            "standard_price", "is_active", "created_at"
        ]
        read_only_fields = ["id", "created_at"]
    
    def validate_name(self, value):
        if MedicalTest.objects.exclude(id=self.instance.id if self.instance else None).filter(name__iexact=value).exists():
            raise serializers.ValidationError("A medical test with this name already exists.")
        return value

class TestCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCategory
        fields = ['id', 'name', 'slug', 'modality', 'description']
        read_only_fields = ['id', 'slug']

    def validate_name(self, value):
        qs = TestCategory.objects.exclude(id=self.instance.id if self.instance else None)
        if qs.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value

    def create(self, validated_data):
        validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'name' in validated_data:
            validated_data['slug'] = slugify(validated_data['name'])
        return super().update(instance, validated_data)

class ImagingViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingView
        fields = ['id', 'name', 'code', 'description']
        read_only_fields = ['id']

    def validate(self, data):
        """
        Ensure uniqueness across name, code, and description
        """
        name = data.get('name', getattr(self.instance, 'name', None))
        code = data.get('code', getattr(self.instance, 'code', None))
        description = data.get('description', getattr(self.instance, 'description', None))

        qs = ImagingView.objects.exclude(id=self.instance.id if self.instance else None)

        if qs.filter(name__iexact=name).exists():
            raise serializers.ValidationError({'name': 'An imaging view with this name already exists.'})
        if qs.filter(code__iexact=code).exists():
            raise serializers.ValidationError({'code': 'An imaging view with this code already exists.'})
        if description and qs.filter(description__iexact=description).exists():
            raise serializers.ValidationError({'description': 'This description is already used.'})

        return data

class TestRecommendationSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)

    class Meta:
        model = TestRecommendation
        fields = [
            'id', 'consultation', 'test', 'test_name', 'custom_name', 'notes',
            'doctor_comment', 'is_completed', 'recommended_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'recommended_by', 'consultation']

    def validate(self, data):
        request = self.context.get('request')
        consultation_id = self.context['view'].kwargs.get('consultation_id')
        test = data.get('test')
        custom_name = data.get('custom_name')

        # 1. Must provide either test or custom name
        if not test and not custom_name:
            raise serializers.ValidationError("Either a predefined test or custom name must be provided.")

        # 2. Prevent duplicate custom_name for this consultation
        if custom_name:
            custom_name = custom_name.strip().lower()
            qs = TestRecommendation.objects.filter(
                consultation_id=consultation_id,
                custom_name__iexact=custom_name
            )
            if self.instance:  # Exclude current instance in case of update
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError("This custom test is already recommended for this consultation.")

        # 3. Optional: Prevent duplicate test (predefined) for same consultation
        if test:
            qs = TestRecommendation.objects.filter(
                consultation_id=consultation_id,
                test_id=test.id
            )
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError("This test is already recommended for this consultation.")

        return data

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



class LabAdminRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
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

    def validate_phone(self, phone):
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Phone number already taken.")
        return phone

    def create(self, validated_data):
        lab = DiagnosticLab.objects.get(id=validated_data["lab_id"])

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data["phone"],
            status=True
        )

        # Add to lab-admin group
        lab_group, _ = Group.objects.get_or_create(name="lab-admin")
        user.groups.add(lab_group)

        lab_admin = LabAdminUser.objects.create(user=user, lab=lab)
        return lab_admin


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