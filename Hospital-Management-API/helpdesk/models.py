from django.db import models
from account.models import User
from clinic.models import Clinic
import uuid
from django.core.exceptions import ValidationError

STATUS_CHOICES = [
    ("pending", "Pending Approval"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
]
class HelpdeskClinicUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    public_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        editable=False,
        null=True,
        blank=True
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="helpdesk_profile")
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="helpdesk_users")  # One-to-Many
    secondary_mobile_number = models.CharField(max_length=15, blank=True, null=True, default=None)
    # Approval workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    rejection_reason = models.TextField(blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    kyc_completed = models.BooleanField(default=False)
    kyc_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)  # Pending approval by default

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.first_name} ({self.public_id})"
    class Meta:
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        from account.services.business_id_service import BusinessIDService
        if self.pk:
            old = HelpdeskClinicUser.objects.filter(pk=self.pk).first()
            if old and old.public_id and old.public_id != self.public_id:
                raise ValidationError("Helpdesk ID cannot be modified.")
        if not self.public_id:
            self.public_id = BusinessIDService.generate_id("EMP", 4)
        super().save(*args, **kwargs)

#is_active we are not using now
class HelpdeskActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    helpdesk_user = models.ForeignKey(HelpdeskClinicUser, on_delete=models.CASCADE, related_name="activity_logs")
    action = models.CharField(max_length=255)  # e.g., "Added Patient", "Updated Patient"
    details = models.TextField(blank=True, null=True)  # Store JSON-like details if needed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.helpdesk_user.user.first_name} - {self.action}"
