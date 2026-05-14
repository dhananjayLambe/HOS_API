# Generated manually for diagnostics routing Phase 1

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics_engine", "0009_eligiblelabsnapshot_routingdecisionsnapshot_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="diagnosticorder",
            name="routing_status",
            field=models.CharField(
                choices=[
                    ("awaiting_assignment", "Awaiting assignment"),
                    ("routing_in_progress", "Routing in progress"),
                    ("assigned", "Assigned"),
                    ("routing_failed", "Routing failed"),
                    ("no_match_found", "No match found"),
                ],
                db_index=True,
                default="awaiting_assignment",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="routingrun",
            name="routing_engine_version",
            field=models.CharField(
                db_index=True,
                default="v1",
                help_text="Algorithm version for historical analytics (e.g. v1, ai_v1).",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="routingdecisionsnapshot",
            name="recommendation_labels",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Multi-label recommendations (e.g. cheapest + recommended).",
            ),
        ),
        migrations.AddIndex(
            model_name="diagnosticorder",
            index=models.Index(fields=["routing_status"], name="diagnostics_routing_order_status_idx"),
        ),
        migrations.AddIndex(
            model_name="routingrun",
            index=models.Index(
                fields=["routing_engine_version"],
                name="diagnostics_routing_engine_ver_idx",
            ),
        ),
        migrations.AlterField(
            model_name="routingevent",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("routing_started", "Routing Started"),
                    ("routing_completed", "Routing Completed"),
                    ("routing_failed", "Routing Failed"),
                    ("no_eligible_labs", "No Eligible Labs"),
                    ("lab_suggested", "Lab Suggested"),
                    ("assignment_created", "Assignment Created"),
                    ("lab_viewed", "Lab Viewed"),
                    ("lab_accepted", "Lab Accepted"),
                    ("lab_rejected", "Lab Rejected"),
                    ("auto_expired", "Auto Expired"),
                    ("reassigned", "Reassigned"),
                    ("completed", "Completed"),
                ],
                db_index=True,
                max_length=50,
            ),
        ),
    ]
