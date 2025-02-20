# Generated by Django 5.0.7 on 2025-02-20 07:06

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patient_account', '0003_delete_doctorconnection'),
    ]

    operations = [
        migrations.AddField(
            model_name='medicalhistory',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=datetime.datetime(2025, 2, 20, 7, 6, 11, 731950, tzinfo=datetime.timezone.utc)),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='medicalhistory',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
