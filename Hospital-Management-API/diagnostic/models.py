from django.db import models
import uuid
import random
from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from consultations.models import Consultation
from account.models import User
from utils.static_data_service import StaticDataService

STATUS_CHOICES = [
    ('RECOMMENDED', 'Recommended'),
    ('BOOKED', 'Booked'),
    ('COMPLETED', 'Completed'),
    ('CANCELLED', 'Cancelled')
]
def generate_test_pnr():
    while True:
        pnr = str(random.randint(1000000000, 9999999999))  # 10-digit number
        if not TestRecommendation.objects.filter(test_pnr=pnr).exists():
            return pnr


# View options for X-Ray and Imaging normalization
class ImagingView(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)  # e.g., "PA View"
    code = models.CharField(max_length=50, unique=True)   # e.g., "pa"
    description = models.TextField(blank=True, null=True, 
                                   help_text="Optional details about the imaging view usage",
                                    max_length=50, unique=True)  # e.g., "pa", "ap"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name
    class Meta:
        ordering = ['-created_at']

# Category of Tests: Blood, X-Ray, Ultrasound, etc.
class TestCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)  # e.g., "Digital X-Ray"
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    modality = models.CharField(max_length=50, blank=True, null=True)  # imaging/lab/etc.
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):

        if self.name:
            self.name = self.name.strip()
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]

class MedicalTest(models.Model):
    TEST_TYPE_CHOICES = StaticDataService.get_test_type_choices()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    category = models.ForeignKey(TestCategory, on_delete=models.SET_NULL, null=True, related_name='tests')
    view = models.ForeignKey(ImagingView, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=30, choices=TEST_TYPE_CHOICES)
    description = models.TextField(blank=True, null=True)
    default_instructions = models.TextField(blank=True, null=True)
    standard_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    sample_required = models.CharField(max_length=100, blank=True, null=True)
    fasting_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                name='unique_lowercase_test_name',
                fields=['name'],
                condition=models.Q(name__isnull=False, is_active=True),
            )
        ]
        indexes = [
            models.Index(fields=['type']),
            models.Index(fields=['is_active']),
        ]

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip().lower()  # ✅ Normalize to lowercase for uniqueness
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name.title()} ({self.type})"

class DiagnosticLab(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    contact = models.CharField(max_length=100, blank=True, null=True)
    service_pincodes = models.JSONField(default=list, blank=True)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    doctor_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True)
    certifications = models.TextField(blank=True, null=True, help_text="e.g., NABL, ISO")
    license_number = models.CharField(max_length=100, blank=True, null=True)
    license_valid_till = models.DateField(blank=True, null=True)
    lab_type = models.CharField(
        max_length=100,
        choices=[
            ('collection_center', 'Collection Center'),
            ('diagnostic_lab', 'Diagnostic Lab'),
            ('pathology_lab', 'Pathology Lab'),
            ('radiology_center', 'Radiology Center'),
        ],
        default='diagnostic_lab'
    )
    test_types_supported = models.JSONField(default=list, blank=True, help_text="E.g., ['blood', 'urine', 'MRI', 'CT', 'ultrasound']")
    home_sample_collection = models.BooleanField(default=False)
    sample_pickup_timings = models.CharField(max_length=255, blank=True, null=True)
    report_delivery_timings = models.CharField(max_length=255, blank=True, null=True)

    turnaround_time_hours = models.IntegerField(default=24, help_text="Default TAT for reports")
    pricing_tier = models.CharField(
        max_length=50,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('premium', 'Premium')],
        default='medium'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    class Meta:
        ordering = ['-created_at']
        indexes = [
        models.Index(fields=['lab_type']),
        models.Index(fields=['is_active']),
        ]


