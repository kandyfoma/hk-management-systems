#!/usr/bin/env python
"""
Railway Deployment Pre-Flight Check
Validates that the backend is ready for Railway deployment.

Usage:
  python verify_railway_setup.py
"""

import os
import sys
import json
from pathlib import Path

def check_file_exists(path, name):
    """Check if a required file exists."""
    if Path(path).exists():
        print(f"✓ {name}: {path}")
        return True
    else:
        print(f"✗ {name}: {path} (NOT FOUND)")
        return False

def check_file_content(path, search_text, name):
    """Check if a file contains required content."""
    if not Path(path).exists():
        print(f"✗ {name}: File not found")
        return False
    
    with open(path, 'r') as f:
        content = f.read()
        if search_text in content:
            print(f"✓ {name}")
            return True
        else:
            print(f"✗ {name}: Required text not found")
            return False

def check_requirements():
    """Check if all production dependencies are in requirements.txt."""
    required = ['gunicorn', 'psycopg2-binary', 'dj-database-url', 'whitenoise']
    path = Path('requirements.txt')
    
    if not path.exists():
        print("✗ requirements.txt: File not found")
        return False
    
    with open(path, 'r') as f:
        content = f.read()
    
    all_found = True
    for pkg in required:
        if pkg in content:
            print(f"  ✓ {pkg}")
        else:
            print(f"  ✗ {pkg} (MISSING)")
            all_found = False
    
    return all_found

def check_django_settings():
    """Check if Django settings are Railway-ready."""
    settings_path = Path('config/settings.py')
    checks = [
        ('SECURE_PROXY_SSL_HEADER', 'Proxy SSL configuration'),
        ('dj_database_url', 'Database URL parsing'),
        ('STATICFILES_STORAGE.*Whitenoise', 'WhiteNoise static files'),
        ('ALLOWED_HOSTS', 'ALLOWED_HOSTS configuration'),
    ]
    
    if not settings_path.exists():
        print("✗ config/settings.py: File not found")
        return False
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    all_found = True
    for pattern, name in checks:
        if pattern in content:
            print(f"  ✓ {name}")
        else:
            print(f"  ⚠ {name}: Not clearly found (may need review)")
    
    return all_found

def validate_json(path, name):
    """Validate JSON file syntax."""
    if not Path(path).exists():
        print(f"✗ {name}: File not found")
        return False
    
    try:
        with open(path, 'r') as f:
            json.load(f)
        print(f"✓ {name}: Valid JSON")
        return True
    except json.JSONDecodeError as e:
        print(f"✗ {name}: Invalid JSON - {e}")
        return False

def main():
    """Run all checks."""
    print("\n" + "="*70)
    print("  RAILWAY DEPLOYMENT PRE-FLIGHT CHECK")
    print("="*70 + "\n")
    
    all_passed = True
    
    # Core files
    print("📦 Core Configuration Files:")
    all_passed &= check_file_exists('Procfile', 'Procfile')
    all_passed &= check_file_exists('railway.json', 'railway.json')
    all_passed &= check_file_exists('runtime.txt', 'runtime.txt')
    all_passed &= check_file_exists('.dockerignore', '.dockerignore')
    all_passed &= check_file_exists('entrypoint.sh', 'entrypoint.sh')
    print()
    
    # Validation
    print("✓ JSON Validation:")
    all_passed &= validate_json('railway.json', 'railway.json')
    print()
    
    # Dependencies
    print("📚 Production Dependencies:")
    all_passed &= check_requirements()
    print()
    
    # Django Settings
    print("⚙️ Django Settings:")
    all_passed &= check_django_settings()
    print()
    
    # Environment
    print("🔐 Environment Variables:")
    env_check = check_file_exists('.env.prod.example', '.env.prod.example')
    all_passed &= env_check
    print()
    
    # Summary
    print("="*70)
    if all_passed:
        print("✅ ALL CHECKS PASSED - Ready for Railway deployment!")
        print("\nNext steps:")
        print("1. Push all changes to GitHub")
        print("2. Create Railway project: https://railway.app")
        print("3. Connect GitHub repository")
        print("4. Add PostgreSQL service")
        print("5. Configure environment variables in Railway dashboard")
        print("6. Deploy!")
        return 0
    else:
        print("❌ SOME CHECKS FAILED - Please review above")
        return 1

if __name__ == '__main__':
    sys.exit(main())
