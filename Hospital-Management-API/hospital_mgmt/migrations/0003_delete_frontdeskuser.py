# Generated by Django 5.0.7 on 2025-02-22 10:33

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('hospital_mgmt', '0002_remove_frontdeskuser_hospital_frontdeskuser_clinic_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='FrontDeskUser',
        ),
    ]
