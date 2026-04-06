"""
Django settings for Mindwell project.
"""

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ========================== SECURITY ==========================
SECRET_KEY = 'django-insecure-mj-hff4@(q92cu+z#+t7g@vcl^(hufp=)32v^)g)w_qmb4ojee'

DEBUG = True

ALLOWED_HOSTS = []


# ========================== APPS ==========================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'AutenticarApp',
    'GestionarCitasApp',
    'MindwellApp',
    'ActividadApp',
    'ResultadoApp',
    'AdminApp',
]


# ========================== MIDDLEWARE ==========================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ========================== URLS y TEMPLATES ==========================
ROOT_URLCONF = 'Mindwell.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # DIRS vacío está bien — APP_DIRS=True busca en cada app/templates/
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Mindwell.wsgi.application'


# ========================== DATABASE ==========================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# ========================== PASSWORD VALIDATION ==========================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ========================== INTERNATIONALIZATION ==========================
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'

USE_I18N = True
USE_TZ = True


# ========================== STATIC & MEDIA ==========================
STATIC_URL = '/static/'

# Carpeta global de estáticos (css, js, img compartidos entre apps)
STATICFILES_DIRS = [
    BASE_DIR / 'Mindwell' / 'static',
]

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ========================== AUTENTICACIÓN PERSONALIZADA ==========================

# Primero busca por documento (Perfil.documento),
# si falla usa el backend estándar de Django (necesario para el panel /admin/)
AUTHENTICATION_BACKENDS = [
    'AutenticarApp.backends.DocumentoBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# URL a la que redirige @login_required cuando el usuario NO está autenticado
LOGIN_URL = '/autenticar/login'

# Tras login/logout exitoso (puedes cambiarlo al dashboard cuando esté listo)
LOGIN_REDIRECT_URL  = '/dashboard/'
LOGOUT_REDIRECT_URL = '/autenticar/login'


# ========================== EMAIL (GMAIL) ==========================
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = 'smtp.gmail.com'
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = 'mindwelloficial@gmail.com'
EMAIL_HOST_PASSWORD = 'tjwxhwpkewmrvstn'   # App Password de 16 caracteres
DEFAULT_FROM_EMAIL  = EMAIL_HOST_USER

EMAIL_SUBJECT_PREFIX = '[MindWell] '


# ========================== DEFAULT PK ==========================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'