from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from core.models import *
class Command(BaseCommand):
 help='Create labeled demonstration records and accounts.'
 def handle(self,*args,**opts):
  def user(name,role,staff=False):
   u,_=User.objects.get_or_create(username=name,defaults={'email':name+'@example.local','is_staff':staff}); u.is_staff=staff or role=='ADMIN'; u.is_superuser=role=='ADMIN'; u.set_password('ForestDemo!2026'); u.save(); Profile.objects.update_or_create(user=u,defaults={'role':role}); return u
  admin=user('admin','ADMIN',True); officer=user('officer','OFFICER',True); rescue=user('rescue','RESCUE'); user('tourism','TOURISM',True); citizen=user('citizen','CITIZEN'); user('tourist','TOURIST')
  zone,_=ForestZone.objects.get_or_create(name='Nilgiri North Range',defaults={'description':'Sample forest zone','latitude':11.4064,'longitude':76.6932})
  if not Patrol.objects.filter(zone=zone,officer=officer,status='ASSIGNED').exists(): Patrol.objects.create(zone=zone,officer=officer,scheduled_for=timezone.now()+timedelta(hours=2),notes='Demo patrol assignment')
  animal,_=Animal.objects.get_or_create(animal_id='FG360-TIGER-001',defaults={'species':'Bengal tiger','approximate_age':'Adult'})
  AnimalSighting.objects.get_or_create(animal=animal,recorded_by=officer,latitude=Decimal('11.410000'),longitude=Decimal('76.690000'),defaults={'description':'Sample recorded sighting; manually entered.'})
  RescueCase.objects.get_or_create(animal=animal,defaults={'assigned_team':rescue,'status':'OPEN','location':'North range'})
  FireIncident.objects.get_or_create(reported_by=citizen,description='DEMO: controlled smoke observed near a trail.',defaults={'severity':'MEDIUM','latitude':Decimal('11.420000'),'longitude':Decimal('76.700000'),'is_demo':True})
  p,_=PlantationProject.objects.get_or_create(name='Monsoon Native Trees 2026',defaults={'area_hectares':Decimal('4.50'),'location':'South restoration block','latitude':Decimal('11.390000'),'longitude':Decimal('76.680000'),'species':'Native mixed species','planting_date':timezone.localdate()-timedelta(days=90),'trees_planted':500,'officer':officer})
  PlantationMonitoring.objects.get_or_create(project=p,recorded_on=timezone.localdate(),defaults={'living_count':450,'dead_count':30,'notes':'DEMO monitoring record.'})
  EcoLocation.objects.get_or_create(name='Misty Canopy Trail',defaults={'description':'Guided low-impact forest walk with local naturalists.','entry_fee':Decimal('250'),'capacity_per_slot':25,'latitude':Decimal('11.402000'),'longitude':Decimal('76.701000')})
  ConflictIncident.objects.get_or_create(reported_by=citizen,description='DEMO: crop damage report.',defaults={'incident_type':'CROP_DAMAGE','animal_type':'Wild boar','severity':'LOW','latitude':Decimal('11.398000'),'longitude':Decimal('76.712000')})
  self.stdout.write(self.style.SUCCESS('Demo accounts: admin, officer, rescue, tourism, citizen, tourist. Shared password: ForestDemo!2026'))
