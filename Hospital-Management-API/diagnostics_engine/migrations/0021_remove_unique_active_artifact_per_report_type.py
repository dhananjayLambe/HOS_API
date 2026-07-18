# Generated manually for multi-artifact same-type append support.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics_engine", "0020_workspace_m11_report_number_upper_idx"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="diagnosticreportartifact",
            name="unique_active_artifact_per_report_type",
        ),
    ]
