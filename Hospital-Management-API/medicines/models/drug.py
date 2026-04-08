import uuid

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector, SearchVectorField
from django.core.exceptions import ValidationError
from django.db import models

from .choices import DrugType
from .masters import DoseUnitMaster, FormulationMaster


class DrugMaster(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    brand_name = models.CharField(max_length=255, db_index=True)
    drug_type = models.CharField(
        max_length=20,
        choices=DrugType.choices,
        default=DrugType.TABLET,
    )
    generic_name = models.CharField(max_length=255, blank=True, null=True)
    composition = models.TextField(blank=True, null=True)
    strength = models.CharField(max_length=100, blank=True, null=True)
    formulation = models.ForeignKey(
        FormulationMaster,
        on_delete=models.PROTECT,
        related_name="drugs",
    )
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    schedule_type = models.CharField(max_length=20, blank=True, null=True)
    is_otc = models.BooleanField(default=False)
    is_common = models.BooleanField(
        default=False,
        db_index=True,
        help_text="High-volume / commonly prescribed; boosts global fallback ordering.",
    )
    is_active = models.BooleanField(default=True)
    search_vector = SearchVectorField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["brand_name"]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["is_active", "brand_name"]),
            models.Index(fields=["is_active", "is_common", "brand_name"]),
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
        if not self._state.adding:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Drug code cannot be modified.")

        self.full_clean()
        super().save(*args, **kwargs)
        type(self).objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector("brand_name", weight="A")
                + SearchVector("generic_name", weight="B")
                + SearchVector("manufacturer", weight="C")
            )
        )

    def delete(self, *args, **kwargs):
        raise ValidationError("Hard delete not allowed.")

    def __str__(self):
        return f"{self.brand_name} {self.strength or ''}".strip()


class DrugComposition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    drug = models.ForeignKey(
        DrugMaster,
        on_delete=models.CASCADE,
        related_name="compositions",
    )
    ingredient = models.CharField(max_length=255)
    strength_value = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    strength_unit = models.ForeignKey(
        DoseUnitMaster,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["drug", "ingredient"],
                name="unique_ingredient_per_drug",
            )
        ]

    def clean(self):
        if not self.ingredient:
            raise ValidationError("Ingredient is required.")

    def __str__(self):
        return f"{self.ingredient} ({self.drug.brand_name})"


__all__ = ["DrugComposition", "DrugMaster"]
