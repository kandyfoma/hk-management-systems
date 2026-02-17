#!/usr/bin/env python
"""
Script to create superuser admin with password adminadmin
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

# Create or get organization
org, created = Organization.objects.get_or_create(
    name='HK Management System',
    defaults={
        'type': OrganizationType.HOSPITAL,
        'registration_number': 'HK-001',
        'address': 'Kinshasa, DRC',
        'email': 'admin@hkmanagement.com',
        'phone': '+243123456789',
        'is_active': True,
    }
)

# Check if superuser already exists
if User.objects.filter(phone='+243123456789').exists():
    user = User.objects.get(phone='+243123456789')
    user.set_password('adminadmin')
    user.save()
    print('✅ Superuser password updated successfully:')
else:
    # Create superuser
    user = User.objects.create_superuser(
        phone='+243123456789',
        email='admin@hkmanagement.com',
        password='adminadmin',
        first_name='Admin',
        last_name='User',
        primary_role=UserRole.ADMIN,
        organization=org,
    )
    print('✅ Superuser created successfully:')

print(f'   Phone: +243123456789')
print(f'   Email: admin@hkmanagement.com')
print(f'   Password: adminadmin')
print(f'   Organization: {org.name}')