class TestLabMapping(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey("diagnostic.MedicalTest", on_delete=models.CASCADE)
    lab = models.ForeignKey("diagnostic.DiagnosticLab", on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    is_available = models.BooleanField(default=True)
    turnaround_time = models.PositiveIntegerField(help_text="In hours")  # in hours
    home_collection_available = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, help_text="Is this mapping currently active?")
    notes = models.TextField(blank=True, null=True, help_text="Any additional notes about this mapping")
    # This field is used to track the last time this mapping was updated
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=["test", "lab"], condition=models.Q(is_active=True), name="unique_active_test_lab")
        ]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lab"]),
            models.Index(fields=["test"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.test.name.title()} at {self.lab.name}"

class TestRecommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='test_recommendations')
    test = models.ForeignKey(MedicalTest, on_delete=models.SET_NULL, null=True, blank=True)
    custom_name = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    doctor_comment = models.TextField(blank=True, null=True, help_text="Internal doctor note for patient/context")
    is_completed = models.BooleanField(default=False)
    scheduled_for = models.DateTimeField(null=True, blank=True, help_text="Doctor-suggested preferred date")
    recommended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    test_pnr = models.CharField(max_length=10, unique=True, default=generate_test_pnr, db_index=True)
    lab_advised = models.BooleanField(default=False)
    test_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='RECOMMENDED',
        help_text="Track the current state of test"
    )
    category_snapshot = models.CharField(max_length=100, blank=True, null=True)
    source = models.CharField(
        max_length=30, blank=True, null=True,
        help_text="Indicates how test was added: doctor, patient_upload, external_prescription"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def clean(self):
        if not self.test and not self.custom_name:
            raise ValidationError("Either a predefined test or a custom name must be provided.")
        if self.custom_name and TestRecommendation.objects.filter(
            consultation=self.consultation,
            custom_name__iexact=self.custom_name.strip(),
            is_active=True
        ).exclude(id=self.id).exists():
            raise ValidationError("This custom test is already recommended for this consultation.")

    def __str__(self):
        return self.custom_name or (self.test.name if self.test else "Unnamed Test")
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['consultation', 'test'],
                name='unique_consultation_test',
                condition=models.Q(test__isnull=False, is_active=True)
            )
        ]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['consultation']),
            models.Index(fields=['test']),
            models.Index(fields=['is_active']),
        ]


class TestPackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    standard_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tests = models.ManyToManyField("diagnostic.MedicalTest", related_name='included_in_packages')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def clean(self):
        if self.tests.exists():
            test_ids = list(self.tests.values_list('id', flat=True))
            if len(test_ids) != len(set(test_ids)):
                raise ValidationError("Duplicate tests in the package are not allowed.")

    def __str__(self):
        return self.name
    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['name'],
                condition=models.Q(is_active=True),
                name="unique_active_package_name"
            )
        ]
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
        ]

class PackageRecommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='package_recommendations')
    package = models.ForeignKey(TestPackage, on_delete=models.CASCADE, related_name='recommended_packages')
    notes = models.TextField(blank=True, null=True)
    doctor_comment = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    recommended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['consultation', 'package'], condition=models.Q(is_active=True), name='unique_active_consultation_package'
            )
        ]
        indexes = [
            models.Index(fields=['consultation']),
            models.Index(fields=['is_active']),
        ]
        unique_together = ('consultation', 'package')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.package.name} for {self.consultation.id}"

class BookingGroup(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('SCHEDULED', 'Scheduled'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(
        "consultations.Consultation", on_delete=models.CASCADE,
        related_name="booking_groups",null=True, blank=True,
    )
    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile", on_delete=models.CASCADE,
        related_name="booking_groups",null=True, blank=True,
    )
    booked_by = models.CharField(
        max_length=30,
        choices=[('patient', 'Patient'), ('helpdesk', 'Helpdesk')],
        default='patient'
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING',
        help_text="Overall group booking status"
    )
    is_home_collection = models.BooleanField(default=False)
    preferred_schedule_time = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    lab_grouping_type = models.CharField(
        max_length=20,
        choices=[("single_lab", "Single Lab"), ("multi_lab", "Multi Lab")],
        default="single_lab",
        help_text="Indicates if all tests were booked under one lab or multiple"
    )
    total_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True)
    source = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="e.g., patient_app, helpdesk_panel")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    def __str__(self):
        return f"BookingGroup for {self.patient_profile.get_full_name()} - {self.status}"
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['consultation']),
            models.Index(fields=['patient_profile']),
            models.Index(fields=['status']),
        ]

