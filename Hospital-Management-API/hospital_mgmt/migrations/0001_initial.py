# Generated by Django 5.0.7 on 2025-06-19 07:14

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Hospital',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('hospital_type', models.CharField(choices=[('clinic', 'Private Hospital'), ('Goverment', 'Public')], default='clinic', max_length=255)),
                ('registration_number', models.CharField(default='NA', max_length=255)),
                ('owner_name', models.CharField(default='NA', max_length=255)),
                ('owner_contact', models.CharField(default='NA', max_length=15)),
                ('address', models.TextField(default='NA', max_length=255)),
                ('contact_number', models.CharField(default='NA', max_length=15)),
                ('email_address', models.EmailField(default='NA', max_length=255)),
                ('website_url', models.URLField(default='NA', max_length=255)),
                ('emergency_services', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='HospitalBillingInformation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('billing_practices', models.TextField(blank=True, null=True)),
                ('discount_policies', models.TextField(blank=True, null=True)),
                ('hospital', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='billing_information', to='hospital_mgmt.hospital')),
            ],
        ),
        migrations.CreateModel(
            name='HospitalDigitalInformation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('hospital_management_software', models.CharField(blank=True, max_length=255, null=True)),
                ('preferred_appointment_channels', models.CharField(blank=True, max_length=255, null=True)),
                ('patient_data_management', models.TextField(blank=True, null=True)),
                ('hospital', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='digital_information', to='hospital_mgmt.hospital')),
            ],
        ),
        migrations.CreateModel(
            name='HospitalFacility',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('available_facilities', models.TextField(blank=True, null=True)),
                ('medical_equipment', models.TextField(blank=True, null=True)),
                ('ambulance_services', models.TextField(blank=True, null=True)),
                ('hospital', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='facility', to='hospital_mgmt.hospital')),
            ],
        ),
        migrations.CreateModel(
            name='HospitalLicensing',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('medical_license_details', models.CharField(default='NA', max_length=255)),
                ('certifications', models.TextField(blank=True, null=True)),
                ('tax_information', models.CharField(blank=True, max_length=255, null=True)),
                ('hospital', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='licensing', to='hospital_mgmt.hospital')),
            ],
        ),
        migrations.CreateModel(
            name='HospitalOperationalDetails',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('number_of_beds', models.IntegerField(blank=True, default=0, null=True)),
                ('departments_services_offered', models.TextField(blank=True, default='1234567890', null=True)),
                ('hospital_timings', models.CharField(blank=True, max_length=255, null=True)),
                ('insurance_partnerships', models.TextField(blank=True, null=True)),
                ('hospital', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='operational_details', to='hospital_mgmt.hospital')),
            ],
        ),
        migrations.CreateModel(
            name='HospitalStaffDetails',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('doctors', models.IntegerField(blank=True, null=True)),
                ('nurses_and_technicians', models.IntegerField(blank=True, null=True)),
                ('administrative_staff', models.IntegerField(blank=True, null=True)),
                ('hospital', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='staff_details', to='hospital_mgmt.hospital')),
            ],
        ),
    ]
