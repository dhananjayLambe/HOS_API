from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from diagnostics_engine.models import (
    BranchServicePricing,
    CommissionType,
    DiagnosticCategory,
    DiagnosticProvider,
    DiagnosticProviderBranch,
    DiagnosticServiceMaster,
)


class Command(BaseCommand):
    help = (
        "Seed diagnostics_engine master mock data: categories, services, providers, "
        "branches, and branch pricing."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes and rollback at the end.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        summary = {
            "categories_created": 0,
            "categories_reused": 0,
            "services_created": 0,
            "services_reused": 0,
            "providers_created": 0,
            "providers_reused": 0,
            "branches_created": 0,
            "branches_reused": 0,
            "pricing_created": 0,
            "pricing_reused": 0,
            "pricing_updated": 0,
        }

        with transaction.atomic():
            # ---------------------------------------------------------
            # 1) Seed core diagnostic categories
            # ---------------------------------------------------------
            categories = self._seed_categories(summary)

            # ---------------------------------------------------------
            # 2) Seed realistic catalog services (tests/scans/MRI/etc.)
            # ---------------------------------------------------------
            services = self._seed_services(categories, summary)

            # ---------------------------------------------------------
            # 3) Seed providers and branches (Indian context)
            # ---------------------------------------------------------
            branches = self._seed_providers_and_branches(summary)

            # ---------------------------------------------------------
            # 4) Seed branch-wise pricing for selected services
            # ---------------------------------------------------------
            self._seed_branch_pricing(branches, services, summary)

            if dry_run:
                transaction.set_rollback(True)

        self._print_summary(summary, dry_run=dry_run)

    def _seed_categories(self, summary):
        category_specs = [
            {"key": "lab", "name": "Lab", "code": "LAB"},
            {"key": "radiology", "name": "Radiology", "code": "RAD"},
            {"key": "scan", "name": "Scan", "code": "SCAN"},
            {"key": "package", "name": "Package", "code": "PKG"},
        ]

        categories = {}
        for spec in category_specs:
            category, created = DiagnosticCategory.objects.get_or_create(
                code=spec["code"],
                defaults={
                    "name": spec["name"],
                    "ordering": 10,
                    "is_active": True,
                },
            )
            if created:
                summary["categories_created"] += 1
            else:
                summary["categories_reused"] += 1

            categories[spec["key"]] = category
        return categories

    def _seed_services(self, categories, summary):
        service_specs = [
            # Mandatory requested lab tests
            {"code": "LAB-CBC", "name": "Complete Blood Count (CBC)", "category_key": "lab", "tat": 12},
            {"code": "LAB-LFT", "name": "Liver Function Test (LFT)", "category_key": "lab", "tat": 18},
            {"code": "LAB-KFT", "name": "Kidney Function Test (KFT)", "category_key": "lab", "tat": 18},
            {"code": "LAB-LIPID", "name": "Lipid Profile", "category_key": "lab", "tat": 24},
            {"code": "LAB-THYROID", "name": "Thyroid Profile", "category_key": "lab", "tat": 24},
            # Additional realistic lab tests
            {"code": "LAB-HBA1C", "name": "HbA1c", "category_key": "lab", "tat": 24},
            {"code": "LAB-CRP", "name": "C-Reactive Protein (CRP)", "category_key": "lab", "tat": 16},
            # Mandatory requested radiology tests
            {"code": "RAD-XR-CHEST", "name": "X-Ray Chest", "category_key": "radiology", "tat": 6},
            {"code": "RAD-XR-KNEE", "name": "X-Ray Knee", "category_key": "radiology", "tat": 8},
            # Mandatory requested scans
            {"code": "SCAN-MRI-BRAIN", "name": "MRI Brain", "category_key": "scan", "tat": 24},
            {"code": "SCAN-CT-ABDOMEN", "name": "CT Abdomen", "category_key": "scan", "tat": 18},
            {"code": "SCAN-USG-PELVIS", "name": "Ultrasound Pelvis", "category_key": "scan", "tat": 12},
            # Additional scan services
            {"code": "SCAN-ECHO", "name": "2D Echo", "category_key": "scan", "tat": 10},
            # Mandatory requested packages
            {"code": "PKG-DIABETES", "name": "Diabetes Panel", "category_key": "package", "tat": 24},
            {"code": "PKG-FULLBODY", "name": "Full Body Checkup", "category_key": "package", "tat": 36},
            {"code": "PKG-CARDIAC", "name": "Cardiac Package", "category_key": "package", "tat": 30},
        ]

        services = {}
        for spec in service_specs:
            service, created = DiagnosticServiceMaster.objects.get_or_create(
                code=spec["code"],
                defaults={
                    "name": spec["name"],
                    "category": categories[spec["category_key"]],
                    "tat_hours_default": spec["tat"],
                    "is_active": True,
                    "home_collection_possible": spec["category_key"] in {"lab", "package"},
                    "appointment_required": spec["category_key"] in {"radiology", "scan"},
                },
            )
            if created:
                summary["services_created"] += 1
            else:
                summary["services_reused"] += 1

            services[spec["code"]] = service
        return services

    def _seed_providers_and_branches(self, summary):
        provider_specs = [
            {
                "code": "PROV-METRODIAG",
                "name": "Metro Diagnostics",
                "branches": [
                    {
                        "branch_code": "MD-BLR-01",
                        "branch_name": "Koramangala",
                        "contact_number": "+91-8045632100",
                        "email": "koramangala@metrodiag.in",
                        "address_line_1": "12, 80 Feet Road",
                        "city": "Bengaluru",
                        "state": "Karnataka",
                        "pincode": "560034",
                        "home_collection_supported": True,
                    },
                    {
                        "branch_code": "MD-HYD-01",
                        "branch_name": "Banjara Hills",
                        "contact_number": "+91-4067812300",
                        "email": "banjara@metrodiag.in",
                        "address_line_1": "Road No. 3, Banjara Hills",
                        "city": "Hyderabad",
                        "state": "Telangana",
                        "pincode": "500034",
                        "home_collection_supported": True,
                    },
                ],
            },
            {
                "code": "PROV-HEALTHFIRST",
                "name": "HealthFirst Labs",
                "branches": [
                    {
                        "branch_code": "HF-PUN-01",
                        "branch_name": "Aundh",
                        "contact_number": "+91-2067123400",
                        "email": "aundh@healthfirstlabs.in",
                        "address_line_1": "ITI Road, Aundh",
                        "city": "Pune",
                        "state": "Maharashtra",
                        "pincode": "411007",
                        "home_collection_supported": True,
                    },
                    {
                        "branch_code": "HF-DEL-01",
                        "branch_name": "Lajpat Nagar",
                        "contact_number": "+91-1145627800",
                        "email": "lajpat@healthfirstlabs.in",
                        "address_line_1": "Central Market, Lajpat Nagar",
                        "city": "New Delhi",
                        "state": "Delhi",
                        "pincode": "110024",
                        "home_collection_supported": False,
                    },
                ],
            },
        ]

        branches = []
        for provider_spec in provider_specs:
            provider, provider_created = DiagnosticProvider.objects.get_or_create(
                code=provider_spec["code"],
                defaults={
                    "name": provider_spec["name"],
                    "is_active": True,
                },
            )
            if provider_created:
                summary["providers_created"] += 1
            else:
                summary["providers_reused"] += 1

            for branch_spec in provider_spec["branches"]:
                branch, branch_created = DiagnosticProviderBranch.objects.get_or_create(
                    provider=provider,
                    branch_code=branch_spec["branch_code"],
                    defaults={
                        "branch_name": branch_spec["branch_name"],
                        "contact_number": branch_spec["contact_number"],
                        "email": branch_spec["email"],
                        "address_line_1": branch_spec["address_line_1"],
                        "city": branch_spec["city"],
                        "state": branch_spec["state"],
                        "pincode": branch_spec["pincode"],
                        "country": "India",
                        "home_collection_supported": branch_spec["home_collection_supported"],
                        "is_active": True,
                    },
                )
                if branch_created:
                    summary["branches_created"] += 1
                else:
                    summary["branches_reused"] += 1
                branches.append(branch)

        return branches

    def _seed_branch_pricing(self, branches, services, summary):
        service_prices = {
            "LAB-CBC": Decimal("399.00"),
            "LAB-LFT": Decimal("549.00"),
            "LAB-KFT": Decimal("499.00"),
            "LAB-LIPID": Decimal("699.00"),
            "LAB-THYROID": Decimal("799.00"),
            "RAD-XR-CHEST": Decimal("650.00"),
            "RAD-XR-KNEE": Decimal("700.00"),
            "SCAN-MRI-BRAIN": Decimal("6500.00"),
            "SCAN-CT-ABDOMEN": Decimal("4200.00"),
            "SCAN-USG-PELVIS": Decimal("1500.00"),
            "PKG-DIABETES": Decimal("1499.00"),
            "PKG-FULLBODY": Decimal("3999.00"),
            "PKG-CARDIAC": Decimal("4599.00"),
        }

        for branch in branches:
            for service_code, base_price in service_prices.items():
                service = services[service_code]
                selling_price = base_price
                cost_price = (selling_price * Decimal("0.62")).quantize(Decimal("0.01"))
                platform_margin = (selling_price * Decimal("0.08")).quantize(Decimal("0.01"))
                doctor_margin = (selling_price * Decimal("0.06")).quantize(Decimal("0.01"))
                lab_payout = (selling_price - platform_margin - doctor_margin).quantize(Decimal("0.01"))

                pricing, created = BranchServicePricing.objects.get_or_create(
                    branch=branch,
                    service=service,
                    is_active=True,
                    defaults={
                        "selling_price": selling_price,
                        "cost_price": cost_price,
                        "platform_margin_snapshot": platform_margin,
                        "doctor_margin_snapshot": doctor_margin,
                        "lab_payout_snapshot": lab_payout,
                        "platform_margin_type": CommissionType.FLAT,
                        "platform_margin_value": platform_margin,
                        "doctor_commission_type": CommissionType.FLAT,
                        "doctor_commission_value": doctor_margin,
                    },
                )

                if created:
                    summary["pricing_created"] += 1
                    continue

                summary["pricing_reused"] += 1
                fields_to_update = []
                desired_values = {
                    "selling_price": selling_price,
                    "cost_price": cost_price,
                    "platform_margin_snapshot": platform_margin,
                    "doctor_margin_snapshot": doctor_margin,
                    "lab_payout_snapshot": lab_payout,
                    "platform_margin_type": CommissionType.FLAT,
                    "platform_margin_value": platform_margin,
                    "doctor_commission_type": CommissionType.FLAT,
                    "doctor_commission_value": doctor_margin,
                }

                for field_name, value in desired_values.items():
                    if getattr(pricing, field_name) != value:
                        setattr(pricing, field_name, value)
                        fields_to_update.append(field_name)

                if fields_to_update:
                    pricing.save(update_fields=fields_to_update + ["updated_at"])
                    summary["pricing_updated"] += 1

    def _print_summary(self, summary, dry_run):
        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(self.style.SUCCESS(f"Diagnostics mock data seed: {mode}"))
        self.stdout.write("-" * 60)
        self.stdout.write(
            f"Categories -> created: {summary['categories_created']}, reused: {summary['categories_reused']}"
        )
        self.stdout.write(
            f"Services   -> created: {summary['services_created']}, reused: {summary['services_reused']}"
        )
        self.stdout.write(
            f"Providers  -> created: {summary['providers_created']}, reused: {summary['providers_reused']}"
        )
        self.stdout.write(
            f"Branches   -> created: {summary['branches_created']}, reused: {summary['branches_reused']}"
        )
        self.stdout.write(
            "Pricing    -> created: {created}, reused: {reused}, updated: {updated}".format(
                created=summary["pricing_created"],
                reused=summary["pricing_reused"],
                updated=summary["pricing_updated"],
            )
        )

