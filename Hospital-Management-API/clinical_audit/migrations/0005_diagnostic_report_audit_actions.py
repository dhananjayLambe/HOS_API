# Generated manually for M3.6 diagnostic & report audit actions

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinical_audit", "0004_prescription_audit_actions"),
    ]

    operations = [
        migrations.AlterField(
            model_name="clinicalaudit",
            name="action",
            field=models.CharField(
                choices=[
                    ("authentication.login", "Authentication Login"),
                    ("authentication.logout", "Authentication Logout"),
                    ("authentication.failed_login", "Authentication Failed Login"),
                    ("patient.record_created", "Patient Record Created"),
                    ("patient.record_updated", "Patient Record Updated"),
                    ("patient.record_viewed", "Patient Record Viewed"),
                    ("patient.profile_merged", "Patient Profile Merged"),
                    ("consultation.started", "Consultation Started"),
                    ("consultation.completed", "Consultation Completed"),
                    ("consultation.cancelled", "Consultation Cancelled"),
                    (
                        "consultation.findings.updated",
                        "Consultation Findings Updated",
                    ),
                    (
                        "consultation.instructions.updated",
                        "Consultation Instructions Updated",
                    ),
                    (
                        "consultation.investigations.updated",
                        "Consultation Investigations Updated",
                    ),
                    ("consultation.reopened", "Consultation Reopened"),
                    ("diagnosis.added", "Diagnosis Added"),
                    ("diagnosis.updated", "Diagnosis Updated"),
                    ("diagnosis.removed", "Diagnosis Removed"),
                    ("allergy.added", "Allergy Added"),
                    ("allergy.updated", "Allergy Updated"),
                    ("clinical_notes.updated", "Clinical Notes Updated"),
                    ("vitals.recorded", "Vital Signs Recorded"),
                    ("symptoms.recorded", "Symptoms Recorded"),
                    ("prescription.created", "Prescription Created"),
                    ("prescription.signed", "Prescription Signed"),
                    ("prescription.generated", "Prescription Generated"),
                    ("prescription.updated", "Prescription Updated"),
                    ("prescription.downloaded", "Prescription Downloaded"),
                    ("prescription.shared", "Prescription Shared"),
                    ("investigation.added", "Investigation Added"),
                    ("investigation.updated", "Investigation Updated"),
                    ("investigation.removed", "Investigation Removed"),
                    ("test.ordered", "Test Ordered"),
                    (
                        "recommendation.generated",
                        "Laboratory Recommendation Generated",
                    ),
                    ("recommendation.sent", "Laboratory Recommendation Sent"),
                    (
                        "recommendation.accepted",
                        "Laboratory Recommendation Accepted",
                    ),
                    ("report.uploaded", "Report Uploaded"),
                    ("report.approved", "Report Approved"),
                    ("report.viewed", "Report Viewed"),
                    ("report.downloaded", "Report Downloaded"),
                    ("report.shared", "Report Shared"),
                    ("follow_up.scheduled", "Follow-up Scheduled"),
                    ("follow_up.completed", "Follow-up Completed"),
                ],
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="clinicalaudit",
            name="resource_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("patient", "Patient"),
                    ("consultation", "Consultation"),
                    ("encounter", "Encounter"),
                    ("diagnosis", "Diagnosis"),
                    ("allergy", "Allergy"),
                    ("clinical_notes", "Clinical Notes"),
                    ("vitals", "Vital Signs"),
                    ("symptoms", "Symptoms"),
                    ("prescription", "Prescription"),
                    ("investigation", "Investigation"),
                    ("diagnostic_test", "Diagnostic Test"),
                    ("recommendation", "Recommendation"),
                    ("report", "Report"),
                    ("follow_up", "Follow-up"),
                ],
                max_length=32,
                null=True,
            ),
        ),
    ]
