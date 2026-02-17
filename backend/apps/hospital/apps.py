from django.apps import AppConfig


class HospitalConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.hospital'
    verbose_name = 'Hôpital'
    
    def ready(self):
        import apps.hospital.signals