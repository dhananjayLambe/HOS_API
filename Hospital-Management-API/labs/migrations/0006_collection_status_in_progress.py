"""CollectionStatus: COLLECTION_STARTED -> IN_PROGRESS, drop RESCHEDULED; new logistics fields."""

from django.db import migrations, models


def remap_collection_statuses(apps, schema_editor):
    LabCollectionRequest = apps.get_model("labs", "LabCollectionRequest")
    LabCollectionRequest.objects.filter(collection_status="COLLECTION_STARTED").update(
        collection_status="IN_PROGRESS",
    )
    LabCollectionRequest.objects.filter(collection_status="RESCHEDULED").update(
        collection_status="PENDING",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("labs", "0005_labordertestexecution"),
    ]

    operations = [
        migrations.AddField(
            model_name="labcollectionrequest",
            name="assigned_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="labcollectionrequest",
            name="collection_type",
            field=models.CharField(db_index=True, default="HOME", max_length=20),
        ),
        migrations.AddField(
            model_name="labcollectionrequest",
            name="failed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="labcollectionrequest",
            name="in_progress_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="labcollectionrequest",
            name="retry_count",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.RunPython(remap_collection_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="labcollectionrequest",
            name="collection_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("ASSIGNED", "Assigned"),
                    ("IN_PROGRESS", "In Progress"),
                    ("COLLECTED", "Collected"),
                    ("FAILED", "Failed"),
                    ("CANCELLED", "Cancelled"),
                ],
                db_index=True,
                default="PENDING",
                max_length=30,
            ),
        ),
    ]
