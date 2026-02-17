import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from phonenumber_field.phonenumber import PhoneNumber

User = get_user_model()

# Check if admin user exists
try:
    admin = User.objects.get(phone='+243123456789')
    print(f'✅ Admin user found:')
    print(f'   Phone: {admin.phone} (type: {type(admin.phone).__name__})')
    print(f'   Email: {admin.email}')
    print(f'   Is superuser: {admin.is_superuser}')
    print(f'   Is staff: {admin.is_staff}')
    print(f'   Is active: {admin.is_active}')
    
    # Try authenticating
    from django.contrib.auth import authenticate
    user = authenticate(username='+243123456789', password='adminadmin')
    if user:
        print(f'✅ Authentication successful')
    else:
        print(f'❌ Authentication failed - password may be incorrect')
        # Try with username field
        user = authenticate(phone='+243123456789', password='adminadmin')
        if user:
            print(f'✅ Authentication successful with phone field')
        else:
            print(f'❌ Authentication failed with phone field too')
except User.DoesNotExist:
    print('❌ Admin user not found')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
