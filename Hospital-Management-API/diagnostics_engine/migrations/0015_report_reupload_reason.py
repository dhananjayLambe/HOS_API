from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("diagnostics_engine", "0014_patient_centric_artifact_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="diagnostictestreport",
            name="last_reupload_reason",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="reupload_reason",
            field=models.TextField(blank=True, null=True),
        ),
    ]
