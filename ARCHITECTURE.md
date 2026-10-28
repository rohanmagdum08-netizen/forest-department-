# Architecture

```mermaid
flowchart TD
 U[Administrator / Officer / Rescue / Tourism / Citizen / Tourist] --> T[Django templates + Bootstrap]
 T --> V[Role-checked Django views]
 V --> F[Django Forms and validation]
 F --> M[Django ORM models]
 M --> DB[(SQLite demo or MySQL)]
 V --> N[Notification service]
 N --> E[Console email or configured SMTP]
 V --> L[Leaflet + OpenStreetMap]
```

Reports use user-submitted information. Wildlife locations are recorded sightings, not live tracking. Fire risk is a deterministic score based on reported severity. Booking capacity is checked transactionally. Profiles carry one role; superusers have admin access.
