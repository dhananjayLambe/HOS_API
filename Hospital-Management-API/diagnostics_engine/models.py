from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid

class CommissionType(models.TextChoices):
    FLAT = "flat", "Flat Amount"
    PERCENT = "percent", "Percentage"


class OrderStatus(models.TextChoices):
    CREATED = "created", "Created"
    CONFIRMED = "confirmed", "Confirmed"
    SAMPLE_COLLECTED = "sample_collected", "Sample Collected"
    IN_PROCESSING = "in_processing", "In Processing"
    REPORT_READY = "report_ready", "Report Ready"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class ReportStorageMode(models.TextChoices):
    STRUCTURED = "structured", "Structured Only"
    FILE = "file", "File Only"
    HYBRID = "hybrid", "Structured + File"


class ReportLifecycleStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    READY = "ready", "Ready"
    DELIVERED = "delivered", "Delivered"
    REJECTED = "rejected", "Rejected"

class DiagnosticCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=50, unique=True)

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategories"
    )

    is_active = models.BooleanField(default=True)
    ordering = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["ordering", "name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name

class DiagnosticServiceMaster(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)

    category = models.ForeignKey(
        DiagnosticCategory,
        on_delete=models.PROTECT,
        related_name="services"
    )

    sample_type = models.CharField(max_length=100, blank=True, null=True)
    home_collection_possible = models.BooleanField(default=False)
    appointment_required = models.BooleanField(default=False)

    tat_hours_default = models.PositiveIntegerField(default=24)

    preparation_notes = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name

class DiagnosticProvider(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)

    accreditation = models.CharField(max_length=150, blank=True, null=True)
    license_number = models.CharField(max_length=100, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name

class DiagnosticProviderBranch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    provider = models.ForeignKey(
        DiagnosticProvider,
        on_delete=models.CASCADE,
        related_name="branches"
    )

    branch_code = models.CharField(max_length=50)
    branch_name = models.CharField(max_length=255)

    contact_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default="India")

    latitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    home_collection_supported = models.BooleanField(default=False)
    sample_pickup_start_time = models.TimeField(null=True, blank=True)
    sample_pickup_end_time = models.TimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "branch_code"],
                name="unique_branch_per_provider"
            )
        ]
        indexes = [
            models.Index(fields=["provider"]),
            models.Index(fields=["pincode"]),
            models.Index(fields=["city"]),
        ]

    def __str__(self):
        return f"{self.provider.name} - {self.branch_name}"

class BranchServiceArea(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    branch = models.ForeignKey(
        DiagnosticProviderBranch,
        on_delete=models.CASCADE,
        related_name="service_areas"
    )

    pincode = models.CharField(max_length=10)

    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "pincode"],
                name="unique_branch_pincode"
            )
        ]
        indexes = [
            models.Index(fields=["branch"]),
            models.Index(fields=["pincode"]),
        ]

class BranchServicePricing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    branch = models.ForeignKey(
        DiagnosticProviderBranch,
        on_delete=models.CASCADE,
        related_name="service_pricing"
    )

    service = models.ForeignKey(
        DiagnosticServiceMaster,
        on_delete=models.CASCADE,
        related_name="branch_pricing"
    )

    selling_price = models.DecimalField(max_digits=10, decimal_places=2)

    platform_margin_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT
    )
    platform_margin_value = models.DecimalField(max_digits=10, decimal_places=2)

    doctor_commission_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT
    )
    doctor_commission_value = models.DecimalField(max_digits=10, decimal_places=2)

    valid_from = models.DateField(default=timezone.now)
    valid_to = models.DateField(blank=True, null=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "service"],
                condition=models.Q(is_active=True),
                name="unique_active_branch_service"
            )
        ]
        indexes = [
            models.Index(fields=["branch"]),
            models.Index(fields=["service"]),
        ]

    def clean(self):
        if self.selling_price <= 0:
            raise ValidationError("Selling price must be positive.")

        if self.valid_to and self.valid_to < self.valid_from:
            raise ValidationError("valid_to cannot be before valid_from.")

    def __str__(self):
        return f"{self.branch} - {self.service}"

class DiagnosticOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order_number = models.CharField(max_length=20, unique=True)

    encounter = models.ForeignKey(
        "consultations.ClinicalEncounter",
        on_delete=models.PROTECT,
        related_name="diagnostic_orders"
    )

    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile",
        on_delete=models.PROTECT,
        related_name="diagnostic_orders"
    )

    doctor = models.ForeignKey(
        "doctor.doctor",
        on_delete=models.PROTECT,
        related_name="diagnostic_orders"
    )

    branch = models.ForeignKey(
        DiagnosticProviderBranch,
        on_delete=models.PROTECT,
        related_name="orders"
    )

    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.CREATED
    )

    total_amount_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["encounter"]),
        ]

    def update_status(self, new_status, user=None, source="system", reason=None):
        allowed_transitions = {
            OrderStatus.CREATED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.SAMPLE_COLLECTED, OrderStatus.CANCELLED],
            OrderStatus.SAMPLE_COLLECTED: [OrderStatus.IN_PROCESSING],
            OrderStatus.IN_PROCESSING: [OrderStatus.REPORT_READY],
            OrderStatus.REPORT_READY: [OrderStatus.COMPLETED],
        }

        if new_status not in allowed_transitions.get(self.status, []):
            raise ValidationError("Invalid order status transition.")

        old_status = self.status
        self.status = new_status
        self.save(update_fields=["status"])

        from consultations_core.domain.audit import AuditService
        AuditService.log_status_change(
            instance=self,
            field_name="status",
            old_value=old_status,
            new_value=new_status,
            user=user,
            source=source,
            reason=reason,
        )

    def __str__(self):
        return self.order_number

class DiagnosticOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.ForeignKey(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="items"
    )

    service = models.ForeignKey(
        DiagnosticServiceMaster,
        on_delete=models.PROTECT
    )

    name_snapshot = models.CharField(max_length=255)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.pk:
            if self.order.status != OrderStatus.CREATED:
                raise ValidationError("Cannot modify items after order confirmation.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name_snapshot} - {self.order.order_number}"

class DiagnosticReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.OneToOneField(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="report"
    )

    storage_mode = models.CharField(
        max_length=20,
        choices=ReportStorageMode.choices,
        default=ReportStorageMode.STRUCTURED
    )

    structured_result = models.JSONField(blank=True, null=True)
    file = models.FileField(upload_to="diagnostic_reports/", null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=ReportLifecycleStatus.choices,
        default=ReportLifecycleStatus.PENDING
    )

    is_editable = models.BooleanField(default=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
        ]

    def save(self, *args, **kwargs):
        with transaction.atomic():
            old_status = None
            if self.pk:
                old = type(self).objects.only("is_editable", "status").get(pk=self.pk)
                if not old.is_editable:
                    raise ValidationError("Report locked.")
                old_status = old.status

            if self.status == ReportLifecycleStatus.READY:
                self.order.update_status(OrderStatus.REPORT_READY)

            if self.status == ReportLifecycleStatus.DELIVERED:
                self.order.update_status(OrderStatus.COMPLETED)
                self.delivered_at = timezone.now()
                self.is_editable = False

            if old_status is not None and old_status != self.status:
                from consultations_core.domain.audit import AuditService
                AuditService.log_status_change(
                    instance=self,
                    field_name="status",
                    old_value=old_status,
                    new_value=self.status,
                    user=None,
                    source="system",
                    reason=None,
                )

            super().save(*args, **kwargs)

    def allow_admin_edit(self):
        self.is_editable = True
        self.save(update_fields=["is_editable"])

    def __str__(self):
        return f"Report - {self.order.order_number}"