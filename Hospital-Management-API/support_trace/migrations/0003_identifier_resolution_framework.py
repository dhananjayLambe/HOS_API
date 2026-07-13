"""Add order_id, identifier stats, and index coverage for M5.3."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("support_trace", "0002_current_snapshot_and_workflow_id_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="supporttrace",
            name="order_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AddField(
            model_name="supporttrace",
            name="first_seen_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="supporttrace",
            name="last_seen_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="supporttrace",
            name="identifier_count",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="patient_profile_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="encounter_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="routing_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="prescription_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="payment_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="invoice_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="laboratory_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
        migrations.AlterField(
            model_name="supporttrace",
            name="branch_id",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True
            ),
        ),
    ]
