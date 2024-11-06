# Generated by Django 5.0.7 on 2024-10-26 12:37

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('doctor', '0002_remove_doctor_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='DoctorAdditionalDetails',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('medical_registration_number', models.CharField(blank=True, max_length=100, null=True, unique=True)),
                ('registration_authority', models.CharField(blank=True, max_length=100, null=True)),
                ('qualifications', models.TextField(blank=True, null=True)),
                ('specialization', models.CharField(blank=True, max_length=100, null=True)),
                ('clinic_name', models.CharField(blank=True, max_length=255, null=True)),
                ('clinic_address', models.TextField(blank=True, null=True)),
                ('consultation_timings', models.CharField(blank=True, max_length=255, null=True)),
                ('telemedicine_capability', models.BooleanField(default=False)),
                ('professional_indemnity_insurance', models.BooleanField(default=False)),
                ('doctor', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='additional_details', to='doctor.doctor')),
            ],
        ),
    ]
