# Generated manually for custom findings (finding FK optional when custom_finding is set).

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("consultations_core", "0010_consultationfinding_display_name_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="consultationfinding",
            name="finding",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="consultation_findings",
                to="consultations_core.findingmaster",
            ),
        ),
    ]
