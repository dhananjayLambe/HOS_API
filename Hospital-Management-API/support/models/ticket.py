"""
Support Ticket Models
Main models for support ticket functionality.
"""
import uuid
from django.db import models

from account.models import User
from clinic.models import Clinic

from support.utils.uploads import support_ticket_upload_path
from support.services.ticket_number_service import generate_support_ticket_number


class SupportTicket(models.Model):
    """Main support ticket model."""
    
    class SupportUserRole(models.TextChoices):
        DOCTOR = "doctor", "Doctor"
        PATIENT = "patient", "Patient"
        ADMIN = "admin", "Admin"
        CLINIC_ADMIN = "clinic_admin", "Clinic Admin"
        LAB_ADMIN = "lab_admin", "Lab Admin"
        HELPDESK_ADMIN = "helpdesk_admin", "Helpdesk Admin"
        SUPERADMIN = "superadmin", "Super Admin"

    class Category(models.TextChoices):
        TECHNICAL = "technical", "Technical Issue"
        BILLING = "billing", "Billing & Payments"
        APPOINTMENT = "appointment", "Appointment / Scheduling"
        PRESCRIPTION = "prescription", "Prescription / EMR"
        ACCOUNT = "account", "Account / Profile"
        OTHER = "other", "Other"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        WAITING_FOR_USER = "waiting_for_user", "Waiting for User"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    user_role = models.CharField(
        max_length=20, choices=SupportUserRole.choices,
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="support_tickets"
    )

    doctor = models.ForeignKey(
        "doctor.doctor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets"
    )

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    subject = models.CharField(max_length=255)
    description = models.TextField()

    category = models.CharField(max_length=30, choices=Category.choices)
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.OPEN
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_tickets"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=["ticket_number"]),
            models.Index(fields=["created_at"]),
        ]
        verbose_name = "Support Ticket"
        verbose_name_plural = "Support Tickets"

    def __str__(self):
        return f"{self.ticket_number} - {self.subject}"
    
    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = generate_support_ticket_number()
        super().save(*args, **kwargs)


class SupportTicketAttachment(models.Model):
    """Model for support ticket file attachments."""
    
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="attachments"
    )
    file = models.FileField(upload_to=support_ticket_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Support Ticket Attachment"
        verbose_name_plural = "Support Ticket Attachments"
    
    def __str__(self):
        return f"{self.ticket.ticket_number} - {self.file.name}"


class SupportTicketComment(models.Model):
    """Model for support ticket comments."""
    
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="comments"
    )
    message = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Support Ticket Comment"
        verbose_name_plural = "Support Ticket Comments"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment on {self.ticket.ticket_number} by {self.created_by.username}"

