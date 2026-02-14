# Migration to fix DB schema when consultations_clinicalencounter exists
# but is missing prescription_pnr (e.g. after --fake or restored backup).

from django.db import migrations


def add_prescription_pnr_if_missing(apps, schema_editor):
    """Add prescription_pnr column if it does not exist (PostgreSQL)."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'consultations_clinicalencounter'
            AND column_name = 'prescription_pnr';
        """)
        if cursor.fetchone():
            return
        # Column missing: add it (nullable first for existing rows)
        cursor.execute("""
            ALTER TABLE consultations_clinicalencounter
            ADD COLUMN prescription_pnr VARCHAR(15) NULL;
        """)
        # Backfill from consultation_pnr so we can set NOT NULL + unique
        cursor.execute("""
            UPDATE consultations_clinicalencounter
            SET prescription_pnr = consultation_pnr
            WHERE prescription_pnr IS NULL;
        """)
        cursor.execute("""
            ALTER TABLE consultations_clinicalencounter
            ALTER COLUMN prescription_pnr SET NOT NULL;
        """)
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS consultations_clinicalencounter_prescription_pnr_key
            ON consultations_clinicalencounter (prescription_pnr);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS consultations_clinicalencounter_prescription_pnr_idx
            ON consultations_clinicalencounter (prescription_pnr);
        """)


def noop_reverse(apps, schema_editor):
    """No reverse - we don't drop the column."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("consultations", "0007_add_consultation_type"),
    ]

    operations = [
        migrations.RunPython(add_prescription_pnr_if_missing, noop_reverse),
    ]
