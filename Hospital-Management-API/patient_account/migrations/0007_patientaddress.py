# Generated by Django 5.0.7 on 2025-02-27 01:17

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patient_account', '0006_remove_patientprofiledetails_address'),
    ]

    operations = [
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
    ]
