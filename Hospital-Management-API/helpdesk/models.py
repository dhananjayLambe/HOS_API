from django.db import models
from account.models import User
from clinic.models import Clinic
import uuid

class HelpdeskClinicUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="helpdesk_profile")
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="helpdesk_users")  # One-to-Many
    is_active = models.BooleanField(default=False)  # Pending approval by default
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.first_name} - {self.clinic.name}"

class HelpdeskActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    helpdesk_user = models.ForeignKey(HelpdeskClinicUser, on_delete=models.CASCADE, related_name="activity_logs")
    action = models.CharField(max_length=255)  # e.g., "Added Patient", "Updated Patient"
    details = models.TextField(blank=True, null=True)  # Store JSON-like details if needed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.helpdesk_user.user.first_name} - {self.action}"
