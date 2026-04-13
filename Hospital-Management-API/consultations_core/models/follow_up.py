import uuid
from django.db import models
from django.utils import timezone
from accounts.models import User

class FollowUp(models.Model):
    """
    Stores follow-up instructions for a consultation
    """

    class FollowUpType(models.TextChoices):
        EXACT_DATE = "exact_date", "Exact Date"
        AFTER_DAYS = "after_days", "After X Days"
        AFTER_WEEKS = "after_weeks", "After X Weeks"
        CONDITIONAL = "conditional", "Conditional"
        AFTER_TEST = "after_test", "After Test"
        ASAP = "asap", "As Soon As Possible"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="follow_ups"
    )

    # Type of follow-up
    follow_up_type = models.CharField(
        max_length=20,
        choices=FollowUpType.choices
    )

    # For exact date OR calculated date
    follow_up_date = models.DateField(null=True, blank=True)

    # For relative follow-up (e.g., 5 days)
    after_value = models.PositiveIntegerField(null=True, blank=True)

    # Optional condition text
    condition_note = models.TextField(null=True, blank=True)

    # Auto reminder flag
    reminder_enabled = models.BooleanField(default=True)

    # Status tracking
    is_completed = models.BooleanField(default=False)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="added_follow_ups"
    )

    def calculate_follow_up_date(self):
        """
        Automatically calculate date if type is AFTER_X
        """
        if self.follow_up_type == self.FollowUpType.AFTER_DAYS and self.after_value:
            return timezone.now().date() + timezone.timedelta(days=self.after_value)

        if self.follow_up_type == self.FollowUpType.AFTER_WEEKS and self.after_value:
            return timezone.now().date() + timezone.timedelta(weeks=self.after_value)

        return self.follow_up_date

    def save(self, *args, **kwargs):
        if not self.follow_up_date:
            self.follow_up_date = self.calculate_follow_up_date()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"FollowUp ({self.follow_up_type}) - {self.follow_up_date}"