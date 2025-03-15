# Generated by Django 5.0.7 on 2025-03-12 10:51

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('queue_management', '0004_alter_queue_estimated_wait_time'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='queue',
            name='estimated_wait_time',
        ),
        migrations.AddField(
            model_name='queue',
            name='wait_time_estimated',
            field=models.DurationField(default=datetime.timedelta(0)),
        ),
    ]
