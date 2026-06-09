# Generated manually for Phase 1 WhatsApp prescription delivery

import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("appointments", "0001_initial"),
        ("clinic", "0001_initial"),
        ("consultations_core", "0026_prescription_cancellation_audit_fields"),
        ("diagnostics_engine", "0015_report_reupload_reason"),
        ("doctor", "0001_initial"),
        ("patient_account", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WhatsAppMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("internal_notes", models.TextField(blank=True, null=True)),
                (
                    "provider",
                    models.CharField(
                        choices=[("META", "Meta")],
                        default="META",
                        help_text="WhatsApp provider used to send the message.",
                        max_length=20,
                    ),
                ),
                (
                    "conversation_category",
                    models.CharField(
                        choices=[
                            ("UTILITY", "Utility"),
                            ("MARKETING", "Marketing"),
                            ("AUTHENTICATION", "Authentication"),
                            ("SERVICE", "Service"),
                        ],
                        default="UTILITY",
                        help_text="WhatsApp conversation category used for billing analytics.",
                        max_length=50,
                    ),
                ),
                (
                    "message_type",
                    models.CharField(
                        choices=[
                            ("PRESCRIPTION", "Prescription"),
                            ("REPORT", "Report"),
                            ("TEST_BOOKING", "Test Booking"),
                            ("FOLLOWUP", "Follow Up"),
                            ("APPOINTMENT", "Appointment"),
                            ("OTP", "OTP"),
                        ],
                        help_text="Business category of the outbound WhatsApp message.",
                        max_length=50,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("QUEUED", "Queued"),
                            ("SENT", "Sent"),
                            ("DELIVERED", "Delivered"),
                            ("READ", "Read"),
                            ("FAILED", "Failed"),
                            ("SKIPPED", "Skipped"),
                        ],
                        default="QUEUED",
                        help_text="Delivery lifecycle status from the WhatsApp provider.",
                        max_length=20,
                    ),
                ),
                (
                    "recipient_mobile_number",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="E.164-style mobile number of the WhatsApp recipient.",
                        max_length=20,
                        validators=[
                            django.core.validators.RegexValidator(
                                message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed.",
                                regex="^\\+?1?\\d{9,15}$",
                            )
                        ],
                    ),
                ),
                (
                    "recipient_name",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Display name of the recipient at send time.",
                        max_length=255,
                    ),
                ),
                (
                    "meta_message_id",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Meta/WhatsApp provider message ID for webhook correlation.",
                        max_length=255,
                    ),
                ),
                (
                    "idempotency_key",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        help_text="Unique key used to prevent duplicate WhatsApp messages for the same business event.",
                        max_length=255,
                        null=True,
                    ),
                ),
                (
                    "template_name",
                    models.CharField(
                        blank=True,
                        help_text="Approved WhatsApp template name used for delivery.",
                        max_length=255,
                        null=True,
                    ),
                ),
                ("error_code", models.CharField(blank=True, max_length=100, null=True)),
                ("failure_reason", models.TextField(blank=True, null=True)),
                ("queued_at", models.DateTimeField(blank=True, null=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("retry_count", models.PositiveIntegerField(default=0)),
                ("last_retry_at", models.DateTimeField(blank=True, null=True)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("webhook_payload", models.JSONField(blank=True, default=dict)),
                (
                    "appointment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="appointments.appointment",
                    ),
                ),
                (
                    "clinic",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="clinic.clinic",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "diagnostic_order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="diagnostics_engine.diagnosticorder",
                    ),
                ),
                (
                    "diagnostic_test_report",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="diagnostics_engine.diagnostictestreport",
                    ),
                ),
                (
                    "doctor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="doctor.doctor",
                    ),
                ),
                (
                    "encounter",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="consultations_core.clinicalencounter",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="patient_account.patientprofile",
                    ),
                ),
                (
                    "prescription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="whatsapp_messages",
                        to="consultations_core.prescription",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "WhatsApp Message",
                "verbose_name_plural": "WhatsApp Messages",
                "db_table": "whatsapp_messages",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["status", "message_type"], name="whatsapp_me_status_8e2f0a_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["patient", "created_at"], name="whatsapp_me_patient_2c8b91_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["clinic", "created_at"], name="whatsapp_me_clinic_91ad44_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["meta_message_id"], name="whatsapp_me_meta_me_0f3de2_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["recipient_mobile_number"], name="whatsapp_me_recipie_7b1c22_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["provider", "status"], name="whatsapp_me_provide_4a8c10_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["conversation_category"], name="whatsapp_me_convers_6d2e88_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["idempotency_key"], name="whatsapp_me_idempot_3f1a90_idx"),
        ),
        migrations.AddConstraint(
            model_name="whatsappmessage",
            constraint=models.UniqueConstraint(
                condition=models.Q(("meta_message_id", ""), _negated=True),
                fields=("meta_message_id",),
                name="uniq_whatsapp_meta_message_id_nonempty",
            ),
        ),
        migrations.AddConstraint(
            model_name="whatsappmessage",
            constraint=models.UniqueConstraint(
                condition=models.Q(("idempotency_key__isnull", False)),
                fields=("idempotency_key",),
                name="uniq_whatsapp_idempotency_key",
            ),
        ),
    ]
