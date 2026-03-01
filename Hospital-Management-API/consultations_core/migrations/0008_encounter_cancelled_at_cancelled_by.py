# Phase-1: Back/Cancel — record when and by whom encounter was cancelled

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("consultations_core", "0007_add_preconsultation_is_skipped"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="clinicalencounter",
            name="cancelled_at",
            field=models.DateTimeField(blank=True, help_text="When encounter was cancelled", null=True),
        ),
        migrations.AddField(
            model_name="clinicalencounter",
            name="cancelled_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="encounters_cancelled",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
