#!/usr/bin/env python
"""
Script to create superuser admin with phone +243828812498 and password adminadmin
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationType
from apps.accounts.models import UserRole

User = get_user_model()

try:
    print("[*] Creating superuser admin account...")
    print("[*] Phone: +243828812498")
    print("[*] Email: admin@hkmanagement.com")
    print("[*] Role: ADMIN")
    
    # Create or get organization
    print("[*] Creating/getting organization...")
    org, created = Organization.objects.get_or_create(
        name='KAT Management System',
        defaults={
            'type': OrganizationType.HOSPITAL,
            'registration_number': 'KAT-001',
            'address': 'Kinshasa, DRC',
            'email': 'admin@hkmanagement.com',
            'phone': '+243828812498',
            'is_active': True,
        }
    )
    if created:
        print("[✓] Organization created")
    else:
        print("[✓] Organization already exists")
    
    # Check if superuser already exists
    print("[*] Checking if user already exists...")
    if User.objects.filter(phone='+243828812498').exists():
        print("[✓] User exists, updating password...")
        user = User.objects.get(phone='+243828812498')
        user.set_password('adminadmin')
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.save()
        print('✅ Superuser password updated successfully')
    else:
        print("[*] Creating new superuser...")
        # Use create() directly since the custom User model uses phone instead of username
        # Must include organization_id at creation time (NOT NULL constraint)
        user = User.objects.create(
            phone='+243828812498',
            email='admin@hkmanagement.com',
            first_name='Admin',
            last_name='User',
            primary_role=UserRole.ADMIN,
            organization=org,  # Pass organization at creation time
            is_superuser=True,
            is_staff=True,
            is_active=True,
        )
        user.set_password('adminadmin')
        user.save()
        print('✅ Superuser created successfully')
    
    print(f'[✓] Phone: +243828812498')
    print(f'[✓] Password: adminadmin')
    print(f'[✓] Email: admin@hkmanagement.com')
    print(f'[✓] Role: Super Administrator')
    print(f'[✓] is_superuser: {user.is_superuser}')
    print(f'[✓] is_staff: {user.is_staff}')
    
except Exception as e:
    print(f"❌ Error creating superuser: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
