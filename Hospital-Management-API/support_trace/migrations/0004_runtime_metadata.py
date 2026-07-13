"""Add runtime_metadata JSONField for M5.8 observability integration."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("support_trace", "0003_identifier_resolution_framework"),
    ]

    operations = [
        migrations.AddField(
            model_name="supporttrace",
            name="runtime_metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
