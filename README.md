# ForestGuard 360

A local Django application for forest patrols, wildlife rescue, fire response, plantation monitoring, eco-tourism booking, and human-wildlife conflict reports. Locations are entered by users. The app has no sensors, IoT devices, or continuous wildlife tracking.

## Requirements

Python 3.10+, SQLite for the quick demo or MySQL 8+, and internet access for Bootstrap, Chart.js, and Leaflet/OpenStreetMap assets.

## Quick start (SQLite)

```powershell
cd "C:\Users\isvol\Downloads\rohan project"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py makemigrations core
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Open http://127.0.0.1:8000/.

Demo users: `admin`, `officer`, `rescue`, `tourism`, `citizen`, `tourist`. Shared password: `ForestDemo!2026`. Change it before using real information.

## MySQL

Create an utf8mb4 database and set `DB_ENGINE=mysql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in `.env`, then migrate. PyMySQL is installed as the MySQL driver on Windows. SQLite is the default local demo database.

## Email

With no SMTP configuration, messages use Django's console email backend and appear in the runserver terminal. Configure `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, and `DEFAULT_FROM_EMAIL` in `.env` for SMTP. Never commit credentials.

## Roles and workflows

- Administrator: use `/admin/` to manage users, profiles, records, and destinations. Superusers receive administrative authorization.
- Forest Officer: create patrols, manage wildlife records and sightings, create rescue cases, assign fire responses, monitor plantations, update conflict cases.
- Rescue Team: access wildlife and rescue records.
- Eco-Tourism Manager: create destinations and verify a booking using its token at `/verify/<token>/`.
- Citizen: submit fire and conflict reports and view personal records.
- Tourist: browse and book visits, view history, and cancel eligible visits.

Role checks run in Django views; owner checks protect patrols and report/booking records. Django authentication, password hashing, CSRF protection, ORM queries, validation, and admin are enabled. Uploads use ImageField. Set upload size limits at the web server for deployment.

Fire risk is a transparent severity mapping in `FireIncident.classify_risk`: Low 20, Medium 45, High 75, Critical 95. It classifies submitted reports; it does not detect fires. Booking capacity is checked in a database transaction with a row lock; for SQLite this is suitable for local demonstration, not concurrent production load.

## Project structure

```text
forestguard/ settings, URLs, WSGI
core/        models, forms, views, permissions, services, admin
core/management/commands/seed_demo.py
templates/core/ Django templates
static/core/ responsive styles
media/       uploaded images created at runtime
```

Maps show only records with valid saved coordinates and use OpenStreetMap attribution. Sample weather data and external tracking are not configured. Dashboard and reports use database records. The seed command labels its fire record as demo.

## React + Tailwind admin dashboard

The administrator dashboard is the React interface at `http://127.0.0.1:8000/dashboard/`. Django's full model editor remains at `/admin/`.

The frontend source is in `frontend/`. To run it with Vite for UI development, keep Django running on port 8000, then in a second terminal:

```powershell
cd "C:\Users\isvol\Downloads\rohan project\frontend"
npm install
npm run dev
```

Open http://127.0.0.1:5173/ for the Vite development view. The dev server proxies `/api/` calls to Django. To rebuild the static frontend used by `/dashboard/`:

```powershell
cd "C:\Users\isvol\Downloads\rohan project\frontend"
npm run build
```

The admin page reads its counts and activity from a role-protected Django endpoint at `/api/admin/overview/` and uses the existing login session.
