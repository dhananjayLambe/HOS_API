# Generated manually for catalog search (pg_trgm + search_text).

import django.contrib.postgres.indexes
import django.contrib.postgres.operations
import django.contrib.postgres.fields
from django.db import migrations, models


def backfill_search_text(apps, schema_editor):
    from diagnostics_engine.text_normalize import (
        compose_package_search_text,
        compose_service_search_text,
    )

    Service = apps.get_model("diagnostics_engine", "DiagnosticServiceMaster")
    Package = apps.get_model("diagnostics_engine", "DiagnosticPackage")
    Item = apps.get_model("diagnostics_engine", "DiagnosticPackageItem")

    for s in Service.objects.all().iterator():
        st = compose_service_search_text(
            s.name,
            getattr(s, "short_name", "") or "",
            s.code,
            list(getattr(s, "synonyms", None) or []),
            list(getattr(s, "tags", None) or []),
        )
        Service.objects.filter(pk=s.pk).update(search_text=st)

    for p in Package.objects.all().iterator():
        item_parts = []
        for it in Item.objects.filter(package_id=p.pk, deleted_at__isnull=True).select_related(
            "service"
        ):
            sv = it.service
            sn = getattr(sv, "short_name", "") or ""
            item_parts.append(f"{sv.name} {sv.code} {sn}")
        st = compose_package_search_text(
            p.name,
            p.lineage_code,
            p.description or "",
            p.tags,
            item_parts,
        )
        Package.objects.filter(pk=p.pk).update(search_text=st)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics_engine", "0003_symptomtestmapping_diagnosistestmapping_and_more"),
    ]

    operations = [
        django.contrib.postgres.operations.TrigramExtension(),
        migrations.AddField(
            model_name="diagnosticservicemaster",
            name="short_name",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="diagnosticservicemaster",
            name="synonyms",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=200),
                blank=True,
                default=list,
                size=None,
            ),
        ),
        migrations.AddField(
            model_name="diagnosticservicemaster",
            name="tags",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=200),
                blank=True,
                default=list,
                size=None,
            ),
        ),
        migrations.AddField(
            model_name="diagnosticservicemaster",
            name="search_text",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="diagnosticservicemaster",
            name="synopsis",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="diagnosticservicemaster",
            name="popularity_score",
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name="diagnosticservicemaster",
            name="doctor_usage_score",
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name="diagnosticpackage",
            name="search_text",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.RunPython(backfill_search_text, noop_reverse),
        migrations.AddIndex(
            model_name="diagnosticservicemaster",
            index=django.contrib.postgres.indexes.GinIndex(
                django.contrib.postgres.indexes.OpClass("search_text", name="gin_trgm_ops"),
                name="test_search_trgm",
            ),
        ),
        migrations.AddIndex(
            model_name="diagnosticpackage",
            index=django.contrib.postgres.indexes.GinIndex(
                django.contrib.postgres.indexes.OpClass("search_text", name="gin_trgm_ops"),
                name="package_search_trgm",
            ),
        ),
    ]
