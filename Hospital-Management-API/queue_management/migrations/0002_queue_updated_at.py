# Generated by Django 5.0.7 on 2025-03-12 10:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('queue_management', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='queue',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
