import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model

User = get_user_model()

# Test authentication
print("Testing authentication with custom PhoneNumberAuthBackend...")

user = authenticate(username='+243123456789', password='adminadmin')
if user:
    print(f'✅ Authentication successful!')
    print(f'   User: {user.full_name}')
    print(f'   Phone: {user.phone}')
    print(f'   Is superuser: {user.is_superuser}')
else:
    print(f'❌ Authentication failed')
    print(f'   Checking admin user directly...')
    try:
        admin = User.objects.get(phone='+243123456789')
        print(f'   Admin exists and is active: {admin.is_active}')
        print(f'   Password check: {admin.check_password("adminadmin")}')
    except:
        print(f'   Admin not found')
