# Generated by Django 5.0.7 on 2025-01-14 11:25

import datetime
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Clinic',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(default='NA', max_length=255)),
                ('contact_number_primary', models.CharField(default='NA', max_length=15)),
                ('contact_number_secondary', models.CharField(default='NA', max_length=15)),
                ('email_address', models.EmailField(default='NA', max_length=255)),
                ('registration_number', models.CharField(default='NA', max_length=255)),
                ('gst_number', models.CharField(default='NA', max_length=15)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='ClinicAddress',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('address', models.TextField(default='NA', max_length=255)),
                ('address2', models.TextField(default='NA', max_length=255)),
                ('city', models.CharField(default='NA', max_length=100)),
                ('state', models.CharField(default='NA', max_length=100)),
                ('pincode', models.CharField(default='NA', max_length=10)),
                ('country', models.CharField(default='India', max_length=100)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, default='NA', max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, default='NA', max_digits=9, null=True)),
                ('google_place_id', models.CharField(blank=True, default='NA', max_length=255, null=True)),
                ('google_maps_url', models.URLField(blank=True, default='NA', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinic', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='address', to='clinic.clinic')),
            ],
        ),
        migrations.CreateModel(
            name='ClinicSchedule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('morning_start', models.TimeField(blank=True, default=datetime.time(9, 0), null=True)),
                ('morning_end', models.TimeField(blank=True, default=datetime.time(12, 0), null=True)),
                ('afternoon_start', models.TimeField(blank=True, default=datetime.time(13, 0), null=True)),
                ('afternoon_end', models.TimeField(blank=True, default=datetime.time(17, 0), null=True)),
                ('evening_start', models.TimeField(blank=True, default=datetime.time(18, 0), null=True)),
                ('evening_end', models.TimeField(blank=True, default=datetime.time(21, 0), null=True)),
                ('day_of_week', models.CharField(choices=[('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'), ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday'), ('Sunday', 'Sunday')], default='Monday', max_length=10)),
                ('slot_duration', models.PositiveIntegerField(default=15)),
                ('holidays', models.JSONField(blank=True, null=True)),
                ('special_dates', models.JSONField(blank=True, null=True)),
                ('is_doctor_present', models.BooleanField(default=False)),
                ('doctor_checkin_time', models.DateTimeField(blank=True, null=True)),
                ('doctor_checkout_time', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinic', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='schedule', to='clinic.clinic')),
            ],
        ),
        migrations.CreateModel(
            name='ClinicService',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('checkup_available', models.BooleanField(default=False)),
                ('consultation_available', models.BooleanField(default=False)),
                ('daycare_available', models.BooleanField(default=False)),
                ('followup_available', models.BooleanField(default=False)),
                ('consultation_fees', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('followup_fees', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('daycare_fees', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('case_paper_validity', models.PositiveIntegerField(blank=True, help_text='Validity in months', null=True)),
                ('case_paper_fees', models.DecimalField(blank=True, decimal_places=2, help_text='Fees for issuing new case paper', max_digits=8, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinic', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='services', to='clinic.clinic')),
            ],
        ),
        migrations.CreateModel(
            name='ClinicServiceList',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('service_name', models.CharField(max_length=255)),
                ('service_description', models.TextField(blank=True, null=True)),
                ('service_fee', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('duration', models.PositiveIntegerField(blank=True, help_text='Duration of service in minutes', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='service_list', to='clinic.clinic')),
            ],
        ),
        migrations.CreateModel(
            name='ClinicSpecialization',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('specialization_name', models.CharField(default='NA', max_length=255)),
                ('description', models.TextField(blank=True, default='NA', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='specializations', to='clinic.clinic')),
            ],
        ),
    ]
