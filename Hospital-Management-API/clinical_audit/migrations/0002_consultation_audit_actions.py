# Generated manually for M3.3 consultation audit actions

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinical_audit", "0001_initial"),
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
                    ("prescription.generated", "Prescription Generated"),
                    ("prescription.updated", "Prescription Updated"),
                    ("prescription.downloaded", "Prescription Downloaded"),
                    ("prescription.shared", "Prescription Shared"),
                    ("investigation.added", "Investigation Added"),
                    ("investigation.updated", "Investigation Updated"),
                    ("investigation.removed", "Investigation Removed"),
                    (
                        "recommendation.generated",
                        "Laboratory Recommendation Generated",
                    ),
                    ("recommendation.sent", "Laboratory Recommendation Sent"),
                    ("report.uploaded", "Report Uploaded"),
                    ("report.approved", "Report Approved"),
                    ("report.viewed", "Report Viewed"),
                    ("report.downloaded", "Report Downloaded"),
                    ("follow_up.scheduled", "Follow-up Scheduled"),
                    ("follow_up.completed", "Follow-up Completed"),
                ],
                max_length=64,
            ),
        ),
    ]
