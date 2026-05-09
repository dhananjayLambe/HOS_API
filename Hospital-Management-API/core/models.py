# core/models.py

import uuid
from django.db import models
from django.utils import timezone
from account.models import User


class BaseModel(models.Model):
    """
    Enterprise-grade reusable abstract base model.

    Features:
    - UUID primary key
    - audit tracking
    - soft delete
    - active/inactive states
    - created_by / updated_by
    - healthcare workflow compatible
    """
    # =====================================================
    # PRIMARY KEY
    # =====================================================

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # =====================================================
    # AUDIT FIELDS
    # =====================================================

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created_records"
    )

    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated_records"
    )

    # =====================================================
    # STATUS FIELDS
    # =====================================================

    is_active = models.BooleanField(
        default=True,
        db_index=True
    )

    is_deleted = models.BooleanField(
        default=False,
        db_index=True
    )

    deleted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    deleted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_deleted_records"
    )

    internal_notes = models.TextField(
        null=True,
        blank=True
    )

    class Meta:
        abstract = True

    # =====================================================
    # SOFT DELETE
    # =====================================================

    def soft_delete(self, user=None):

        self.is_deleted = True
        self.is_active = False
        self.deleted_at = timezone.now()

        if user:
            self.deleted_by = user

        self.save(
            update_fields=[
                "is_deleted",
                "is_active",
                "deleted_at",
                "deleted_by",
                "updated_at"
            ]
        )

    # =====================================================
    # RESTORE
    # =====================================================

    def restore(self):

        self.is_deleted = False
        self.is_active = True
        self.deleted_at = None
        self.deleted_by = None

        self.save(
            update_fields=[
                "is_deleted",
                "is_active",
                "deleted_at",
                "deleted_by",
                "updated_at"
            ]
        )

    def __str__(self):
        return str(self.id)