from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.audit.models import AuditLog, PharmacyAuditLog


class Command(BaseCommand):
    help = 'Clean up old audit log entries'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help='Number of days to retain audit logs (default: 365)',
        )
        parser.add_argument(
            '--keep-critical',
            action='store_true',
            help='Keep critical severity logs regardless of age',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
    
    def handle(self, *args, **options):
        days_to_keep = options['days']
        keep_critical = options['keep_critical']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)
        
        self.stdout.write(
            f'Cleaning up audit logs older than {days_to_keep} days '
            f'(before {cutoff_date.date()})...'
        )
        
        # Build the query
        query = AuditLog.objects.filter(timestamp__lt=cutoff_date)
        
        if keep_critical:
            query = query.exclude(severity='CRITICAL')
            self.stdout.write('Preserving critical severity logs')
        
        # Count what would be deleted
        count = query.count()
        
        if count == 0:
            self.stdout.write('No audit logs found for cleanup')
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {count} audit log entries'
                )
            )
            
            # Show breakdown by severity
            severity_breakdown = query.values('severity').annotate(
                count=models.Count('id')
            ).order_by('severity')
            
            for item in severity_breakdown:
                self.stdout.write(
                    f'  - {item["severity"]}: {item["count"]} entries'
                )
        else:
            # Perform the deletion
            deleted_count, _ = query.delete()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully deleted {deleted_count} audit log entries'
                )
            )
        
        # Also clean up orphaned PharmacyAuditLog entries
        orphaned_pharmacy_logs = PharmacyAuditLog.objects.filter(
            audit_log__isnull=True
        )
        
        orphaned_count = orphaned_pharmacy_logs.count()
        if orphaned_count > 0:
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f'DRY RUN: Would delete {orphaned_count} orphaned pharmacy audit entries'
                    )
                )
            else:
                orphaned_pharmacy_logs.delete()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Deleted {orphaned_count} orphaned pharmacy audit entries'
                    )
                )