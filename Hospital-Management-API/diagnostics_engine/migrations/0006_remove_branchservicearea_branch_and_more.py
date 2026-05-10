# Provider network consolidation: remove legacy models from diagnostics_engine state only.
# Database changes (FK repoint, drops) are handled in labs.0003.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics_engine", "0005_alter_diagnosticservicemaster_tags"),
        ("labs", "0003_branchservicearea_branchservicepricing_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="diagnosticorder",
                    name="branch",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="diagnostic_orders",
                        to="labs.labbranch",
                    ),
                ),
                migrations.DeleteModel(name="BranchPackagePricing"),
                migrations.DeleteModel(name="BranchServiceArea"),
                migrations.DeleteModel(name="BranchServicePricing"),
                migrations.DeleteModel(name="DiagnosticProvider"),
                migrations.DeleteModel(name="DiagnosticProviderBranch"),
            ],
            database_operations=[],
        ),
    ]
