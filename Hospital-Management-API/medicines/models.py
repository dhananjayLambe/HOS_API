import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.db.models.functions import Lower
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.db import transaction

#medicines/models.py

# =====================================================
# ENUMS
# =====================================================

class DrugType(models.TextChoices):
    TABLET = "tablet"
    SYRUP = "syrup"
    INJECTION = "injection"
    INHALER = "inhaler"
    DROP = "drop"
    CREAM = "cream"
    INSULIN = "insulin"
    OINTMENT = "ointment"
    SUPPOSITORY = "suppository"
    SUPPLEMENT = "supplement"
    VACCINE = "vaccine"
    OTHER = "other"


# =====================================================
# 1️⃣ FORMULATION MASTER
# =====================================================

class FormulationMaster(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=100)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(Lower("name"), name="unique_formulation_lower")
        ]
        indexes = [
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if not self.name:
            raise ValidationError("Formulation name required.")
        self.name = self.name.strip().lower()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Hard delete not allowed. Deactivate instead.")

    def __str__(self):
        return self.name


# =====================================================
# 2️⃣ DOSE UNIT MASTER
# =====================================================

class DoseUnitMaster(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=50)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(Lower("name"), name="unique_dose_unit_lower")
        ]
        indexes = [
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if not self.name:
            raise ValidationError("Dose unit required.")
        self.name = self.name.strip().lower()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Hard delete not allowed.")

    def __str__(self):
        return self.name


# =====================================================
# 3️⃣ ROUTE MASTER
# =====================================================

class RouteMaster(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)

    description = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)

    search_vector = SearchVectorField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(Lower("name"), name="unique_route_lower")
        ]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if not self.name:
            raise ValidationError("Route name required.")
        self.name = self.name.strip().lower()

    def save(self, *args, **kwargs):

        if self.pk:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Route code cannot be modified.")

        self.full_clean()
        super().save(*args, **kwargs)

        # Update search vector AFTER save
        type(self).objects.filter(pk=self.pk).update(
            search_vector=SearchVector("name")
        )

    def delete(self, *args, **kwargs):
        raise ValidationError("Hard delete not allowed.")

    def __str__(self):
        return self.name


# =====================================================
# 4️⃣ FREQUENCY MASTER
# =====================================================

class FrequencyMaster(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    code = models.CharField(max_length=50, unique=True)

    display_name = models.CharField(max_length=100)

    description = models.TextField(blank=True, null=True)

    times_per_day = models.PositiveSmallIntegerField(null=True, blank=True)
    interval_hours = models.PositiveSmallIntegerField(null=True, blank=True)

    is_prn = models.BooleanField(default=False)
    is_stat = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    search_vector = SearchVectorField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_name"]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if not self.code or not self.display_name:
            raise ValidationError("Code and display name required.")

        if self.times_per_day and self.interval_hours:
            raise ValidationError("Use either times_per_day OR interval_hours.")

    def save(self, *args, **kwargs):

        if self.pk:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Frequency code cannot be modified.")

        self.full_clean()
        super().save(*args, **kwargs)

        type(self).objects.filter(pk=self.pk).update(
            search_vector=SearchVector("display_name")
        )

    def delete(self, *args, **kwargs):
        raise ValidationError("Hard delete not allowed.")

    def __str__(self):
        return self.display_name


# =====================================================
# 5️⃣ DRUG MASTER
# =====================================================

class DrugMaster(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    code = models.CharField(max_length=50, unique=True)

    brand_name = models.CharField(max_length=255, db_index=True)

    drug_type = models.CharField(
        max_length=20,
        choices=DrugType.choices,
        default=DrugType.TABLET
    )

    generic_name = models.CharField(max_length=255, blank=True, null=True)

    composition = models.TextField(blank=True, null=True)

    strength = models.CharField(max_length=100, blank=True, null=True)

    formulation = models.ForeignKey(
        FormulationMaster,
        on_delete=models.PROTECT,
        related_name="drugs"
    )

    manufacturer = models.CharField(max_length=255, blank=True, null=True)

    schedule_type = models.CharField(max_length=20, blank=True, null=True)

    is_otc = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

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
        ]

    def clean(self):

        if not self.brand_name:
            raise ValidationError("Brand name is required.")

        if not self.formulation:
            raise ValidationError("Formulation is required.")

        self.brand_name = self.brand_name.strip()

        if self.generic_name:
            self.generic_name = self.generic_name.strip()

    def save(self, *args, **kwargs):

        if self.pk:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Drug code cannot be modified.")

        self.full_clean()

        super().save(*args, **kwargs)

        # Update search vector AFTER save
        type(self).objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector("brand_name", weight="A") +
                SearchVector("generic_name", weight="B") +
                SearchVector("manufacturer", weight="C")
            )
        )

    def delete(self, *args, **kwargs):
        raise ValidationError("Hard delete not allowed.")

    def __str__(self):
        return f"{self.brand_name} {self.strength or ''}".strip()


# =====================================================
# 6️⃣ DRUG COMPOSITION (CRITICAL ADDITION)
# =====================================================

class DrugComposition(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    drug = models.ForeignKey(
        DrugMaster,
        on_delete=models.CASCADE,
        related_name="compositions"
    )

    ingredient = models.CharField(max_length=255)

    strength_value = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )

    strength_unit = models.ForeignKey(
        DoseUnitMaster,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["drug", "ingredient"],
                name="unique_ingredient_per_drug"
            )
        ]
    def clean(self):
        if not self.ingredient:
            raise ValidationError("Ingredient is required.")

    def __str__(self):
        return f"{self.ingredient} ({self.drug.brand_name})"