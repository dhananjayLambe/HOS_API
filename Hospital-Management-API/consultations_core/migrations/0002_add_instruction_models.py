# Generated migration for instruction models (run: python manage.py migrate)

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("consultations_core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="InstructionCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=50, unique=True)),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True, null=True)),
                ("display_order", models.IntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["display_order"]},
        ),
        migrations.CreateModel(
            name="InstructionTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("key", models.CharField(max_length=120, unique=True)),
                ("label", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, null=True)),
                ("requires_input", models.BooleanField(default=False)),
                ("input_schema", models.JSONField(blank=True, null=True)),
                ("is_global", models.BooleanField(default=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("version", models.IntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="consultations_core.instructioncategory")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={},
        ),
        migrations.AddIndex(
            model_name="instructiontemplate",
            index=models.Index(fields=["key"], name="cc_inst_tpl_key_idx"),
        ),
        migrations.AddIndex(
            model_name="instructiontemplate",
            index=models.Index(fields=["category_id"], name="cc_inst_tpl_cat_idx"),
        ),
        migrations.CreateModel(
            name="InstructionTemplateVersion",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("version_number", models.IntegerField()),
                ("label_snapshot", models.CharField(max_length=255)),
                ("input_schema_snapshot", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("template", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="versions", to="consultations_core.instructiontemplate")),
            ],
            options={},
        ),
        migrations.AddConstraint(
            model_name="instructiontemplateversion",
            constraint=models.UniqueConstraint(fields=("template", "version_number"), name="consultatio_template_version_uniq"),
        ),
        migrations.CreateModel(
            name="SpecialtyInstructionMapping",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("specialty", models.CharField(db_index=True, max_length=100)),
                ("is_default", models.BooleanField(default=False)),
                ("display_order", models.IntegerField(default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("instruction", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="specialty_mappings", to="consultations_core.instructiontemplate")),
            ],
            options={},
        ),
        migrations.AddConstraint(
            model_name="specialtyinstructionmapping",
            constraint=models.UniqueConstraint(fields=("specialty", "instruction"), name="consultatio_specialty_instruction_uniq"),
        ),
        migrations.CreateModel(
            name="EncounterInstruction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("input_data", models.JSONField(blank=True, null=True)),
                ("custom_note", models.TextField(blank=True, null=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("added_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="added_encounter_instructions", to=settings.AUTH_USER_MODEL)),
                ("encounter", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="instructions", to="consultations_core.clinicalencounter")),
                ("instruction_template", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="consultations_core.instructiontemplate")),
                ("template_version", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="consultations_core.instructiontemplateversion")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="encounterinstruction",
            index=models.Index(fields=["encounter_id"], name="cc_enc_inst_enc_idx"),
        ),
        migrations.AddIndex(
            model_name="encounterinstruction",
            index=models.Index(fields=["instruction_template_id"], name="cc_enc_inst_tpl_idx"),
        ),
        migrations.AddIndex(
            model_name="encounterinstruction",
            index=models.Index(fields=["is_active"], name="cc_enc_inst_act_idx"),
        ),
        migrations.AddConstraint(
            model_name="encounterinstruction",
            constraint=models.UniqueConstraint(fields=("encounter", "instruction_template", "is_active"), name="unique_active_instruction_per_encounter"),
        ),
        migrations.CreateModel(
            name="InstructionAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[("created", "Created"), ("updated", "Updated"), ("deleted", "Deleted")], db_index=True, max_length=50)),
                ("previous_data", models.JSONField(blank=True, null=True)),
                ("new_data", models.JSONField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("encounter_instruction", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="audit_logs", to="consultations_core.encounterinstruction")),
                ("performed_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
