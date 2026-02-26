"""
Management command to clean up database: keep only KCC enterprise and workers,
delete all other enterprises and their related data.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.occupational_health.models import Enterprise, Worker, WorkSite, MedicalExamination
from django.conf import settings


class Command(BaseCommand):
    help = 'Clean database: keep only KCC enterprise and workers, delete all others'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt and proceed with deletion',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        confirm = options['confirm']

        self.stdout.write(self.style.WARNING('=== Database Cleanup: KCC Only ===\n'))

        # Find all KCC enterprises
        kcc_enterprises = Enterprise.objects.filter(name__istartswith='kcc')
        
        if not kcc_enterprises.exists():
            raise CommandError('❌ No KCC enterprise found. Please verify the name.')
        
        self.stdout.write(self.style.SUCCESS(f'✓ Found {kcc_enterprises.count()} KCC enterprises:'))
        for kcc in kcc_enterprises:
            kcc_workers = Worker.objects.filter(enterprise=kcc).count()
            self.stdout.write(f'  • {kcc.name} (ID: {kcc.id}) — {kcc_workers} workers')

        # Get all other enterprises
        other_enterprises = Enterprise.objects.exclude(name__istartwith='kcc')
        
        if not other_enterprises.exists():
            self.stdout.write(self.style.SUCCESS('\n✓ Already clean: only KCC enterprise exists'))
            return

        # Count data to be deleted
        other_workers = Worker.objects.filter(enterprise__in=other_enterprises).count()
        other_worksites = WorkSite.objects.filter(enterprise__in=other_enterprises).count()
        other_exams = MedicalExamination.objects.filter(worker__enterprise__in=other_enterprises).count()

        self.stdout.write(self.style.WARNING(f'\n📊 Data to delete:'))
        self.stdout.write(f'  • Enterprises: {other_enterprises.count()}')
        self.stdout.write(f'  • Work Sites: {other_worksites}')
        self.stdout.write(f'  • Workers: {other_workers}')
        self.stdout.write(f'  • Medical Examinations: {other_exams}')

        self.stdout.write(self.style.WARNING(f'\n🔒 Data to keep:'))
        kcc_workers = Worker.objects.filter(enterprise__in=kcc_enterprises).count()
        kcc_worksites = WorkSite.objects.filter(enterprise__in=kcc_enterprises).count()
        kcc_exams = MedicalExamination.objects.filter(worker__enterprise__in=kcc_enterprises).count()
        self.stdout.write(f'  • KCC Enterprises: {kcc_enterprises.count()}')
        self.stdout.write(f'  • KCC Work Sites: {kcc_worksites}')
        self.stdout.write(f'  • KCC Workers: {kcc_workers}')
        self.stdout.write(f'  • KCC Examinations: {kcc_exams}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] No changes made'))
            return

        # Confirmation
        if not confirm:
            self.stdout.write(self.style.WARNING('\n⚠️  This action CANNOT be undone!'))
            response = input('Type "yes" to proceed with deletion: ')
            if response.lower() != 'yes':
                self.stdout.write(self.style.WARNING('❌ Deletion cancelled'))
                return

        # Perform deletion
        self.stdout.write(self.style.WARNING('\n🗑️  Deleting non-KCC data...'))
        
        try:
            with transaction.atomic():
                # Delete cascades will handle related data
                deleted_count, delete_details = other_enterprises.delete()
                
                self.stdout.write(self.style.SUCCESS(f'\n✓ Deletion complete!'))
                self.stdout.write(f'  Total objects deleted: {deleted_count}')
                self.stdout.write(f'  Details: {delete_details}')
                
                # Verify
                remaining_enterprises = Enterprise.objects.count()
                remaining_workers = Worker.objects.count()
                self.stdout.write(self.style.SUCCESS(f'\n✓ Verification:'))
                self.stdout.write(f'  • Enterprises remaining: {remaining_enterprises}')
                self.stdout.write(f'  • Workers remaining: {remaining_workers}')
                
                if remaining_enterprises == 1 and Worker.objects.filter(enterprise=kcc).count() == kcc_workers:
                    self.stdout.write(self.style.SUCCESS(f'\n✓✓✓ Database cleaned successfully! KCC data preserved.'))
                else:
                    self.stdout.write(self.style.WARNING(f'\n⚠️  Verification failed - check data integrity'))
                    
        except Exception as e:
            raise CommandError(f'❌ Error during deletion: {str(e)}')
