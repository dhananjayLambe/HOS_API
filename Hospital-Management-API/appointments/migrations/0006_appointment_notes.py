# Generated manually for Appointment.notes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0005_appointment_constraints_and_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="notes",
            field=models.TextField(blank=True, null=True),
        ),
    ]
