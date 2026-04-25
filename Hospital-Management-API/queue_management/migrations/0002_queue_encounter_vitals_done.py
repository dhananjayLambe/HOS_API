# Generated manually for helpdesk queue ↔ encounter link and vitals_done status

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('queue_management', '0001_initial'),
        ('consultations_core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='queue',
            name='encounter',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='queue_entries',
                to='consultations_core.clinicalencounter',
            ),
        ),
        migrations.AlterField(
            model_name='queue',
            name='status',
            field=models.CharField(
                choices=[
                    ('waiting', 'Waiting'),
                    ('vitals_done', 'Vitals Done'),
                    ('in_consultation', 'In Consultation'),
                    ('completed', 'Completed'),
                    ('skipped', 'Skipped'),
                    ('cancelled', 'Cancelled'),
                ],
                default='waiting',
                max_length=20,
            ),
        ),
    ]
