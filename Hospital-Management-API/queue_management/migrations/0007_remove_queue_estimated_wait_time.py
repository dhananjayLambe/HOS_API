# Generated by Django 5.0.7 on 2025-03-12 11:02

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('queue_management', '0006_rename_wait_time_estimated_queue_estimated_wait_time'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='queue',
            name='estimated_wait_time',
        ),
    ]
