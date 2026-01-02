import uuid
from django.db import models
from django.conf import settings


class CalendarEventCategory(models.TextChoices):
    APPOINTMENT = "APPOINTMENT"
    TASK = "TASK"
    HOLIDAY = "HOLIDAY"
    MEETING = "MEETING"
    REMINDER = "REMINDER"
    PERSONAL = "PERSONAL"

class CalendarEvent(models.Model):
    class Category(models.TextChoices):
        MEETING = "MEETING", "Meeting"
        REMINDER = "REMINDER", "Reminder"
        PERSONAL = "PERSONAL", "Personal"
        HOLIDAY = "HOLIDAY", "Holiday"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="calendar_events"
    )

    title = models.CharField(max_length=255)

    category = models.CharField(
        max_length=20,
        choices=Category.choices
    )

    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    location = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    # If true, appointments should not be allowed in this slot
    is_blocking = models.BooleanField(default=False)

    # Reminder in minutes (e.g. 10, 30, 60)
    reminder_minutes = models.PositiveIntegerField(blank=True, null=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "calendar_events"
        ordering = ["start_datetime"]
        indexes = [
            models.Index(fields=["doctor", "start_datetime"]),
            models.Index(fields=["doctor", "end_datetime"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.category})"

