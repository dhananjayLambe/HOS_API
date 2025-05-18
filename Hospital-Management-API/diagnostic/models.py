from django.db import models
import uuid
from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from consultations.models import Consultation
from account.models import User
from utils.static_data_service import StaticDataService


# View options for X-Ray and Imaging normalization
class ImagingView(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)  # e.g., "PA View"
    code = models.CharField(max_length=50, unique=True)   # e.g., "pa"
    description = models.TextField(blank=True, null=True, 
                                   help_text="Optional details about the imaging view usage",
                                    max_length=50, unique=True)  # e.g., "pa", "ap"

    def __str__(self):
        return self.name


# Category of Tests: Blood, X-Ray, Ultrasound, etc.
class TestCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)  # e.g., "Digital X-Ray"
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    modality = models.CharField(max_length=50, blank=True, null=True)  # imaging/lab/etc.
    description = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


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
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.type})"


class TestRecommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='test_recommendations')
    test = models.ForeignKey(MedicalTest, on_delete=models.SET_NULL, null=True, blank=True)
    custom_name = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    doctor_comment = models.TextField(blank=True, null=True, help_text="Internal doctor note for patient/context")
    is_completed = models.BooleanField(default=False)
    recommended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if not self.test and not self.custom_name:
            raise ValidationError("Either a predefined test or a custom name must be provided.")
        if self.custom_name and TestRecommendation.objects.filter(
            consultation=self.consultation,
            custom_name__iexact=self.custom_name.strip()
        ).exclude(id=self.id).exists():
            raise ValidationError("This custom test is already recommended for this consultation.")

    def __str__(self):
        return self.custom_name or (self.test.name if self.test else "Unnamed Test")


class TestPackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    standard_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tests = models.ManyToManyField(MedicalTest, related_name='included_in_packages')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        test_ids = list(self.tests.values_list('id', flat=True))
        if len(test_ids) != len(set(test_ids)):
            raise ValidationError("Duplicate tests in the package are not allowed.")

    def __str__(self):
        return self.name


class PackageRecommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='package_recommendations')
    package = models.ForeignKey(TestPackage, on_delete=models.CASCADE)
    notes = models.TextField(blank=True, null=True)
    doctor_comment = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    recommended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('consultation', 'package')

    def __str__(self):
        return self.package.name
