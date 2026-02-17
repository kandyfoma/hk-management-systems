"""
Occupational Health Django App Configuration

App configuration for the comprehensive multi-sector occupational health
management system with signal registration.
"""
from django.apps import AppConfig


class OccupationalHealthConfig(AppConfig):
    """Configuration for Occupational Health app"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.occupational_health'
    verbose_name = 'Médecine du Travail'
    
    def ready(self):
        """Initialize app when Django starts"""
        # Import signals to ensure they are registered
        try:
            import apps.occupational_health.signals  # noqa
        except ImportError:
            pass