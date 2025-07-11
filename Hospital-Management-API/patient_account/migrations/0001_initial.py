# Generated by Django 5.0.7 on 2025-06-19 07:14

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('clinic', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OTP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('otp', models.CharField(max_length=6)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='PatientAccount',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('alternate_mobile', models.CharField(blank=True, max_length=15, null=True)),
                ('preferred_language', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinics', models.ManyToManyField(related_name='patients', to='clinic.clinic')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='PatientAddress',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('address_type', models.CharField(choices=[('home', 'Home'), ('work', 'Work'), ('other', 'Other')], default='home', max_length=10)),
                ('street', models.CharField(blank=True, max_length=255, null=True)),
                ('city', models.CharField(blank=True, max_length=100, null=True)),
                ('state', models.CharField(blank=True, max_length=100, null=True)),
                ('country', models.CharField(blank=True, max_length=100, null=True)),
                ('pincode', models.CharField(blank=True, max_length=10, null=True)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='addresses', to='patient_account.patientaccount')),
            ],
        ),
        migrations.CreateModel(
            name='PatientProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('first_name', models.CharField(default='', max_length=255)),
                ('last_name', models.CharField(default='', max_length=255)),
                ('relation', models.CharField(choices=[('self', 'Self'), ('spouse', 'Spouse'), ('father', 'Father'), ('mother', 'Mother'), ('child', 'Child')], default='self', max_length=10)),
                ('gender', models.CharField(blank=True, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], max_length=10)),
                ('date_of_birth', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='profiles', to='patient_account.patientaccount')),
            ],
        ),
        migrations.CreateModel(
            name='MedicalHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('allergies', models.TextField(blank=True, null=True)),
                ('chronic_conditions', models.TextField(blank=True, null=True)),
                ('past_surgeries', models.TextField(blank=True, null=True)),
                ('ongoing_medications', models.TextField(blank=True, null=True)),
                ('immunizations', models.TextField(blank=True, null=True)),
                ('family_history', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient_profile', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='medical_history', to='patient_account.patientprofile')),
            ],
        ),
        migrations.CreateModel(
            name='HealthMetrics',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('height', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('weight', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('bmi', models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True)),
                ('blood_pressure', models.CharField(blank=True, max_length=20, null=True)),
                ('heart_rate', models.PositiveIntegerField(blank=True, null=True)),
                ('temperature', models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True)),
                ('respiratory_rate', models.PositiveIntegerField(blank=True, null=True)),
                ('oxygen_saturation', models.PositiveIntegerField(blank=True, null=True)),
                ('glucose_level', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('cholesterol_level', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('hbA1c', models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True)),
                ('body_fat_percentage', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('muscle_mass', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('waist_to_hip_ratio', models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True)),
                ('sleep_duration', models.DecimalField(blank=True, decimal_places=1, max_digits=3, null=True)),
                ('daily_steps', models.PositiveIntegerField(blank=True, null=True)),
                ('physical_activity_level', models.CharField(blank=True, choices=[('Sedentary', 'Sedentary'), ('Active', 'Active'), ('Athletic', 'Athletic')], max_length=50, null=True)),
                ('menstrual_cycle_regular', models.BooleanField(default=True)),
                ('pregnancy_status', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient_profile', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='health_metrics', to='patient_account.patientprofile')),
            ],
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(max_length=255)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient_profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='patient_account.patientprofile')),
            ],
        ),
        migrations.CreateModel(
            name='PatientProfileDetails',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('profile_photo', models.ImageField(blank=True, null=True, upload_to='patient_photos/')),
                ('age', models.PositiveIntegerField(blank=True, null=True)),
                ('blood_group', models.CharField(blank=True, choices=[('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'), ('O+', 'O+'), ('O-', 'O-'), ('AB+', 'AB+'), ('AB-', 'AB-')], max_length=5, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('profile', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='details', to='patient_account.patientprofile')),
            ],
        ),
    ]
