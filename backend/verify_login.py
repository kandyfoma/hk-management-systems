import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from django.contrib.auth import authenticate

# Check user exists
try:
    user = User.objects.get(phone='+243123456789')
    print(f'User found: {user.first_name} {user.last_name}')
    print(f'Phone: {user.phone}')
    print(f'Is active: {user.is_active}')
    print(f'Is staff: {user.is_staff}')
    print(f'Is superuser: {user.is_superuser}')
    print(f'Password usable: {user.has_usable_password()}')
    pwd_ok = user.check_password("adminadmin")
    print(f'Password check (adminadmin): {pwd_ok}')
    print()
    
    # Test authenticate with username kwarg (what admin form sends)
    result = authenticate(username='+243123456789', password='adminadmin')
    print(f'authenticate(username=phone) result: {result}')
    
except User.DoesNotExist:
    print('User NOT FOUND!')
    print('All users:')
    for u in User.objects.all():
        print(f'  {u.phone} - {u.first_name} {u.last_name} - staff={u.is_staff} super={u.is_superuser}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
