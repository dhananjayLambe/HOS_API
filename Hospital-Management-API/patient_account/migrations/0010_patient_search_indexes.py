# Generated manually for patient smart search indexes.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("patient_account", "0009_patientprofile_age_fields"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS idx_patientprofile_fullname_trgm "
                "ON patient_account_patientprofile "
                "USING gin ((lower(first_name || ' ' || last_name)) gin_trgm_ops);"
            ),
            reverse_sql="DROP INDEX IF EXISTS idx_patientprofile_fullname_trgm;",
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS idx_account_user_username_trgm "
                "ON account_user "
                "USING gin (username gin_trgm_ops);"
            ),
            reverse_sql="DROP INDEX IF EXISTS idx_account_user_username_trgm;",
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS idx_account_user_username_digits "
                "ON account_user ((regexp_replace(username, '\\D', '', 'g')));"
            ),
            reverse_sql="DROP INDEX IF EXISTS idx_account_user_username_digits;",
        ),
    ]
