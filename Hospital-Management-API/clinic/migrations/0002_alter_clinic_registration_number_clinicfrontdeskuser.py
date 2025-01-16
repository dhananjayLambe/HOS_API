# Generated by Django 5.0.7 on 2025-01-16 08:07

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinic', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='clinic',
            name='registration_number',
            field=models.CharField(blank=True, default=None, max_length=255, null=True, unique=True),
        ),
        migrations.CreateModel(
            name='ClinicFrontDeskUser',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('helpdesk', 'Helpdesk')], default='helpdesk', max_length=50)),
                ('can_book_appointments', models.BooleanField(default=True)),
                ('can_add_patients', models.BooleanField(default=True)),
                ('can_update_details', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clinic', models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='clinic_helpdesk_users', to='clinic.clinic')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
