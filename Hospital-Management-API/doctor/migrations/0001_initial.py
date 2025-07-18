# Generated by Django 5.0.7 on 2025-06-19 07:14

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
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
            name='CustomSpecialization',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Enter a custom specialization', max_length=255, unique=True)),
                ('description', models.TextField(blank=True, help_text='Provide a description if needed', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['name'],
                'unique_together': {('name',)},
            },
        ),
        migrations.CreateModel(
            name='doctor',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('secondary_mobile_number', models.CharField(default='NA', max_length=15, unique=True)),
                ('dob', models.DateField(blank=True, null=True, verbose_name='Date of Birth')),
                ('about', models.TextField(blank=True, help_text='Short description displayed to patients', null=True)),
                ('photo', models.ImageField(blank=True, null=True, upload_to='doctor_photos/')),
                ('years_of_experience', models.PositiveIntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinics', models.ManyToManyField(related_name='doctors', to='clinic.clinic')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Certification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(default='NA', help_text='Certification title (e.g., Fellowship in Cardiology)', max_length=255)),
                ('issued_by', models.CharField(default='NA', help_text='Organization issuing the certification', max_length=255)),
                ('date_of_issue', models.DateField(default=django.utils.timezone.now)),
                ('expiry_date', models.DateField(blank=True, default=django.utils.timezone.now, help_text='Leave blank if no expiry', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certifications', to='doctor.doctor')),
            ],
        ),
        migrations.CreateModel(
            name='Award',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(default='NA', help_text='Name of the award', max_length=255)),
                ('description', models.TextField(blank=True, default='NA', help_text='Details about the award', null=True)),
                ('awarded_by', models.CharField(default='NA', help_text='Organization granting the award', max_length=255)),
                ('date_awarded', models.DateField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='awards', to='doctor.doctor')),
            ],
        ),
        migrations.CreateModel(
            name='DoctorAddress',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('address', models.TextField(default='NA', max_length=255)),
                ('address2', models.TextField(default='NA', max_length=255)),
                ('city', models.CharField(default='NA', max_length=100)),
                ('state', models.CharField(default='NA', max_length=100)),
                ('pincode', models.CharField(default='NA', max_length=10)),
                ('country', models.CharField(default='India', max_length=100)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, default=None, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, default=None, max_digits=9, null=True)),
                ('google_place_id', models.CharField(blank=True, default=None, max_length=255, null=True)),
                ('google_maps_url', models.URLField(blank=True, default=None, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='address', to='doctor.doctor')),
            ],
        ),
        migrations.CreateModel(
            name='DoctorFeedback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('rating', models.PositiveSmallIntegerField(choices=[(1, '1 Stars'), (2, '2 Stars'), (3, '3 Stars'), (4, '4 Stars'), (5, '5 Stars')], default=5, help_text='Rating out of 5')),
                ('comments', models.TextField(blank=True, default='NA', help_text='Feedback from the reviewer', null=True)),
                ('reviewed_by', models.CharField(default='NA', help_text='Name of the patient/clinic (optional)', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedback', to='doctor.doctor')),
            ],
        ),
        migrations.CreateModel(
            name='DoctorSocialLink',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('platform', models.CharField(default='NA', help_text='e.g., LinkedIn, ResearchGate', max_length=50)),
                ('url', models.URLField(default='NA', help_text='Link to the profile')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='social_links', to='doctor.doctor')),
            ],
        ),
        migrations.CreateModel(
            name='GovernmentID',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('pan_card_number', models.CharField(max_length=10, unique=True, validators=[django.core.validators.RegexValidator(message='Invalid PAN format.', regex='^[A-Z]{5}[0-9]{4}[A-Z]$')])),
                ('aadhar_card_number', models.CharField(max_length=12, unique=True, validators=[django.core.validators.RegexValidator(message='Invalid Aadhar number.', regex='^[0-9]{12}$')])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='government_ids', to='doctor.doctor')),
            ],
        ),
        migrations.CreateModel(
            name='Registration',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('medical_registration_number', models.CharField(max_length=50, unique=True)),
                ('medical_council', models.CharField(help_text='e.g., Medical Council of India', max_length=255)),
                ('registration_certificate', models.FileField(blank=True, null=True, upload_to='doctor_registration_certificates/')),
                ('registration_date', models.DateField(blank=True, null=True)),
                ('valid_upto', models.DateField(blank=True, help_text='License expiry date if applicable', null=True)),
                ('is_verified', models.BooleanField(default=False, help_text='Admin verified medical license?')),
                ('verification_notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='registration', to='doctor.doctor')),
            ],
            options={
                'verbose_name': 'Medical Registration',
                'verbose_name_plural': 'Medical Registrations',
            },
        ),
        migrations.CreateModel(
            name='Specialization',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('specialization', models.CharField(blank=True, choices=[('CL', 'Cardiologist'), ('DL', 'Dermatologist'), ('EMC', 'Emergency Medicine Specialist'), ('IL', 'Immunologist'), ('AL', 'Anesthesiologist'), ('CRS', 'Colon and Rectal Surgeon'), ('END', 'Endocrinologist'), ('GAS', 'Gastroenterologist'), ('HIM', 'Hematologist'), ('ONC', 'Oncologist'), ('NEU', 'Neurologist'), ('NS', 'Neurosurgeon'), ('PED', 'Pediatrician'), ('PLS', 'Plastic Surgeon'), ('PMR', 'Physical Medicine and Rehabilitation Specialist'), ('PSY', 'Psychiatrist'), ('RAD', 'Radiologist'), ('RHU', 'Rheumatologist'), ('THS', 'Thoracic Surgeon'), ('URO', 'Urologist'), ('ENT', 'Otorhinolaryngologist (ENT Specialist)'), ('OPH', 'Ophthalmologist'), ('MFS', 'Maternal-Fetal Medicine Specialist'), ('NEON', 'Neonatologist'), ('GYN', 'Gynecologist'), ('ORT', 'Orthopedic Surgeon'), ('VCS', 'Vascular Surgeon'), ('IMM', 'Allergy and Immunology Specialist'), ('PAIN', 'Pain Medicine Specialist'), ('PATH', 'Pathologist'), ('NM', 'Nuclear Medicine Specialist'), ('SLE', 'Sleep Medicine Specialist'), ('OT', 'Occupational Medicine Specialist'), ('SM', 'Sports Medicine Specialist'), ('PS', 'Palliative Medicine Specialist'), ('DER', 'Dermatosurgeon'), ('FM', 'Family Medicine Specialist'), ('GEN', 'General Practitioner'), ('GER', 'Geriatrician'), ('ID', 'Infectious Disease Specialist'), ('TOX', 'Toxicologist'), ('GENS', 'General Surgeon'), ('TRS', 'Transplant Surgeon'), ('CRIT', 'Critical Care Specialist'), ('COS', 'Cosmetic Surgeon'), ('LAB', 'Lab Medicine Specialist'), ('CLG', 'Clinical Geneticist')], max_length=5, null=True)),
                ('is_primary', models.BooleanField(default=False, help_text='Indicates if this is the primary displayed specialization')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('custom_specialization', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='specializations', to='doctor.customspecialization')),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='specializations', to='doctor.doctor')),
            ],
        ),
        migrations.CreateModel(
            name='DoctorService',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(default='NA', help_text='Service name (e.g., Angioplasty, Skin Treatment)', max_length=255)),
                ('description', models.TextField(blank=True, default='NA', help_text='Details about the service', null=True)),
                ('fee', models.DecimalField(decimal_places=2, default=0.0, help_text='Fee for the service', max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='services', to='doctor.doctor')),
            ],
            options={
                'unique_together': {('doctor', 'name')},
            },
        ),
        migrations.CreateModel(
            name='Education',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('qualification', models.CharField(help_text='e.g., MBBS, MD', max_length=255)),
                ('institute', models.CharField(help_text='Name of the institution', max_length=255)),
                ('year_of_completion', models.PositiveIntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='education', to='doctor.doctor')),
            ],
            options={
                'unique_together': {('doctor', 'qualification', 'institute', 'year_of_completion')},
            },
        ),
        migrations.AddConstraint(
            model_name='registration',
            constraint=models.UniqueConstraint(fields=('doctor',), name='unique_doctor_registration'),
        ),
        migrations.AlterUniqueTogether(
            name='specialization',
            unique_together={('doctor', 'specialization', 'custom_specialization')},
        ),
    ]
