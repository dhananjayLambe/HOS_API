from django.db import migrations, models
import uuid


def _backfill_artifact_public_id(apps, schema_editor):
    Artifact = apps.get_model("diagnostics_engine", "DiagnosticReportArtifact")
    for row in Artifact.objects.filter(artifact_public_id__isnull=True).only("id"):
        Artifact.objects.filter(pk=row.pk).update(artifact_public_id=uuid.uuid4())


def _dedupe_active_artifacts(apps, schema_editor):
    Artifact = apps.get_model("diagnostics_engine", "DiagnosticReportArtifact")
    seen: set[tuple[str, str]] = set()
    rows = (
        Artifact.objects.filter(is_active=True)
        .order_by("report_id", "artifact_type", "-uploaded_at", "-id")
        .values("id", "report_id", "artifact_type")
    )
    archive_ids: list[str] = []
    for row in rows:
        key = (str(row["report_id"]), str(row["artifact_type"]))
        if key in seen:
            archive_ids.append(str(row["id"]))
        else:
            seen.add(key)
    if archive_ids:
        Artifact.objects.filter(id__in=archive_ids).update(
            is_active=False,
            artifact_state="archived",
            is_archived=True,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("diagnostics_engine", "0013_widen_diagnosticreportartifact_file"),
    ]
    atomic = False

    operations = [
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="artifact_category",
            field=models.CharField(
                choices=[
                    ("diagnostic_report", "Diagnostic Report"),
                    ("imaging", "Imaging"),
                    ("prescription", "Prescription"),
                    ("invoice", "Invoice"),
                    ("consent_form", "Consent Form"),
                    ("other", "Other"),
                ],
                default="diagnostic_report",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="artifact_public_id",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="artifact_state",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("archived", "Archived"),
                    ("deleted", "Deleted"),
                    ("quarantine", "Quarantine"),
                ],
                db_index=True,
                default="active",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="artifact_version",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="checksum_sha256",
            field=models.CharField(blank=True, db_index=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="encounter_uuid",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="generated_by_user_uuid",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="legal_hold",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="is_archived",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="patient_account_uuid",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="patient_profile_uuid",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="report_public_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="retention_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="source_organization_uuid",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="source_type",
            field=models.CharField(
                choices=[
                    ("lab_upload", "Lab Upload"),
                    ("doctor_upload", "Doctor Upload"),
                    ("patient_upload", "Patient Upload"),
                    ("system_generated", "System Generated"),
                    ("ai_generated", "AI Generated"),
                ],
                default="lab_upload",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="storage_key",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="diagnosticreportartifact",
            name="uploaded_by_user_uuid",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="diagnosticreportartifact",
            index=models.Index(
                fields=["patient_profile_uuid", "artifact_state", "uploaded_at"],
                name="diagnostics_patient_pr_8f0901_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="diagnosticreportartifact",
            index=models.Index(
                fields=["patient_account_uuid", "artifact_state", "uploaded_at"],
                name="diagnostics_patient_ac_63c24f_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="diagnosticreportartifact",
            index=models.Index(
                fields=["report", "artifact_type", "artifact_state", "is_active"],
                name="diagnostics_report_c6adfa_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="diagnosticreportartifact",
            index=models.Index(
                fields=["checksum_sha256", "report", "is_active"],
                name="diagnostics_checksum_9f65e2_idx",
            ),
        ),
        migrations.RunPython(_backfill_artifact_public_id, migrations.RunPython.noop),
        migrations.RunPython(_dedupe_active_artifacts, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="diagnosticreportartifact",
            name="artifact_public_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddConstraint(
            model_name="diagnosticreportartifact",
            constraint=models.UniqueConstraint(
                condition=models.Q(artifact_state="active", is_active=True),
                fields=("report", "artifact_type"),
                name="unique_active_artifact_per_report_type",
            ),
        ),
    ]
