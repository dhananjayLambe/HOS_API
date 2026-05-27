# Fix DB column width: artifact storage paths exceed legacy varchar(100).

from django.db import migrations, models

import diagnostics_engine.models.reports


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics_engine", "0012_diagnosticreportartifact_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE diagnostics_engine_diagnosticreportartifact "
                "ALTER COLUMN file TYPE varchar(512);"
            ),
            reverse_sql=(
                "ALTER TABLE diagnostics_engine_diagnosticreportartifact "
                "ALTER COLUMN file TYPE varchar(100);"
            ),
        ),
        migrations.AlterField(
            model_name="diagnosticreportartifact",
            name="file",
            field=models.FileField(
                max_length=512,
                upload_to=diagnostics_engine.models.reports.build_report_artifact_upload_path,
            ),
        ),
    ]
