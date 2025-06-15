from django.apps import AppConfig


class PatientAccountConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'patient_account'
    def ready(self):
        import patient_account.signals
