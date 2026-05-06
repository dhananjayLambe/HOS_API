from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("patient_account", "0010_patient_search_indexes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("consultations_core", "0025_rename_clinical_temp_doctor_id_idx_clinical_te_doctor__f25c8d_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="prescription",
            name="cancel_reason_code",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="prescription",
            name="cancel_reason_text",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="prescription",
            name="cancelled_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="prescription",
            name="cancelled_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="prescriptions_cancelled", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="prescription",
            name="cancelled_by_patient_profile",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="prescriptions_cancelled", to="patient_account.patientprofile"),
        ),
        migrations.AddField(
            model_name="prescription",
            name="cancelled_by_source",
            field=models.CharField(blank=True, choices=[("doctor", "Doctor"), ("patient", "Patient"), ("admin", "Admin"), ("system", "System")], max_length=20, null=True),
        ),
        migrations.AddIndex(
            model_name="prescription",
            index=models.Index(fields=["status", "consultation"], name="consultatio_status_62a278_idx"),
        ),
    ]
