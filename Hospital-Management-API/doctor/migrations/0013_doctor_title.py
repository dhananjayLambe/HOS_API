# Generated by Django 5.0.7 on 2025-07-03 12:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('doctor', '0012_alter_doctoravailability_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='doctor',
            name='title',
            field=models.CharField(default='Consultant Physician', help_text="Displayed title in prescriptions, e.g., 'Consultant Cardiologist'", max_length=255),
        ),
    ]
