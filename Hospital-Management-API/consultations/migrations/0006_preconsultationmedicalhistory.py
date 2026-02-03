# Generated manually on 2026-01-28

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations', '0005_encounterdailycounter_clinicalencounter_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PreConsultationMedicalHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('section_code', models.CharField(help_text='Section identifier (e.g. vitals, chief_complaint)', max_length=50)),
                ('schema_version', models.CharField(default='v1', help_text='Schema version of this section', max_length=20)),
                ('data', models.JSONField(help_text='Template-driven JSON data for this section')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('pre_consultation', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='consultations.preconsultation')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'PreConsultation Medical History',
                'verbose_name_plural': 'PreConsultation Medical Histories',
            },
        ),
    ]
