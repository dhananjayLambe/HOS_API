# Generated by Django 5.0.7 on 2025-03-05 10:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0003_remove_doctoravailability_break_end_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='booking_source',
            field=models.CharField(choices=[('online', 'Online Booking (App/Website)'), ('walk_in', 'Walk-In Booking (At Clinic)')], default='online', max_length=10),
        ),
        migrations.AddField(
            model_name='appointment',
            name='consultation_mode',
            field=models.CharField(choices=[('clinic', 'Clinic Visit'), ('video', 'Video Consultation')], default='clinic', max_length=10),
        ),
    ]
