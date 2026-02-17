import os
import sys
from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda x: [i.strip() for i in x.split(',')])

# Application definition
DJANGO_APPS = [
    'jazzmin',  # Modern admin interface
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'django_filters',
    'phonenumber_field',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.organizations',
    'apps.licenses',
    'apps.patients',
    'apps.inventory',
    'apps.sales',
    'apps.prescriptions',
    'apps.suppliers',
    'apps.audit',  # Audit logging system
    'apps.hospital',  # Hospital management system
    'apps.occupational_health',  # Occupational health management system
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.audit.utils.AuditMiddleware',  # Audit logging middleware
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='hk_management'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# SQLite configuration (commented out for production)
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Custom Authentication Backend
AUTHENTICATION_BACKENDS = [
    'apps.accounts.backends.PhoneNumberAuthBackend',  # Custom phone-based auth
    'django.contrib.auth.backends.ModelBackend',       # Default backend as fallback
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:19006",  # Expo
    "http://127.0.0.1:19006",  # Expo
]

CORS_ALLOW_CREDENTIALS = True

# Phone number field
PHONENUMBER_DEFAULT_REGION = 'HK'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'debug.log',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# Jazzmin Admin Interface Configuration
JAZZMIN_SETTINGS = {
    "site_title": "HK Management System",
    "site_header": "HK Management",
    "site_brand": "HK Management",
    "site_logo": None,
    "login_logo": None,
    "login_logo_dark": None,
    "site_logo_classes": "img-circle",
    "site_icon": None,
    "welcome_sign": "Welcome to HK Management System",
    "copyright": "HK Management System",
    "search_model": ["auth.User", "accounts.User"],
    "user_avatar": None,

    # Top Menu
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Support", "url": "https://github.com/farridav/django-jazzmin/issues", "new_window": True},
        {"app": "patients"},
    ],

    # User Menu on the right side of the header
    "usermenu_links": [
        {"name": "Support", "url": "https://github.com/farridav/django-jazzmin/issues", "new_window": True},
        {"model": "auth.user"}
    ],

    # Side Menu
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": [
        "auth", 
        "accounts", 
        "organizations", 
        "patients",
        "hospital",
        "occupational_health",
        "inventory", 
        "suppliers",
        "sales",
        "prescriptions",
        "licenses",
        "audit"
    ],

    # Icons
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "accounts": "fas fa-user-shield",
        "accounts.User": "fas fa-user-md",
        "accounts.UserPermission": "fas fa-user-lock",
        "organizations": "fas fa-building",
        "organizations.Organization": "fas fa-building",
        "patients": "fas fa-user-injured",
        "patients.Patient": "fas fa-user-injured",
        "hospital": "fas fa-hospital",
        "hospital.HospitalEncounter": "fas fa-procedures",
        "hospital.VitalSigns": "fas fa-heartbeat",
        "hospital.HospitalDepartment": "fas fa-clinic-medical",
        "hospital.HospitalBed": "fas fa-bed",
        "occupational_health": "fas fa-hard-hat",
        "occupational_health.Enterprise": "fas fa-industry",
        "occupational_health.WorkSite": "fas fa-map-marker-alt",
        "occupational_health.Worker": "fas fa-user-hard-hat",
        "occupational_health.MedicalExamination": "fas fa-stethoscope",
        "occupational_health.VitalSigns": "fas fa-heartbeat",
        "occupational_health.WorkplaceIncident": "fas fa-exclamation-triangle",
        "occupational_health.PPEItem": "fas fa-helmet-safety",
        "inventory": "fas fa-boxes",
        "inventory.Product": "fas fa-pills",
        "inventory.InventoryItem": "fas fa-box",
        "inventory.InventoryBatch": "fas fa-layer-group",
        "inventory.StockMovement": "fas fa-truck-moving",
        "suppliers": "fas fa-truck",
        "suppliers.Supplier": "fas fa-shipping-fast",
        "suppliers.SupplierContact": "fas fa-address-book",
        "sales": "fas fa-shopping-cart",
        "sales.Sale": "fas fa-cash-register",
        "sales.SaleItem": "fas fa-shopping-basket",
        "sales.Cart": "fas fa-shopping-cart",
        "prescriptions": "fas fa-prescription",
        "prescriptions.Prescription": "fas fa-prescription-bottle",
        "prescriptions.PrescriptionItem": "fas fa-pills",
        "licenses": "fas fa-certificate",
        "licenses.License": "fas fa-id-card",
        "licenses.LicenseDocument": "fas fa-file-contract",
        "audit": "fas fa-clipboard-list",
        "audit.AuditLog": "fas fa-history",
        "audit.PharmacyAuditLog": "fas fa-file-medical",
    },
    
    # UI Tweaks
    "custom_links": {
        "patients": [{
            "name": "Add Patient", 
            "url": "admin:patients_patient_add", 
            "icon": "fas fa-user-plus",
            "permissions": ["patients.add_patient"]
        }]
    },
    "use_google_fonts_cdn": True,
    "show_ui_builder": False,

    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {"auth.user": "collapsible", "auth.group": "vertical_tabs"},
}