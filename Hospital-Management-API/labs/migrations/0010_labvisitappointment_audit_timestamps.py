from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("labs", "0009_labcollectionrequest_assignment_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="labvisitappointment",
            name="confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="labvisitappointment",
            name="no_show_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="labvisitappointment",
            name="status_changed_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
