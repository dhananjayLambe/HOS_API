# Phase 1 lab workflow DB hardening — constraints and indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("labs", "0006_collection_status_in_progress"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="labcollectionrequest",
            index=models.Index(
                fields=["assigned_at"],
                name="lab_collect_assigne_3b1543_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="labordertestexecution",
            index=models.Index(
                fields=["lab_branch", "execution_status"],
                name="lab_order_t_lab_bra_100d9c_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="labordertestexecution",
            index=models.Index(
                fields=["assignment", "execution_status"],
                name="lab_order_t_assignm_149237_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="labordertestexecution",
            index=models.Index(
                fields=["test_line", "execution_status"],
                name="lab_order_t_test_li_936dd7_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="labordertestexecution",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    execution_status__in=[
                        "pending",
                        "accepted",
                        "scheduled",
                        "sample_collected",
                        "in_processing",
                        "report_ready",
                    ],
                ),
                fields=("assignment", "test_line"),
                name="uniq_active_execution_per_test",
            ),
        ),
        migrations.AddConstraint(
            model_name="labordertestexecution",
            constraint=models.CheckConstraint(
                check=(
                    models.Q(
                        collection_request__isnull=False,
                        visit_appointment__isnull=True,
                    )
                    | models.Q(
                        collection_request__isnull=True,
                        visit_appointment__isnull=False,
                    )
                    | models.Q(
                        collection_request__isnull=True,
                        visit_appointment__isnull=True,
                    )
                ),
                name="execution_only_one_workflow_link",
            ),
        ),
    ]
