# Generated for consultation workflow type (Full / Quick Rx / Test Only)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultations", "0006_preconsultationmedicalhistory"),
    ]

    operations = [
        migrations.AddField(
            model_name="consultation",
            name="consultation_type",
            field=models.CharField(
                choices=[
                    ("FULL", "Full Consultation"),
                    ("QUICK_RX", "Quick Prescription"),
                    ("TEST_ONLY", "Test Only Visit"),
                ],
                default="FULL",
                help_text="Workflow type governing visible sections and validation",
                max_length=20,
            ),
        ),
    ]
