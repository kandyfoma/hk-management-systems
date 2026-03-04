#!/usr/bin/env python3
"""
Django KAT Management Systems Backend Setup Script

This script helps set up the Django backend for the KAT Management Systems.
It creates a virtual environment, installs dependencies, and runs initial setup.
"""

import os
import sys
import subprocess
from pathlib import Path


def run_command(command, description):
    """Run a command and print status"""
    print(f"\n{description}...")
    try:
        subprocess.run(command, shell=True, check=True)
        print(f"✓ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed: {e}")
        return False


def main():
    print("🏥 KAT Management Systems - Django Backend Setup")
    print("=" * 50)
    
    # Check if virtual environment exists
    venv_path = Path("venv")
    if not venv_path.exists():
        if not run_command("python -m venv venv", "Creating virtual environment"):
            return False
    
    # Determine activation script based on OS
    if os.name == 'nt':  # Windows
        activate_script = "venv\\Scripts\\activate"
        pip_command = "venv\\Scripts\\pip"
        python_command = "venv\\Scripts\\python"
    else:  # Unix/Linux/Mac
        activate_script = "source venv/bin/activate"
        pip_command = "venv/bin/pip"
        python_command = "venv/bin/python"
    
    print(f"\n📋 To activate the virtual environment, run:")
    print(f"   {activate_script}")
    
    # Install dependencies
    if not run_command(f"{pip_command} install -r requirements.txt", "Installing Python dependencies"):
        return False
    
    # Create .env file if it doesn't exist
    env_file = Path(".env")
    if not env_file.exists():
        if run_command("cp .env.example .env", "Creating .env file from template"):
            print("\n⚠️  Please edit .env file with your database credentials and settings")
    
    # Run Django setup commands
    commands = [
        (f"{python_command} manage.py makemigrations", "Creating database migrations"),
        (f"{python_command} manage.py migrate", "Applying database migrations"),
    ]
    
    for command, description in commands:
        if not run_command(command, description):
            return False
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("   1. Edit .env file with your database credentials")
    print(f"   2. Activate virtual environment: {activate_script}")
    print(f"   3. Create superuser: {python_command} manage.py createsuperuser")
    print(f"   4. Run development server: {python_command} manage.py runserver")
    print("\n📚 API Documentation will be available at:")
    print("   - Admin: http://localhost:8000/admin/")
    print("   - API: http://localhost:8000/api/v1/")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)