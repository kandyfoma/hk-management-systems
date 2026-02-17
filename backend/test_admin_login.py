"""Test admin login by simulating the form submission"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import requests

BASE_URL = 'http://127.0.0.1:8000'
LOGIN_URL = f'{BASE_URL}/admin/login/'

session = requests.Session()

# Step 1: GET the login page to get CSRF token
print("Step 1: GET login page...")
try:
    resp = session.get(LOGIN_URL, timeout=5)
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"  ERROR: Got status {resp.status_code}")
        print(f"  Body: {resp.text[:500]}")
    else:
        # Extract CSRF token from cookies
        csrf_token = session.cookies.get('csrftoken', '')
        print(f"  CSRF token: {csrf_token[:20]}...")
        
        # Step 2: POST login
        print("\nStep 2: POST login with credentials...")
        data = {
            'username': '+243123456789',
            'password': 'adminadmin',
            'csrfmiddlewaretoken': csrf_token,
            'next': '/admin/',
        }
        headers = {
            'Referer': LOGIN_URL,
        }
        resp2 = session.post(LOGIN_URL, data=data, headers=headers, allow_redirects=False, timeout=5)
        print(f"  Status: {resp2.status_code}")
        print(f"  Location: {resp2.headers.get('Location', 'N/A')}")
        
        if resp2.status_code == 302:
            print("  SUCCESS! Login redirected (login worked)")
        elif resp2.status_code == 200:
            # Check for error message in response
            if 'errorlist' in resp2.text or 'Please enter the correct' in resp2.text:
                print("  FAILED: Wrong credentials error in form")
                # Print the error
                import re
                errors = re.findall(r'<li>(.*?)</li>', resp2.text)
                for e in errors:
                    print(f"    Error: {e}")
            else:
                print("  Got 200 but no error messages found")
        else:
            print(f"  Unexpected status: {resp2.status_code}")
            print(f"  Body: {resp2.text[:500]}")
except requests.ConnectionError:
    print("  ERROR: Cannot connect to server! Is it running?")
except Exception as e:
    print(f"  ERROR: {e}")
    import traceback
    traceback.print_exc()
