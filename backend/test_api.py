#!/usr/bin/env python
import os
import sys
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

print("=" * 60)
print("Backend Diagnostics")
print("=" * 60)

# Check Gemini API Key
print("\n1. GEMINI_API_KEY Configuration:")
gemini_key = os.getenv('GEMINI_API_KEY')
if gemini_key:
    print(f"   ✓ Found: {gemini_key[:20]}...")
else:
    print("   ✗ NOT CONFIGURED!")

# Check Django settings
print("\n2. Django Settings:")
print(f"   DEBUG: {settings.DEBUG}")
print(f"   ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")

# Test API endpoint
print("\n3. Testing API Endpoint:")
try:
    response = requests.get('http://127.0.0.1:8000/api/v1/hospital/test-gemini/')
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"   ✗ Error: {str(e)}")

# Test Gemini connection
print("\n4. Testing Gemini API Connection:")
try:
    import google.generativeai as genai
    if gemini_key:
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("   ✓ Gemini API is configured and ready")
    else:
        print("   ✗ API Key not configured")
except Exception as e:
    print(f"   ✗ Error: {str(e)}")

print("\n" + "=" * 60)
