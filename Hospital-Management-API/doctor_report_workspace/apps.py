from django.apps import AppConfig


class DoctorReportWorkspaceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "doctor_report_workspace"
    verbose_name = "Doctor Report Workspace"

    def ready(self):
        import doctor_report_workspace.signals  # noqa: F401
