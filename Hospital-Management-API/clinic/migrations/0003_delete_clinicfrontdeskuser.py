# Generated by Django 5.0.7 on 2025-02-22 10:33

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clinic', '0002_alter_clinic_registration_number_clinicfrontdeskuser'),
    ]

    operations = [
        migrations.DeleteModel(
            name='ClinicFrontDeskUser',
        ),
    ]
