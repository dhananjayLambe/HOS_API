# Generated by Django 5.0.7 on 2025-07-01 05:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinic', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clinicaddress',
            name='google_maps_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='clinicaddress',
            name='google_place_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name='clinicaddress',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AlterField(
            model_name='clinicaddress',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]
