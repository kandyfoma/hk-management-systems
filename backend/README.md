# HK Management Systems - Django Backend

A comprehensive Django REST API backend for healthcare management systems, supporting hospitals, pharmacies, clinics, and related healthcare organizations.

## Features

### 🔐 User Management
- Custom user model with phone-based authentication
- Role-based permissions (doctors, nurses, pharmacists, admin, etc.)
- Organization-based user grouping
- Comprehensive permission system

### 🏥 Organization Management
- Multi-organization support
- Different organization types (hospital, pharmacy, clinic, etc.)
- Registration and license tracking
- User-organization relationships

### 📄 License Management
- Professional license tracking (medical, pharmacy, nursing)
- Organization license management
- Automatic expiry notifications
- Renewal tracking and history
- Document attachments

### 👥 Patient Management
- Complete patient records
- Medical history tracking
- Insurance information
- Emergency contacts

## Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL 12+
- pip and virtualenv

### Installation

1. **Clone and setup**:
   ```bash
   cd backend
   python setup.py
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Activate virtual environment**:
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Unix/Linux/Mac
   source venv/bin/activate
   ```

4. **Create superuser**:
   ```bash
   python manage.py createsuperuser
   ```

5. **Run development server**:
   ```bash
   python manage.py runserver
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/logout/` - User logout
- `GET /api/v1/auth/profile/` - Get current user profile
- `PUT /api/v1/auth/profile/update/` - Update profile
- `POST /api/v1/auth/change-password/` - Change password

### Users
- `GET /api/v1/auth/users/` - List users
- `POST /api/v1/auth/users/` - Create user
- `GET /api/v1/auth/users/{id}/` - Get user details
- `PUT /api/v1/auth/users/{id}/` - Update user
- `DELETE /api/v1/auth/users/{id}/` - Delete user (soft delete)

### Organizations
- `GET /api/v1/organizations/` - List organizations
- `POST /api/v1/organizations/` - Create organization
- `GET /api/v1/organizations/{id}/` - Get organization details
- `PUT /api/v1/organizations/{id}/` - Update organization
- `GET /api/v1/organizations/{id}/users/` - Get organization users
- `GET /api/v1/organizations/{id}/licenses/` - Get organization licenses

### Licenses
- `GET /api/v1/licenses/` - List licenses
- `POST /api/v1/licenses/` - Create license
- `GET /api/v1/licenses/{id}/` - Get license details
- `PUT /api/v1/licenses/{id}/` - Update license
- `POST /api/v1/licenses/{id}/renew/` - Renew license
- `GET /api/v1/licenses/expiring/` - Get expiring licenses
- `GET /api/v1/licenses/stats/` - Get license statistics

### Patients
- `GET /api/v1/patients/` - List patients
- `POST /api/v1/patients/` - Create patient
- `GET /api/v1/patients/{id}/` - Get patient details
- `PUT /api/v1/patients/{id}/` - Update patient

## User Roles & Permissions

### Roles
- **Super Admin**: Full system access
- **Hospital Admin**: Hospital management
- **Pharmacy Admin**: Pharmacy management
- **Doctor**: Patient care, prescriptions
- **Nurse**: Patient care, medical records
- **Pharmacist**: Medication dispensing
- **Pharmacy Tech**: Inventory, dispensing support
- **Receptionist**: Appointments, basic patient info
- **Lab Technician**: Lab results access
- **Cashier**: POS and billing
- **Inventory Manager**: Inventory and suppliers

### Key Permissions
- `manage_users`: Create/edit users
- `manage_patients`: Full patient management
- `prescribe_medication`: Write prescriptions
- `dispense_medication`: Dispense medications
- `manage_inventory`: Inventory management
- `manage_licenses`: License management
- `view_reports`: Access reports and analytics

## Database Models

### User Model
- Phone-based authentication
- Professional license tracking
- Role and permission management
- Organization relationships

### Organization Model
- Multi-type support (hospital, pharmacy, clinic)
- Registration and license tracking
- Contact and administrative information

### License Model
- Professional and organizational licenses
- Expiry and renewal tracking
- Document attachments
- Status management (active, expired, suspended)

### Patient Model
- Complete demographic information
- Medical history and conditions
- Insurance and emergency contacts
- Unique patient numbering system

## Environment Variables

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Settings
DB_NAME=hk_management
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Development Commands

```bash
# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver

# Run tests
python manage.py test

# Create app
python manage.py startapp appname

# Shell access
python manage.py shell

# Database shell
python manage.py dbshell
```

## Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.accounts

# Run with coverage
coverage run manage.py test
coverage report
coverage html
```

## Deployment

The application is configured for deployment with:
- WhiteNoise for static files
- PostgreSQL database
- Gunicorn WSGI server
- Environment-based configuration

## Contributing

1. Create feature branch from `main`
2. Make changes and add tests
3. Run tests and ensure they pass
4. Submit pull request

## License

This project is proprietary software for HK Management Systems.

## Support

For technical support or questions, contact the development team.