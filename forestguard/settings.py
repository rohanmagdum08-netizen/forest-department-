import os
from pathlib import Path
from dotenv import load_dotenv
BASE_DIR=Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR/'.env')
SECRET_KEY=os.getenv('DJANGO_SECRET_KEY','local-demo-only-change-before-deployment')
DEBUG=os.getenv('DJANGO_DEBUG','True').lower()=='true'
ALLOWED_HOSTS=os.getenv('DJANGO_ALLOWED_HOSTS','127.0.0.1,localhost').split(',')
INSTALLED_APPS=['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','core']
MIDDLEWARE=['django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware','django.middleware.clickjacking.XFrameOptionsMiddleware']
ROOT_URLCONF='forestguard.urls'; WSGI_APPLICATION='forestguard.wsgi.application'
TEMPLATES=[{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[BASE_DIR/'templates'],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
if os.getenv('DB_ENGINE','sqlite').lower()=='mysql':
 import pymysql; pymysql.install_as_MySQLdb()
 DATABASES={'default':{'ENGINE':'django.db.backends.mysql','NAME':os.getenv('DB_NAME','forestguard360'),'USER':os.getenv('DB_USER','root'),'PASSWORD':os.getenv('DB_PASSWORD',''),'HOST':os.getenv('DB_HOST','127.0.0.1'),'PORT':os.getenv('DB_PORT','3306'),'OPTIONS':{'charset':'utf8mb4'}}}
else: DATABASES={'default':{'ENGINE':'django.db.backends.sqlite3','NAME':BASE_DIR/'db.sqlite3'}}
AUTH_PASSWORD_VALIDATORS=[{'NAME':'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},{'NAME':'django.contrib.auth.password_validation.MinimumLengthValidator'},{'NAME':'django.contrib.auth.password_validation.CommonPasswordValidator'},{'NAME':'django.contrib.auth.password_validation.NumericPasswordValidator'}]
LANGUAGE_CODE='en-us'; TIME_ZONE='Asia/Kolkata'; USE_I18N=True; USE_TZ=True
STATIC_URL='static/'; STATICFILES_DIRS=[BASE_DIR/'static']; MEDIA_URL='media/'; MEDIA_ROOT=BASE_DIR/'media'; DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
LOGIN_URL='login'; LOGIN_REDIRECT_URL='dashboard'; LOGOUT_REDIRECT_URL='home'
EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend'
if os.getenv('EMAIL_HOST'): EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST=os.getenv('EMAIL_HOST',''); EMAIL_PORT=int(os.getenv('EMAIL_PORT','587')); EMAIL_HOST_USER=os.getenv('EMAIL_HOST_USER',''); EMAIL_HOST_PASSWORD=os.getenv('EMAIL_HOST_PASSWORD',''); EMAIL_USE_TLS=os.getenv('EMAIL_USE_TLS','True').lower()=='true'; DEFAULT_FROM_EMAIL=os.getenv('DEFAULT_FROM_EMAIL','forestguard360@example.local')
