# Generated by Django 5.0.7 on 2025-02-26 18:21

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('doctor', '0010_alter_doctorfeedback_created_at_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='doctor',
            name='department',
        ),
    ]
