from django.contrib import admin
from .models import *
admin.site.register([Profile,ForestZone,Patrol,PatrolIncident,Animal,AnimalSighting,RescueCase,FireIncident,PlantationProject,PlantationMonitoring,EcoLocation,Booking,VisitorEntry,ConflictIncident,CompensationClaim,Notification,AuditLog])
