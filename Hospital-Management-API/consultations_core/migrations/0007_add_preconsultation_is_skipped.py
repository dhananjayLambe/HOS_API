# DoctorPRO – direct start consultation: mark pre-consultation as skipped when doctor skips pre

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultations_core", "0006_encounter_lifecycle_and_preconsult_completed"),
    ]

    operations = [
        migrations.AddField(
            model_name="preconsultation",
            name="is_skipped",
            field=models.BooleanField(
                default=False,
                help_text="True when doctor started consultation without completing pre-consultation",
            ),
        ),
    ]
