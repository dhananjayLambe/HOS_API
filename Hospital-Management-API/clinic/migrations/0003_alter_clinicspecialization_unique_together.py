# Generated by Django 5.0.7 on 2025-07-01 06:00

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clinic', '0002_alter_clinicaddress_google_maps_url_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='clinicspecialization',
            unique_together={('clinic', 'specialization_name')},
        ),
    ]
