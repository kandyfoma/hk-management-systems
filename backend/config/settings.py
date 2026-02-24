import os
import sys
from pathlib import Path
from decouple import config
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda x: [i.strip() for i in x.split(',')])

# Railway provides a public domain via RAILWAY_STATIC_URL (https://<host>)
railway_static_url = config('RAILWAY_STATIC_URL', default='')
if railway_static_url:
    railway_host = railway_static_url.replace('https://', '').replace('http://', '').strip('/')
    if railway_host and railway_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(railway_host)

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
    'rest_framework.authtoken',  # For token authentication
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
    'apps.occupational_health',  # Médecine du Travail
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
        'DIRS': [BASE_DIR / 'templates'],
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
DATABASE_URL = config('DATABASE_URL', default='')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=not DEBUG,
        )
    }
else:
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
STATICFILES_DIRS = [BASE_DIR / 'static']
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
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=DEBUG, cast=bool)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:19006,http://127.0.0.1:19006',
    cast=lambda x: [i.strip() for i in x.split(',') if i.strip()]
)

CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='',
    cast=lambda x: [i.strip() for i in x.split(',') if i.strip()]
)

CORS_ALLOW_CREDENTIALS = True

# Production security (Railway / reverse proxy friendly)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
    SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)

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

# Jazzmin Admin Interface Configuration - Professional & Beautiful
JAZZMIN_SETTINGS = {
    # ============= Site Identity =============
    "show_ui_builder": False,
    "site_title": "HK Management Admin",
    "site_header": "HK Healthcare System",
    "site_brand": "HK Santé",
    "site_logo": "branding/admin-logo.png",
    "site_logo_classes": "img-circle",
    "site_icon": "branding/admin-icon.png",
    "login_logo": "branding/admin-logo.png",
    "login_logo_dark": "branding/admin-logo.png",
    "welcome_sign": "Welcome to HK Healthcare Management System",
    "copyright": "© 2025 HK Management Systems - RD Congo",
    
    # ============= Search & User Avatar =============
    "search_model": "accounts.User",
    "user_avatar": None,

    # ============= Top Menu Links =============
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Licenses", "url": "admin:licenses_license_changelist", "permissions": ["licenses.view_license"]},
        {"name": "Users", "url": "admin:accounts_user_changelist", "permissions": ["accounts.view_user"]},
        {"name": "Organizations", "url": "admin:organizations_organization_changelist", "permissions": ["organizations.view_organization"]},
    ],

    # ============= User Menu =============
    "usermenu_links": [
        {"name": "My Profile", "url": "/admin/accounts/user/", "new_window": False},
        {"model": "accounts.user"},
    ],

    # ============= Side Menu =============
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_models": ["auth.permission", "contenttypes.contenttype", "sessions.session"],
    "hide_apps": [],
    
    # Menu ordering - most important first
    "order_with_respect_to": [
        "licenses",
        "licenses.license",
        "licenses.licensedocument",
        "licenses.licenserenewal",
        
        "accounts",
        "accounts.user",
        "accounts.userpermission",
        
        "organizations",
        "organizations.organization",
        
        "patients",
        "patients.patient",
        
        "hospital",
        "hospital.hospitalencounter",
        "hospital.hospitaldepartment",
        "hospital.vitalsigns",
        "hospital.hospitalbed",
        "hospital.diagnosis",
        "hospital.treatment",
        
        "occupational_health",
        "occupational_health.enterprise",
        "occupational_health.worksite",
        "occupational_health.worker",
        "occupational_health.medicalexamination",
        "occupational_health.workplaceincident",
        "occupational_health.ppeitem",
        
        "inventory",
        "inventory.product",
        "inventory.inventoryitem",
        "inventory.inventorybatch",
        "inventory.inventoryalert",
        "inventory.stockmovement",
        
        "suppliers",
        "suppliers.supplier",
        
        "sales",
        "sales.sale",
        "sales.saleitem",
        
        "prescriptions",
        "prescriptions.prescription",
        "prescriptions.prescriptionitem",
        
        "audit",
        "audit.auditlog",
        
        "auth",
        "auth.user",
        "auth.group",
    ],

    # ============= UI Settings =============
    "use_google_fonts_cdn": True,
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "accounts.user": "horizontal_tabs",
        "licenses.license": "horizontal_tabs",
        "organizations.organization": "horizontal_tabs",
    },
    "show_formset_buttons": False,
    "form_tabs_vertical": False,

    # ============= Dashboard =============
    "show_dashboard": True,
    "dashboard_form_widgets": {},
    
    # ============= Related Modal =============
    "related_modal_active": True,
}

# ============= Jazzmin UI Tweaks - Brand Colors from Frontend =============
# Colors: Primary #003366, Secondary #c51618, Info #3182CE
JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": False,
    "accent": "accent-primary",
    "navbar": "navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-light-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": True,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": True,
    "theme": "minty",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-outline-info",
        "warning": "btn-outline-warning",
        "danger": "btn-outline-danger",
        "success": "btn-outline-success",
    },
    "actions_sticky_top": True,
}

if not DEBUG:
    LOGGING['handlers'].pop('file', None)
    LOGGING['loggers']['django']['handlers'] = ['console']