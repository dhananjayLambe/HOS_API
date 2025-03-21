# Generated by Django 5.0.7 on 2025-03-02 18:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0002_doctoropdstatus'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='doctoravailability',
            name='break_end',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='break_start',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='evening_end',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='evening_start',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='morning_end',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='morning_start',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='night_end',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='night_start',
        ),
        migrations.RemoveField(
            model_name='doctoravailability',
            name='working_days',
        ),
        migrations.AddField(
            model_name='doctoravailability',
            name='availability',
            field=models.JSONField(default=list, help_text='Stores day-wise availability'),
        ),
        migrations.AlterField(
            model_name='doctoravailability',
            name='buffer_time',
            field=models.PositiveIntegerField(default=5, help_text='Gap between appointments (minutes)'),
        ),
        migrations.AlterField(
            model_name='doctoravailability',
            name='emergency_slots',
            field=models.PositiveIntegerField(default=2, help_text='Reserved emergency slots'),
        ),
        migrations.AlterField(
            model_name='doctoravailability',
            name='max_appointments_per_day',
            field=models.PositiveIntegerField(default=20, help_text='Daily limit'),
        ),
        migrations.AlterField(
            model_name='doctoravailability',
            name='slot_duration',
            field=models.PositiveIntegerField(default=10, help_text='Duration per patient (minutes)'),
        ),
    ]
