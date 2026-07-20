# Historical migration: originally migrated routing FKs from legacy patient.patient
# to PatientProfile. Now a noop — 0009 creates patient_profile FKs directly so
# fresh installs never depend on the removed `patient` app.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics_engine", "0022_alter_diagnosticreportartifact_artifact_type"),
    ]

    operations = []
