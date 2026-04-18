# Generated manually for ClinicalTemplate

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations_core', '0023_procedure'),
        ('doctor', '0031_doctor_public_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClinicalTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                (
                    'consultation_type',
                    models.CharField(
                        choices=[
                            ('FULL', 'Full Consultation'),
                            ('QUICK_RX', 'Quick Prescription'),
                            ('TEST_ONLY', 'Tests Only'),
                        ],
                        max_length=20,
                    ),
                ),
                ('template_data', models.JSONField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'doctor',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='clinical_templates',
                        to='doctor.doctor',
                    ),
                ),
            ],
            options={
                'db_table': 'clinical_templates',
                'ordering': ['-created_at'],
                'unique_together': {('doctor', 'name')},
            },
        ),
        migrations.AddIndex(
            model_name='clinicaltemplate',
            index=models.Index(fields=['doctor'], name='clinical_temp_doctor_id_idx'),
        ),
        migrations.AddIndex(
            model_name='clinicaltemplate',
            index=models.Index(fields=['consultation_type'], name='clinical_temp_consult_typ_idx'),
        ),
    ]
