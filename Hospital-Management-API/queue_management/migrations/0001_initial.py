# Generated by Django 5.0.7 on 2025-03-17 09:55

import datetime
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('appointments', '0006_appointment_appointment_type_and_more'),
        ('clinic', '0003_delete_clinicfrontdeskuser'),
        ('doctor', '0017_alter_doctorfeestructure_unique_together_and_more'),
        ('patient_account', '0008_delete_address'),
    ]

    operations = [
        migrations.CreateModel(
            name='Queue',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('waiting', 'Waiting'), ('in_consultation', 'In Consultation'), ('completed', 'Completed'), ('skipped', 'Skipped'), ('cancelled', 'Cancelled')], default='waiting', max_length=20)),
                ('check_in_time', models.DateTimeField(auto_now_add=True)),
                ('estimated_wait_time', models.DurationField(default=datetime.timedelta(0))),
                ('position_in_queue', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('appointment', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='queue', to='appointments.appointment')),
                ('clinic', models.ForeignKey(default=None, on_delete=django.db.models.deletion.CASCADE, related_name='queues', to='clinic.clinic')),
                ('doctor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='queues', to='doctor.doctor')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='queue', to='patient_account.patientprofile')),
                ('patient_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='queues', to='patient_account.patientaccount')),
            ],
            options={
                'indexes': [models.Index(fields=['doctor', 'status'], name='queue_manag_doctor__263545_idx'), models.Index(fields=['appointment'], name='queue_manag_appoint_d342ea_idx'), models.Index(fields=['clinic', 'status'], name='queue_manag_clinic__140a60_idx')],
            },
        ),
    ]
