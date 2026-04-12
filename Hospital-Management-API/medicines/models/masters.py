import uuid

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector, SearchVectorField
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower


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
        indexes = [models.Index(fields=["is_active"])]

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
        indexes = [models.Index(fields=["is_active"])]

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
        constraints = [models.UniqueConstraint(Lower("name"), name="unique_route_lower")]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if not self.name:
            raise ValidationError("Route name required.")
        self.name = self.name.strip().lower()

    def save(self, *args, **kwargs):
        # UUID pk is set before first DB insert; use _state.adding, not self.pk, for create vs update.
        if not self._state.adding:
            old = type(self).objects.only("code").get(pk=self.pk)
            if old.code != self.code:
                raise ValidationError("Route code cannot be modified.")

        self.full_clean()
        super().save(*args, **kwargs)
        type(self).objects.filter(pk=self.pk).update(search_vector=SearchVector("name"))

    def delete(self, *args, **kwargs):
        raise ValidationError("Hard delete not allowed.")

    def __str__(self):
        return self.name


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
        if not self._state.adding:
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


__all__ = [
    "DoseUnitMaster",
    "FormulationMaster",
    "FrequencyMaster",
    "RouteMaster",
]
