"""Tests for diagnostics_engine.services.catalog_import CSV sync."""

from __future__ import annotations

import tempfile
from pathlib import Path

from django.test import TestCase

from diagnostics_engine.models.catalog import (
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from diagnostics_engine.services.catalog_import.categories_importer import sync_categories
from diagnostics_engine.services.catalog_import.package_items_importer import sync_package_items_from_file
from diagnostics_engine.services.catalog_import.packages_importer import sync_packages_from_file
from diagnostics_engine.services.catalog_import.services_importer import sync_services_from_file
from diagnostics_engine.services.catalog_import.csv_audit import find_all_duplicates
from diagnostics_engine.services.catalog_import.utils import (
    default_data_dir,
    read_csv_rows,
    sort_rows_by_csv_ordering,
)


class CatalogDataCsvIntegrityTests(TestCase):
    """Committed catalog CSVs must not contain duplicate natural keys."""

    def test_shipped_catalog_csvs_have_no_duplicate_natural_keys(self):
        data_dir = default_data_dir()
        dups = find_all_duplicates(data_dir)
        self.assertEqual(
            dups,
            [],
            msg="Duplicate catalog keys: "
            + "; ".join(f"{d.kind} {d.key} @ {d.locations}" for d in dups),
        )

    def test_remove_duplicate_service_rows_keeps_first_occurrence(self):
        from diagnostics_engine.services.catalog_import.csv_audit import remove_duplicate_service_rows

        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            svc = root / "services"
            svc.mkdir(parents=True)
            hdr = (
                "ordering,code,name,category_code,short_name,sample_type,"
                "home_collection_possible,tat_hours_default,is_active\n"
            )
            (svc / "a_services.csv").write_text(hdr + "1,DUPX,First,CAT,,,false,24,true\n", encoding="utf-8")
            (svc / "z_services.csv").write_text(hdr + "2,DUPX,Second,CAT,,,false,24,true\n", encoding="utf-8")
            n, logs = remove_duplicate_service_rows(root)
            self.assertEqual(n, 1)
            self.assertTrue(any("removed" in x.lower() for x in logs))
            a_body = (svc / "a_services.csv").read_text(encoding="utf-8")
            self.assertIn("First", a_body)
            z_non_empty = [ln for ln in (svc / "z_services.csv").read_text(encoding="utf-8").splitlines() if ln.strip()]
            self.assertEqual(len(z_non_empty), 1, msg="duplicate file should be header-only")


class CatalogImportUtilsTests(TestCase):
    def test_sort_rows_by_csv_ordering(self):
        with tempfile.NamedTemporaryFile("w+", suffix=".csv", delete=False) as fh:
            fh.write("ordering,code\n20,b\n10,a\n")
            path = Path(fh.name)
        try:
            rows = read_csv_rows(path)
            sorted_rows = sort_rows_by_csv_ordering(rows)
            self.assertEqual([r.get("code") for r in sorted_rows], ["a", "b"])
        finally:
            path.unlink(missing_ok=True)


class CatalogImportSyncTests(TestCase):
    def test_categories_roots_then_subs_idempotent(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d)
            (base / "categories.csv").write_text(
                "ordering,code,name,is_active\n10,ROOTZ,Root Z,true\n",
                encoding="utf-8",
            )
            (base / "subcategories.csv").write_text(
                "ordering,code,name,parent_code,is_active\n10,CHILDZ,Child Z,ROOTZ,true\n",
                encoding="utf-8",
            )
            r1 = sync_categories(
                data_dir=base,
                categories_path=base / "categories.csv",
                subcategories_path=base / "subcategories.csv",
                dry_run=False,
                strict=False,
            )
            self.assertEqual(r1.stats.failed, 0)
            self.assertEqual(r1.stats.created, 2)
            r2 = sync_categories(
                data_dir=base,
                categories_path=base / "categories.csv",
                subcategories_path=base / "subcategories.csv",
                dry_run=False,
                strict=False,
            )
            self.assertEqual(r2.stats.skipped, 2)
            self.assertEqual(DiagnosticCategory.objects.filter(code="ROOTZ").count(), 1)

    def test_categories_dry_run_subcategories_resolve_root_codes_from_csv(self):
        """Dry-run does not write roots; subs must still validate against root codes in categories.csv."""
        with tempfile.TemporaryDirectory() as d:
            base = Path(d)
            (base / "categories.csv").write_text(
                "ordering,code,name,is_active\n1,DRYROOT,DRY Root,true\n",
                encoding="utf-8",
            )
            (base / "subcategories.csv").write_text(
                "ordering,code,name,parent_code,is_active\n1,DRYSUB,DRY Sub,DRYROOT,true\n",
                encoding="utf-8",
            )
            r = sync_categories(
                data_dir=base,
                categories_path=base / "categories.csv",
                subcategories_path=base / "subcategories.csv",
                dry_run=True,
                strict=False,
            )
            self.assertEqual(r.stats.failed, 0, msg=r.errors)
            self.assertEqual(r.stats.created, 2)
            self.assertFalse(DiagnosticCategory.objects.filter(code="DRYROOT").exists())

    def test_services_and_package_items(self):
        cat = DiagnosticCategory.objects.create(code="CATZ", name="Cat Z")
        with tempfile.TemporaryDirectory() as d:
            base = Path(d)
            (base / "svc.csv").write_text(
                "ordering,code,name,category_code,short_name,sample_type,"
                "home_collection_possible,tat_hours_default,is_active\n"
                "1,SVC-Z-1,Service Z 1,CATZ,S1,Blood,false,24,true\n",
                encoding="utf-8",
            )
            sr = sync_services_from_file(
                base / "svc.csv",
                category_by_code={cat.code: cat},
                dry_run=False,
                strict=False,
            )
            self.assertEqual(sr.stats.created, 1)
            self.assertTrue(DiagnosticServiceMaster.objects.filter(code="SVC-Z-1").exists())

            (base / "pkg.csv").write_text(
                "ordering,lineage_code,version,name,category_code,package_type,"
                "collection_type,is_active,is_latest\n"
                "1,LINE-Z,1,Package Z,CATZ,system,lab,true,true\n",
                encoding="utf-8",
            )
            pr = sync_packages_from_file(
                base / "pkg.csv",
                category_by_code={cat.code: cat},
                dry_run=False,
                strict=False,
            )
            self.assertEqual(pr.stats.created, 1)
            pkg = DiagnosticPackage.objects.get(lineage_code="LINE-Z", version=1)
            self.assertTrue(pkg.is_latest)

            (base / "items.csv").write_text(
                "package_code,service_code,quantity,is_mandatory,display_order\n"
                "LINE-Z,SVC-Z-1,1,true,1\n",
                encoding="utf-8",
            )
            ir = sync_package_items_from_file(base / "items.csv", dry_run=False, strict=False)
            self.assertEqual(ir.stats.created, 1)
            self.assertEqual(
                DiagnosticPackageItem.objects.filter(
                    package=pkg,
                    service__code="SVC-Z-1",
                    deleted_at__isnull=True,
                ).count(),
                1,
            )

    def test_duplicate_is_latest_in_package_csv_fails(self):
        cat = DiagnosticCategory.objects.create(code="CATY", name="Cat Y")
        with tempfile.TemporaryDirectory() as d:
            base = Path(d)
            (base / "pkg.csv").write_text(
                "ordering,lineage_code,version,name,category_code,package_type,"
                "collection_type,is_active,is_latest\n"
                "1,L-DUP,1,P1,CATY,system,lab,true,true\n"
                "2,L-DUP,2,P2,CATY,system,lab,true,true\n",
                encoding="utf-8",
            )
            pr = sync_packages_from_file(
                base / "pkg.csv",
                category_by_code={cat.code: cat},
                dry_run=False,
                strict=False,
            )
            self.assertGreater(pr.stats.failed, 0)
            self.assertTrue(any("duplicate is_latest" in e for e in pr.errors))
