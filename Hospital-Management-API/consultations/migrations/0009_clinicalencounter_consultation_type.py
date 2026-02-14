# Add consultation_type to ClinicalEncounter when DB has this column as NOT NULL
# (e.g. schema drift). Idempotent: adds column only if missing, then updates state.

from django.db import migrations, models


def add_consultation_type_if_missing(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'consultations_clinicalencounter'
            AND column_name = 'consultation_type';
        """)
        if cursor.fetchone():
            return
        cursor.execute("""
            ALTER TABLE consultations_clinicalencounter
            ADD COLUMN consultation_type VARCHAR(20) NOT NULL DEFAULT 'FULL';
        """)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("consultations", "0008_ensure_clinicalencounter_prescription_pnr"),
    ]

    operations = [
        migrations.RunPython(add_consultation_type_if_missing, noop_reverse),
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name="clinicalencounter",
                    name="consultation_type",
                    field=models.CharField(
                        choices=[
                            ("FULL", "Full Consultation"),
                            ("QUICK_RX", "Quick Prescription"),
                            ("TEST_ONLY", "Test Only Visit"),
                        ],
                        default="FULL",
                        help_text="Workflow type governing visible sections and validation",
                        max_length=20,
                    ),
                ),
            ],
        ),
    ]
