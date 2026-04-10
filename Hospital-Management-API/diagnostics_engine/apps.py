from django.apps import AppConfig


class DiagnosticsEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'diagnostics_engine'

    def ready(self):
        # Register cache invalidation signal handlers.
        import diagnostics_engine.signals  # noqa: F401
