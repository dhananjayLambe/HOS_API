# Generated by Django 5.0.7 on 2025-02-27 01:46

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('doctor', '0014_doctoraddress'),
    ]

    operations = [
        migrations.DeleteModel(
            name='DoctorLanguage',
        ),
    ]
