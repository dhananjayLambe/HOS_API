# Generated manually for DoctorPRO Pre-Consultation → Consultation lifecycle

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultations_core", "0005_add_clinical_audit_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="clinicalencounter",
            name="check_in_time",
            field=models.DateTimeField(blank=True, help_text="When patient checked in / encounter became active", null=True),
        ),
        migrations.AddField(
            model_name="clinicalencounter",
            name="consultation_start_time",
            field=models.DateTimeField(blank=True, help_text="When doctor started consultation", null=True),
        ),
        migrations.AddField(
            model_name="clinicalencounter",
            name="consultation_end_time",
            field=models.DateTimeField(blank=True, help_text="When consultation was finalized", null=True),
        ),
        migrations.AddField(
            model_name="clinicalencounter",
            name="closed_at",
            field=models.DateTimeField(blank=True, help_text="When encounter was closed", null=True),
        ),
        migrations.AddField(
            model_name="preconsultation",
            name="is_completed",
            field=models.BooleanField(default=False, help_text="True when pre-consultation is marked complete"),
        ),
        migrations.AlterField(
            model_name="clinicalencounter",
            name="status",
            field=models.CharField(
                choices=[
                    ("created", "Created"),
                    ("pre_consultation_in_progress", "Pre-Consultation In Progress"),
                    ("pre_consultation_completed", "Pre-Consultation Completed"),
                    ("consultation_in_progress", "Consultation In Progress"),
                    ("consultation_completed", "Consultation Completed"),
                    ("closed", "Closed"),
                    ("cancelled", "Cancelled"),
                    ("no_show", "No Show"),
                    ("pre_consultation", "Pre Consultation"),
                    ("in_consultation", "In Consultation"),
                    ("completed", "Completed"),
                ],
                default="created",
                max_length=40,
            ),
        ),
        migrations.AlterField(
            model_name="encounterstatuslog",
            name="from_status",
            field=models.CharField(max_length=40),
        ),
        migrations.AlterField(
            model_name="encounterstatuslog",
            name="to_status",
            field=models.CharField(max_length=40),
        ),
    ]
