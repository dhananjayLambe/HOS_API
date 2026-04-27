from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("queue_management", "0002_queue_encounter_vitals_done"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="queue",
            index=models.Index(fields=["encounter", "created_at"], name="queue_manag_encount_d6c510_idx"),
        ),
    ]
