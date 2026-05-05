# Generated manually for helpdesk list query patterns

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0006_appointment_notes"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(
                fields=["clinic", "status", "appointment_date", "slot_start_time"],
                name="appt_clinic_stat_date_slot_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(
                fields=["clinic", "doctor", "appointment_date", "slot_start_time"],
                name="appt_clinic_doc_date_slot_idx",
            ),
        ),
    ]
