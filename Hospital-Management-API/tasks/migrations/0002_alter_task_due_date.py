# Generated migration to change due_date from DateField to DateTimeField

from django.db import migrations, models
from django.utils import timezone


def convert_date_to_datetime(apps, schema_editor):
    """Convert existing date values to datetime (set time to 00:00:00)"""
    Task = apps.get_model('tasks', 'Task')
    for task in Task.objects.all():
        if task.due_date:
            # Convert date to datetime at start of day
            from datetime import datetime
            if isinstance(task.due_date, str):
                # Handle string dates
                task.due_date = datetime.strptime(task.due_date, '%Y-%m-%d')
            elif hasattr(task.due_date, 'date'):
                # It's already a date object, convert to datetime
                task.due_date = datetime.combine(task.due_date, datetime.min.time())
            task.save()


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0001_initial'),
    ]

    operations = [
        # First, convert existing data
        migrations.RunPython(convert_date_to_datetime, migrations.RunPython.noop),
        # Then, alter the field type
        migrations.AlterField(
            model_name='task',
            name='due_date',
            field=models.DateTimeField(db_index=True),
        ),
    ]

