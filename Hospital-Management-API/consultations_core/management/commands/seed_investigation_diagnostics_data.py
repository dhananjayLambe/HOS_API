from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from diagnostics_engine.models import (
    BranchPackagePricing,
    BranchServicePricing,
    CollectionType,
    CommissionType,
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticProvider,
    DiagnosticProviderBranch,
    DiagnosticServiceMaster,
    PackageType,
)


class Command(BaseCommand):
    help = (
        "Seed diagnostics_engine master data for investigation API development/testing: "
        "categories, services, providers, branches, and branch service pricing."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview actions and rollback all changes at the end.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        summary = {
            "categories_created": 0,
            "categories_reused": 0,
            "services_created": 0,
            "services_reused": 0,
            "packages_created": 0,
            "packages_reused": 0,
            "package_items_created": 0,
            "package_items_reused": 0,
            "providers_created": 0,
            "providers_reused": 0,
            "branches_created": 0,
            "branches_reused": 0,
            "pricing_created": 0,
            "pricing_reused": 0,
            "pricing_updated": 0,
            "package_pricing_created": 0,
            "package_pricing_reused": 0,
            "package_pricing_updated": 0,
        }

        with transaction.atomic():
            # ---------------------------------------------------------
            # catalog/category creation
            # ---------------------------------------------------------
            categories = self._seed_categories(summary)

            # ---------------------------------------------------------
            # service master creation/update
            # ---------------------------------------------------------
            services = self._seed_services(categories, summary)

            # ---------------------------------------------------------
            # package creation/update
            # ---------------------------------------------------------
            packages = self._seed_packages(categories, services, summary)

            # ---------------------------------------------------------
            # provider/branch creation
            # ---------------------------------------------------------
            branches = self._seed_providers_and_branches(summary)

            # ---------------------------------------------------------
            # branch pricing creation/update
            # ---------------------------------------------------------
            self._seed_branch_pricing(branches, services, summary)
            self._seed_branch_package_pricing(branches, packages, summary)

            if dry_run:
                transaction.set_rollback(True)

        # ---------------------------------------------------------
        # summary output
        # ---------------------------------------------------------
        self._print_summary(summary, dry_run=dry_run)

    def _seed_categories(self, summary):
        category_specs = [
            {"key": "lab", "code": "LAB", "name": "Lab", "ordering": 10},
            {"key": "radiology", "code": "RAD", "name": "Radiology", "ordering": 20},
            {"key": "scan", "code": "SCAN", "name": "Scan", "ordering": 30},
            {"key": "package", "code": "PKG", "name": "Package", "ordering": 40},
        ]
        categories = {}

        for spec in category_specs:
            category, created = DiagnosticCategory.objects.get_or_create(
                code=spec["code"],
                defaults={
                    "name": spec["name"],
                    "ordering": spec["ordering"],
                    "is_active": True,
                },
            )

            if created:
                summary["categories_created"] += 1
            else:
                summary["categories_reused"] += 1

                fields_to_update = []
                if category.ordering != spec["ordering"]:
                    category.ordering = spec["ordering"]
                    fields_to_update.append("ordering")
                if category.is_active is not True:
                    category.is_active = True
                    fields_to_update.append("is_active")

                target_name = spec["name"]
                if category.name != target_name:
                    name_taken = DiagnosticCategory.objects.exclude(pk=category.pk).filter(
                        name=target_name
                    ).exists()
                    if not name_taken:
                        category.name = target_name
                        fields_to_update.append("name")

                if fields_to_update:
                    category.save(update_fields=fields_to_update + ["updated_at"])

            categories[spec["key"]] = category

        return categories

    def _seed_services(self, categories, summary):
        service_specs = [
            # Required lab services
            {"code": "LAB-CBC", "name": "CBC", "category_key": "lab", "tat": 12},
            {"code": "LAB-LFT", "name": "LFT", "category_key": "lab", "tat": 18},
            {"code": "LAB-KFT", "name": "KFT", "category_key": "lab", "tat": 18},
            {"code": "LAB-LIPID", "name": "Lipid Profile", "category_key": "lab", "tat": 24},
            {"code": "LAB-THYROID", "name": "Thyroid Profile", "category_key": "lab", "tat": 24},
            # Additional realistic lab services
            {"code": "LAB-HBA1C", "name": "HbA1c", "category_key": "lab", "tat": 24},
            {"code": "LAB-CRP", "name": "C-Reactive Protein (CRP)", "category_key": "lab", "tat": 16},
            {"code": "LAB-D3", "name": "Vitamin D (25-OH)", "category_key": "lab", "tat": 24},
            # Required radiology services
            {"code": "RAD-XR-CHEST", "name": "X-Ray Chest", "category_key": "radiology", "tat": 6},
            {"code": "RAD-XR-KNEE", "name": "X-Ray Knee", "category_key": "radiology", "tat": 8},
            # Additional radiology service
            {"code": "RAD-MAMMOGRAM", "name": "Mammography", "category_key": "radiology", "tat": 24},
            # Required scan services
            {"code": "SCAN-MRI-BRAIN", "name": "MRI Brain", "category_key": "scan", "tat": 24},
            {"code": "SCAN-CT-ABDOMEN", "name": "CT Abdomen", "category_key": "scan", "tat": 18},
            {"code": "SCAN-USG-PELVIS", "name": "Ultrasound Pelvis", "category_key": "scan", "tat": 12},
            # Additional scan services
            {"code": "SCAN-ECHO", "name": "2D Echo", "category_key": "scan", "tat": 10},
            {"code": "SCAN-DOPPLER", "name": "Doppler Study", "category_key": "scan", "tat": 14},
            # Required package services
            {"code": "PKG-DIABETES", "name": "Diabetes Panel", "category_key": "package", "tat": 24},
            {"code": "PKG-FULLBODY", "name": "Full Body Checkup", "category_key": "package", "tat": 36},
            {"code": "PKG-CARDIAC", "name": "Cardiac Package", "category_key": "package", "tat": 30},
        ]

        services = {}
        for spec in service_specs:
            category = categories[spec["category_key"]]
            defaults = {
                "name": spec["name"],
                "category": category,
                "tat_hours_default": spec["tat"],
                "is_active": True,
                "home_collection_possible": spec["category_key"] in {"lab", "package"},
                "appointment_required": spec["category_key"] in {"radiology", "scan"},
            }
            service, created = DiagnosticServiceMaster.objects.get_or_create(
                code=spec["code"],
                defaults=defaults,
            )

            if created:
                summary["services_created"] += 1
            else:
                summary["services_reused"] += 1
                fields_to_update = []
                for field_name, field_value in defaults.items():
                    if getattr(service, field_name) != field_value:
                        setattr(service, field_name, field_value)
                        fields_to_update.append(field_name)

                if fields_to_update:
                    service.save(update_fields=fields_to_update + ["updated_at"])

            services[spec["code"]] = service

        return services

    def _seed_providers_and_branches(self, summary):
        provider_specs = [
            {
                "code": "PROV-DRLALPATH",
                "name": "Dr Lal PathLabs",
                "branches": [
                    {
                        "branch_code": "DLP-DEL-01",
                        "branch_name": "Lajpat Nagar",
                        "contact_number": "+91-1145627800",
                        "email": "lajpat@drlalpathlabs.example",
                        "address_line_1": "Central Market, Lajpat Nagar",
                        "city": "New Delhi",
                        "state": "Delhi",
                        "pincode": "110024",
                        "home_collection_supported": True,
                    },
                    {
                        "branch_code": "DLP-JPR-01",
                        "branch_name": "Vaishali Nagar",
                        "contact_number": "+91-1416123400",
                        "email": "vaishali@drlalpathlabs.example",
                        "address_line_1": "Amrapali Circle, Vaishali Nagar",
                        "city": "Jaipur",
                        "state": "Rajasthan",
                        "pincode": "302021",
                        "home_collection_supported": True,
                    },
                ],
            },
            {
                "code": "PROV-METROPOLIS",
                "name": "Metropolis Healthcare",
                "branches": [
                    {
                        "branch_code": "MET-MUM-01",
                        "branch_name": "Andheri East",
                        "contact_number": "+91-2240012300",
                        "email": "andheri@metropolis.example",
                        "address_line_1": "MIDC Road, Andheri East",
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "pincode": "400093",
                        "home_collection_supported": True,
                    },
                    {
                        "branch_code": "MET-PUN-01",
                        "branch_name": "Aundh",
                        "contact_number": "+91-2067123400",
                        "email": "aundh@metropolis.example",
                        "address_line_1": "ITI Road, Aundh",
                        "city": "Pune",
                        "state": "Maharashtra",
                        "pincode": "411007",
                        "home_collection_supported": True,
                    },
                ],
            },
            {
                "code": "PROV-THYROCARE",
                "name": "Thyrocare Diagnostics",
                "branches": [
                    {
                        "branch_code": "THY-BLR-01",
                        "branch_name": "Koramangala",
                        "contact_number": "+91-8045632100",
                        "email": "koramangala@thyrocare.example",
                        "address_line_1": "80 Feet Road, Koramangala",
                        "city": "Bengaluru",
                        "state": "Karnataka",
                        "pincode": "560034",
                        "home_collection_supported": True,
                    }
                ],
            },
        ]

        branches = []
        for provider_spec in provider_specs:
            provider_defaults = {"name": provider_spec["name"], "is_active": True}
            provider, provider_created = DiagnosticProvider.objects.get_or_create(
                code=provider_spec["code"],
                defaults=provider_defaults,
            )
            if provider_created:
                summary["providers_created"] += 1
            else:
                summary["providers_reused"] += 1
                provider_fields_to_update = []
                for field_name, field_value in provider_defaults.items():
                    if getattr(provider, field_name) != field_value:
                        setattr(provider, field_name, field_value)
                        provider_fields_to_update.append(field_name)
                if provider_fields_to_update:
                    provider.save(update_fields=provider_fields_to_update + ["updated_at"])

            for branch_spec in provider_spec["branches"]:
                branch_defaults = {
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
                }
                branch, branch_created = DiagnosticProviderBranch.objects.get_or_create(
                    provider=provider,
                    branch_code=branch_spec["branch_code"],
                    defaults=branch_defaults,
                )
                if branch_created:
                    summary["branches_created"] += 1
                else:
                    summary["branches_reused"] += 1
                    branch_fields_to_update = []
                    for field_name, field_value in branch_defaults.items():
                        if getattr(branch, field_name) != field_value:
                            setattr(branch, field_name, field_value)
                            branch_fields_to_update.append(field_name)
                    if branch_fields_to_update:
                        branch.save(update_fields=branch_fields_to_update + ["updated_at"])

                branches.append(branch)

        return branches

    def _seed_packages(self, categories, services, summary):
        package_specs = [
            {
                "lineage_code": "DIABETES-PANEL",
                "name": "Diabetes Panel",
                "service_code": "PKG-DIABETES",
                "description": "Focused panel for diabetic monitoring and metabolic risk.",
                "collection_type": CollectionType.HOME,
                "package_type": PackageType.SYSTEM,
                "min_tat_hours": 12,
                "max_tat_hours": 24,
                "fasting_required": True,
                "tags": ["diabetes", "metabolic", "preventive"],
                "conditions_supported": ["diabetes", "prediabetes", "obesity"],
                "items": [
                    {"service_code": "LAB-HBA1C", "display_order": 10, "quantity": 1, "is_mandatory": True},
                    {"service_code": "LAB-LIPID", "display_order": 20, "quantity": 1, "is_mandatory": True},
                    {"service_code": "LAB-CRP", "display_order": 30, "quantity": 1, "is_mandatory": False},
                ],
            },
            {
                "lineage_code": "FULL-BODY-CHECKUP",
                "name": "Full Body Checkup",
                "service_code": "PKG-FULLBODY",
                "description": "Comprehensive preventive package across lab and imaging.",
                "collection_type": CollectionType.BOTH,
                "package_type": PackageType.SYSTEM,
                "min_tat_hours": 24,
                "max_tat_hours": 36,
                "fasting_required": True,
                "tags": ["full-body", "wellness", "annual-checkup"],
                "conditions_supported": ["preventive", "lifestyle-disorders"],
                "items": [
                    {"service_code": "LAB-CBC", "display_order": 10, "quantity": 1, "is_mandatory": True},
                    {"service_code": "LAB-LFT", "display_order": 20, "quantity": 1, "is_mandatory": True},
                    {"service_code": "LAB-KFT", "display_order": 30, "quantity": 1, "is_mandatory": True},
                    {"service_code": "LAB-THYROID", "display_order": 40, "quantity": 1, "is_mandatory": True},
                    {"service_code": "RAD-XR-CHEST", "display_order": 50, "quantity": 1, "is_mandatory": True},
                    {"service_code": "SCAN-USG-PELVIS", "display_order": 60, "quantity": 1, "is_mandatory": False},
                ],
            },
            {
                "lineage_code": "CARDIAC-PACKAGE",
                "name": "Cardiac Package",
                "service_code": "PKG-CARDIAC",
                "description": "Risk-screening package for cardiovascular health.",
                "collection_type": CollectionType.BOTH,
                "package_type": PackageType.SYSTEM,
                "min_tat_hours": 18,
                "max_tat_hours": 30,
                "fasting_required": False,
                "tags": ["cardiac", "heart-risk", "cholesterol"],
                "conditions_supported": ["hypertension", "cardiovascular-risk"],
                "items": [
                    {"service_code": "LAB-CBC", "display_order": 10, "quantity": 1, "is_mandatory": True},
                    {"service_code": "LAB-LIPID", "display_order": 20, "quantity": 1, "is_mandatory": True},
                    {"service_code": "LAB-CRP", "display_order": 30, "quantity": 1, "is_mandatory": True},
                    {"service_code": "SCAN-ECHO", "display_order": 40, "quantity": 1, "is_mandatory": True},
                ],
            },
        ]

        packages = {}
        for spec in package_specs:
            package_defaults = {
                "name": spec["name"],
                "description": spec["description"],
                "category": categories["package"],
                "is_active": True,
                "is_latest": True,
                "collection_type": spec["collection_type"],
                "package_type": spec["package_type"],
                "min_tat_hours": spec["min_tat_hours"],
                "max_tat_hours": spec["max_tat_hours"],
                "fasting_required": spec["fasting_required"],
                "tags": spec["tags"],
                "conditions_supported": spec["conditions_supported"],
            }
            package, created = DiagnosticPackage.objects.get_or_create(
                lineage_code=spec["lineage_code"],
                version=1,
                defaults=package_defaults,
            )
            if created:
                summary["packages_created"] += 1
            else:
                summary["packages_reused"] += 1
                package_fields_to_update = []
                for field_name, field_value in package_defaults.items():
                    if getattr(package, field_name) != field_value:
                        setattr(package, field_name, field_value)
                        package_fields_to_update.append(field_name)
                if package_fields_to_update:
                    package.save(update_fields=package_fields_to_update + ["updated_at"])

            for item_spec in spec["items"]:
                item_defaults = {
                    "quantity": item_spec["quantity"],
                    "is_mandatory": item_spec["is_mandatory"],
                    "display_order": item_spec["display_order"],
                }
                package_item, item_created = DiagnosticPackageItem.objects.filter(
                    deleted_at__isnull=True
                ).get_or_create(
                    package=package,
                    service=services[item_spec["service_code"]],
                    defaults=item_defaults,
                )
                if item_created:
                    summary["package_items_created"] += 1
                else:
                    summary["package_items_reused"] += 1
                    item_fields_to_update = []
                    for field_name, field_value in item_defaults.items():
                        if getattr(package_item, field_name) != field_value:
                            setattr(package_item, field_name, field_value)
                            item_fields_to_update.append(field_name)
                    if item_fields_to_update:
                        package_item.save(update_fields=item_fields_to_update + ["updated_at"])

            packages[spec["service_code"]] = package

        return packages

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
            for service_code, selling_price in service_prices.items():
                service = services[service_code]
                platform_margin = (selling_price * Decimal("0.08")).quantize(Decimal("0.01"))
                doctor_margin = (selling_price * Decimal("0.06")).quantize(Decimal("0.01"))
                cost_price = (selling_price * Decimal("0.62")).quantize(Decimal("0.01"))
                lab_payout = (selling_price - platform_margin - doctor_margin).quantize(
                    Decimal("0.01")
                )

                defaults = {
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
                pricing, created = BranchServicePricing.objects.get_or_create(
                    branch=branch,
                    service=service,
                    is_active=True,
                    defaults=defaults,
                )

                if created:
                    summary["pricing_created"] += 1
                    continue

                summary["pricing_reused"] += 1
                fields_to_update = []
                for field_name, field_value in defaults.items():
                    if getattr(pricing, field_name) != field_value:
                        setattr(pricing, field_name, field_value)
                        fields_to_update.append(field_name)

                if pricing.valid_to and pricing.valid_to < pricing.valid_from:
                    pricing.valid_to = None
                    fields_to_update.append("valid_to")

                if fields_to_update:
                    pricing.full_clean()
                    pricing.save(update_fields=fields_to_update + ["updated_at"])
                    summary["pricing_updated"] += 1

    def _seed_branch_package_pricing(self, branches, packages, summary):
        package_prices = {
            "PKG-DIABETES": {"selling_price": Decimal("1499.00"), "mrp": Decimal("1899.00")},
            "PKG-FULLBODY": {"selling_price": Decimal("3999.00"), "mrp": Decimal("4999.00")},
            "PKG-CARDIAC": {"selling_price": Decimal("4599.00"), "mrp": Decimal("5699.00")},
        }

        for branch in branches:
            for service_code, price_meta in package_prices.items():
                selling_price = price_meta["selling_price"]
                mrp = price_meta["mrp"]
                platform_margin = (selling_price * Decimal("0.08")).quantize(Decimal("0.01"))
                doctor_margin = (selling_price * Decimal("0.06")).quantize(Decimal("0.01"))
                lab_payout = (selling_price - platform_margin - doctor_margin).quantize(
                    Decimal("0.01")
                )

                defaults = {
                    "mrp": mrp,
                    "selling_price": selling_price,
                    "platform_margin_type": CommissionType.FLAT,
                    "platform_margin_value": platform_margin,
                    "doctor_commission_type": CommissionType.FLAT,
                    "doctor_commission_value": doctor_margin,
                    "lab_payout_snapshot": lab_payout,
                }
                pricing, created = BranchPackagePricing.objects.get_or_create(
                    branch=branch,
                    package=packages[service_code],
                    is_active=True,
                    defaults=defaults,
                )
                if created:
                    summary["package_pricing_created"] += 1
                    continue

                summary["package_pricing_reused"] += 1
                fields_to_update = []
                for field_name, field_value in defaults.items():
                    if getattr(pricing, field_name) != field_value:
                        setattr(pricing, field_name, field_value)
                        fields_to_update.append(field_name)

                if pricing.valid_to and pricing.valid_to < pricing.valid_from:
                    pricing.valid_to = None
                    fields_to_update.append("valid_to")

                if fields_to_update:
                    pricing.full_clean()
                    pricing.save(update_fields=fields_to_update + ["updated_at"])
                    summary["package_pricing_updated"] += 1

    def _print_summary(self, summary, dry_run):
        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(self.style.SUCCESS(f"Investigation diagnostics data seed: {mode}"))
        self.stdout.write("-" * 64)
        self.stdout.write(
            "Categories -> created: {created}, reused: {reused}".format(
                created=summary["categories_created"],
                reused=summary["categories_reused"],
            )
        )
        self.stdout.write(
            "Services   -> created: {created}, reused: {reused}".format(
                created=summary["services_created"],
                reused=summary["services_reused"],
            )
        )
        self.stdout.write(
            "Packages   -> created: {created}, reused: {reused}".format(
                created=summary["packages_created"],
                reused=summary["packages_reused"],
            )
        )
        self.stdout.write(
            "Pkg Items  -> created: {created}, reused: {reused}".format(
                created=summary["package_items_created"],
                reused=summary["package_items_reused"],
            )
        )
        self.stdout.write(
            "Providers  -> created: {created}, reused: {reused}".format(
                created=summary["providers_created"],
                reused=summary["providers_reused"],
            )
        )
        self.stdout.write(
            "Branches   -> created: {created}, reused: {reused}".format(
                created=summary["branches_created"],
                reused=summary["branches_reused"],
            )
        )
        self.stdout.write(
            "Pricing    -> created: {created}, reused: {reused}, updated: {updated}".format(
                created=summary["pricing_created"],
                reused=summary["pricing_reused"],
                updated=summary["pricing_updated"],
            )
        )
        self.stdout.write(
            "Pkg Price  -> created: {created}, reused: {reused}, updated: {updated}".format(
                created=summary["package_pricing_created"],
                reused=summary["package_pricing_reused"],
                updated=summary["package_pricing_updated"],
            )
        )
