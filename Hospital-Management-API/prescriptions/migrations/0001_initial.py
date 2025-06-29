# Generated by Django 5.0.7 on 2025-06-19 07:14

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('consultations', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Prescription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('drug_name', models.CharField(max_length=255)),
                ('medicine_type', models.CharField(choices=[('tablet', 'Tablet'), ('syrup', 'Syrup'), ('cream', 'Cream'), ('injection', 'Injection'), ('insulin', 'Insulin'), ('spray', 'Spray'), ('drop', 'Drop'), ('powder', 'Powder'), ('ointment', 'Ointment'), ('gel', 'Gel'), ('patch', 'Patch'), ('lotion', 'Lotion'), ('other', 'Other')], help_text='e.g., tablet, syrup, cream, drops', max_length=30)),
                ('strength', models.CharField(help_text='E.g., 500mg, 125mg/5ml', max_length=100)),
                ('dosage_amount', models.DecimalField(decimal_places=2, help_text='How much to take per dose', max_digits=5)),
                ('dosage_unit', models.CharField(choices=[('tablet', 'Tablet'), ('ml', 'Milliliter'), ('g', 'Gram'), ('drop', 'Drop'), ('spray', 'Spray'), ('unit', 'Unit')], help_text='E.g., tablets, ml, g, sprays', max_length=20)),
                ('duration_type', models.CharField(choices=[('fixed', 'Fixed'), ('stat', 'STAT (Immediate)'), ('sos', 'SOS (As Needed)')], default='fixed', help_text='Fixed duration, STAT (take immediately), or SOS (as needed)', max_length=10)),
                ('frequency_per_day', models.IntegerField(help_text='How many times a day the medicine should be taken (e.g., 1, 2, 3)')),
                ('timing_schedule', models.JSONField(help_text="List of timings: e.g., ['before_breakfast', 'after_lunch', 'bedtime']")),
                ('duration_in_days', models.PositiveIntegerField(help_text='For how many days the medicine should be taken')),
                ('total_quantity_required', models.DecimalField(blank=True, decimal_places=2, help_text='Calculated total quantity to complete course (e.g., total tablets or ml)', max_digits=6, null=True)),
                ('instructions', models.TextField(blank=True, help_text='Any special instructions to the patient', null=True)),
                ('interaction_warning', models.TextField(blank=True, help_text='Warnings about drug interactions', null=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('completed', 'Completed'), ('discontinued', 'Discontinued')], default='active', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('consultation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prescriptions', to='consultations.consultation')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_prescriptions', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_prescriptions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Prescription',
                'verbose_name_plural': 'Prescriptions',
                'ordering': ['-created_at'],
            },
        ),
    ]