class TestBooking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('SCHEDULED', 'Scheduled'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # ✅ Linking booking group (optional but useful if bulk booked)
    booking_group = models.ForeignKey(
        "diagnostic.BookingGroup", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="test_bookings"
    )
    # ✅ Denormalized for fast access and traceability
    consultation = models.ForeignKey(
        "consultations.Consultation", on_delete=models.CASCADE,
        related_name="test_bookings",null=True, blank=True,
    )
    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile", on_delete=models.CASCADE,
        related_name="test_bookings",null=True, blank=True,
    )
    recommendation = models.ForeignKey(
        "diagnostic.TestRecommendation", on_delete=models.CASCADE,
        related_name='bookings',null=True, blank=True,
    )
    lab = models.ForeignKey(
        "diagnostic.DiagnosticLab", on_delete=models.SET_NULL, null=True,
        related_name="test_bookings"
    )
    lab_mapping = models.ForeignKey(
        "diagnostic.TestLabMapping", on_delete=models.SET_NULL,
        null=True, blank=True, help_text="Lab mapping used for price/TAT"
    )
    test_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True)
    tat_hours = models.PositiveIntegerField(
        null=True, blank=True, help_text="Snapshot of turnaround time")
    is_home_collection = models.BooleanField(default=False)
    scheduled_time = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    booked_by = models.CharField(
        max_length=30,
        choices=[('patient', 'Patient'), ('helpdesk', 'Helpdesk')],
        default='patient'
    )
    lab_approved_at = models.DateTimeField(blank=True, null=True, help_text="Time when lab confirmed the booking")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    def __str__(self):
        return f"Booking for {self.recommendation.test_pnr} - {self.patient_profile.get_full_name()}"
    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['recommendation'],
                name='unique_booking_per_recommendation'
            )
        ]
        indexes = [
            models.Index(fields=["consultation"]),
            models.Index(fields=["patient_profile"]),
            models.Index(fields=["lab"]),
            models.Index(fields=["is_active"]),
        ]

class TestReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab = models.ForeignKey(DiagnosticLab, on_delete=models.SET_NULL, null=True, blank=True)
    booking = models.OneToOneField(TestBooking, on_delete=models.CASCADE, related_name='report')
    file = models.FileField(upload_to='reports/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_external = models.BooleanField(default=False)
    comments = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Report for {self.booking.recommendation.test_pnr}"
    class Meta:
        ordering = ['-created_at']


class LabCommissionLedger(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(TestBooking, on_delete=models.CASCADE)
    lab = models.ForeignKey(DiagnosticLab, on_delete=models.CASCADE)
    test = models.ForeignKey(MedicalTest, on_delete=models.SET_NULL, null=True)
    test_price = models.DecimalField(max_digits=8, decimal_places=2)
    platform_commission_amount = models.DecimalField(max_digits=8, decimal_places=2)
    doctor_commission_amount = models.DecimalField(max_digits=8, decimal_places=2)
    lab_net_earning = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Commission: {self.lab.name} - {self.test.name}"
    class Meta:
        ordering = ['-created_at']

class LabAdminUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="lab_admin_profile")
    mobile_number = models.CharField(max_length=15, unique=True,default="NA")
    lab = models.OneToOneField("diagnostic.DiagnosticLab", on_delete=models.CASCADE, related_name="lab_admin")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.first_name} - {self.lab.name}"



class DiagnosticLabAddress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab = models.OneToOneField(DiagnosticLab, on_delete=models.CASCADE, related_name="address", unique=True)
    address = models.TextField(max_length=255, default='NA')
    address2 = models.TextField(max_length=255, default='NA')
    city = models.CharField(max_length=100, default='NA')
    state = models.CharField(max_length=100, default='NA')
    pincode = models.CharField(max_length=10, default='NA')
    country = models.CharField(max_length=100, default="India")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    google_place_id = models.CharField(max_length=255, blank=True, null=True)
    google_maps_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.address}, {self.city}, {self.state}, {self.pincode}"
    

# diagnostic/models.py

class PackageLabMapping(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey("diagnostic.TestPackage", on_delete=models.CASCADE, related_name="lab_mappings")
    lab = models.ForeignKey("diagnostic.DiagnosticLab", on_delete=models.CASCADE, related_name="package_mappings")
    price = models.DecimalField(max_digits=8, decimal_places=2)
    is_available = models.BooleanField(default=True)
    turnaround_time = models.PositiveIntegerField(help_text="In hours")
    home_collection_available = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["package", "lab"], condition=models.Q(is_active=True), name="unique_active_package_lab")
        ]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lab"]),
            models.Index(fields=["package"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.package.name} - {self.lab.name}"