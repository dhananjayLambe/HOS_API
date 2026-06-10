from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultations_core", "0026_prescription_cancellation_audit_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="clinicaltemplate",
            name="usage_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
