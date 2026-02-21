from django.db import models
from account.models import User
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.contrib.postgres.indexes import GinIndex
from django.db.models import Index
from django.contrib.postgres.indexes import OpClass
from django.core.exceptions import ValidationError
from django.contrib.postgres.search import SearchQuery, SearchRank


#models for medicines
#DrugMasterModel
#FrequencyMaster
#RouteMaster
#FormulationMaster

class FormulationMaster(models.Model):
    """
    Tablet, Syrup, Injection, Drop, Cream, etc.
    Small reference table.
    """

    id = models.BigAutoField(primary_key=True)

    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if not self.name:
            raise ValidationError("Formulation name required.")

    def __str__(self):
        return self.name

class DrugMaster(models.Model):
    """
    Enterprise-grade medicine catalog.
    """

    id = models.BigAutoField(primary_key=True)

    # 🔑 Immutable Business Code
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    brand_name = models.CharField(
        max_length=255,
        db_index=True,
    )

    generic_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
    )

    composition = models.TextField(
        null=True,
        blank=True,
    )

    strength = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

    formulation = models.ForeignKey(
        "medicines.FormulationMaster",
        on_delete=models.PROTECT,
        related_name="drugs",
        db_index=True,
    )

    manufacturer = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
    )

    schedule_type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        db_index=True,
    )

    is_otc = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # 🔍 Full-text Search
    search_vector = SearchVectorField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["brand_name"]

        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["is_active", "brand_name"]),
            models.Index(fields=["generic_name"]),
            models.Index(fields=["manufacturer"]),
            models.Index(fields=["formulation"]),
        ]

    def clean(self):
        if not self.brand_name:
            raise ValidationError("Brand name required.")

    def save(self, *args, **kwargs):
        if self.pk:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Drug code cannot be modified.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.brand_name} {self.strength or ''}".strip()

class RouteMaster(models.Model):
    id = models.BigAutoField(primary_key=True)

    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True
    )

    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True
    )

    description = models.TextField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    search_vector = SearchVectorField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["is_active", "name"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Route code immutable.")
        super().save(*args, **kwargs)

class FrequencyMaster(models.Model):
    """
    Frequency master for prescriptions.

    Structured for:
    - AI analytics
    - Automated refill detection
    - Dosage schedule generation
    """

    id = models.BigAutoField(primary_key=True)

    # 🔑 Immutable Code
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Immutable frequency code (e.g., OD, BD, TDS, QID, SOS)"
    )

    display_name = models.CharField(
        max_length=100,
        db_index=True
    )

    description = models.TextField(
        null=True,
        blank=True
    )

    # 🧠 Structured Intelligence
    times_per_day = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="How many times per day"
    )

    interval_hours = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Interval in hours (if applicable)"
    )

    is_prn = models.BooleanField(
        default=False,
        help_text="PRN / SOS usage"
    )

    is_stat = models.BooleanField(
        default=False,
        help_text="Immediate one-time dose"
    )

    is_active = models.BooleanField(default=True)

    # 🔍 Search optimization
    search_vector = SearchVectorField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_name"]
        verbose_name = "Frequency"
        verbose_name_plural = "Frequencies"
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["code"]),
            models.Index(fields=["times_per_day"]),
            models.Index(fields=["is_prn"]),
            models.Index(fields=["is_stat"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if not self.code:
            raise ValidationError("Frequency code is required.")
        if not self.display_name:
            raise ValidationError("Display name is required.")

        if self.times_per_day and self.interval_hours:
            raise ValidationError(
                "Use either times_per_day or interval_hours, not both."
            )

    def save(self, *args, **kwargs):
        if self.pk:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Frequency code cannot be modified.")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name
    def search_frequencies(self, query):
        search_query = SearchQuery(query)

        return (
            FrequencyMaster.objects
            .annotate(rank=SearchRank("search_vector", search_query))
            .filter(search_vector=search_query, is_active=True)
            .order_by("-rank")[:20]
        )