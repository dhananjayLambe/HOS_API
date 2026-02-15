# Generated manually for existing data

import django.utils.timezone
from django.db import migrations, models
import django.db.models.deletion


def backfill_clinic(apps, schema_editor):
    """Set clinic to first Clinic for all existing EncounterDailyCounter rows.
    If no Clinic exists (dev), create a minimal one so we can set non-null.
    """
    EncounterDailyCounter = apps.get_model("consultations", "EncounterDailyCounter")
    Clinic = apps.get_model("clinic", "Clinic")
    first = Clinic.objects.first()
    if not first and EncounterDailyCounter.objects.filter(clinic__isnull=True).exists():
        # Dev fallback: create a minimal clinic so backfill can run
        first = Clinic.objects.create(
            name="Default Clinic (migration)",
            contact_number_primary="NA",
            contact_number_secondary="NA",
            website_url="https://example.com",
            email_address="default@example.com",
            emergency_contact_name="NA",
            emergency_contact_number="NA",
            emergency_email_address="NA",
            status="approved",
            is_approved=True,
        )
    if first:
        EncounterDailyCounter.objects.filter(clinic__isnull=True).update(clinic=first)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("clinic", "0001_initial"),  # adjust if your first clinic migration has another name
        ("consultations", "0010_remove_clinicalencounter_prescription_pnr"),
    ]

    operations = [
        migrations.AddField(
            model_name="encounterdailycounter",
            name="clinic",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="daily_counters",
                to="clinic.clinic",
            ),
        ),
        migrations.AddField(
            model_name="encounterdailycounter",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="encounterdailycounter",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(backfill_clinic, noop),
        migrations.AlterField(
            model_name="encounterdailycounter",
            name="clinic",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="daily_counters",
                to="clinic.clinic",
            ),
        ),
    ]
