# Generated by Django 5.0.7 on 2025-07-10 18:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('diagnostic', '0010_alter_medicaltest_options_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='testlabmapping',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='testlabmapping',
            name='is_active',
            field=models.BooleanField(default=True, help_text='Is this mapping currently active?'),
        ),
        migrations.AddField(
            model_name='testlabmapping',
            name='notes',
            field=models.TextField(blank=True, help_text='Any additional notes about this mapping', null=True),
        ),
        migrations.AlterField(
            model_name='testlabmapping',
            name='turnaround_time',
            field=models.PositiveIntegerField(help_text='In hours'),
        ),
        migrations.AddIndex(
            model_name='testlabmapping',
            index=models.Index(fields=['lab'], name='diagnostic__lab_id_0ab509_idx'),
        ),
        migrations.AddIndex(
            model_name='testlabmapping',
            index=models.Index(fields=['test'], name='diagnostic__test_id_10743c_idx'),
        ),
        migrations.AddIndex(
            model_name='testlabmapping',
            index=models.Index(fields=['is_active'], name='diagnostic__is_acti_f80078_idx'),
        ),
        migrations.AddConstraint(
            model_name='testlabmapping',
            constraint=models.UniqueConstraint(condition=models.Q(('is_active', True)), fields=('test', 'lab'), name='unique_active_test_lab'),
        ),
    ]
