"""
Management command to completely reset database:
- Keep superuser and license-related data
- Delete all other occupational health data
- Prepare for fresh seed
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model
from django.apps import apps
import sys

User = get_user_model()


class Command(BaseCommand):
    help = 'Reset database: keep superuser and licenses, delete everything else'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation and proceed with reset',
        )

    def handle(self, *args, **options):
        confirm = options['confirm']

        self.stdout.write(self.style.WARNING('═' * 60))
        self.stdout.write(self.style.WARNING('🔄 DATABASE RESET: Complete Cleanup + Prepare for Fresh Seed'))
        self.stdout.write(self.style.WARNING('═' * 60 + '\n'))

        # Get all superusers
        superusers = User.objects.filter(is_superuser=True)
        self.stdout.write(self.style.SUCCESS(f'✓ Superusers to keep: {superusers.count()}'))
        for su in superusers:
            self.stdout.write(f'  • {su.id}: {su.username or "No username"}')

        # Confirmation
        if not confirm:
            self.stdout.write(self.style.WARNING('\n⚠️  This will DELETE most database content!'))
            self.stdout.write(self.style.WARNING('  Kept: Superuser(s), License data'))
            self.stdout.write(self.style.WARNING('  Deleted: All occupational health data, workers, exams, etc.\n'))
            response = input('Type "yes" to proceed: ')
            if response.lower() != 'yes':
                self.stdout.write(self.style.WARNING('❌ Reset cancelled'))
                return

        self.stdout.write(self.style.WARNING('\n🗑️  Deleting data...\n'))

        try:
            with transaction.atomic():
                # Get all models - identify which to delete
                models_to_delete = [
                    'occupational_health.MedicalExamination',
                    'occupational_health.VitalSigns',
                    'occupational_health.PhysicalExamination',
                    'occupational_health.AudiometryResult',
                    'occupational_health.SpirometryResult',
                    'occupational_health.VisionTestResult',
                    'occupational_health.MentalHealthScreening',
                    'occupational_health.ErgonomicAssessment',
                    'occupational_health.HeavyMetalsTest',
                    'occupational_health.DrugAlcoholScreening',
                    'occupational_health.XrayImagingResult',
                    'occupational_health.FitnessCertificate',
                    'occupational_health.WorkplaceIncident',
                    'occupational_health.OccupationalDisease',
                    'occupational_health.Worker',
                    'occupational_health.WorkSite',
                    'occupational_health.Enterprise',
                ]

                total_deleted = 0

                for model_label in models_to_delete:
                    try:
                        Model = apps.get_model(model_label)
                        count, _ = Model.objects.all().delete()
                        if count > 0:
                            self.stdout.write(f'  ✓ Deleted {count:>4} {model_label}')
                            total_deleted += count
                    except LookupError:
                        pass
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'  ⚠️  {model_label}: {str(e)}'))

                self.stdout.write(self.style.SUCCESS(f'\n✓ Total objects deleted: {total_deleted}'))

                # Delete non-superuser/admin users
                non_su_users = User.objects.filter(is_superuser=False)
                user_count = non_su_users.count()
                if user_count > 0:
                    non_su_users.delete()
                    self.stdout.write(f'  ✓ Deleted {user_count} non-admin users')

                self.stdout.write(self.style.SUCCESS(f'\n✓✓ Reset complete! Database prepared for fresh seed.'))
                self.stdout.write(self.style.SUCCESS(f'   Superuser(s) preserved: {superusers.count()}'))
                self.stdout.write(self.style.WARNING(f'\n📋 Next steps:'))
                self.stdout.write(f'  1. Run: python manage.py seed_kcc_fresh')
                self.stdout.write(f'     (creates admin, doctor, nurse users + KCC workers)')
                self.stdout.write(f'  2. Start server: python manage.py runserver\n')

        except Exception as e:
            raise CommandError(f'❌ Error during reset: {str(e)}')
