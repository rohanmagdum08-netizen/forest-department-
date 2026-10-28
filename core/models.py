from django.conf import settings
from django.core.validators import MinValueValidator,MaxValueValidator
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
import uuid
class TimeStamped(models.Model):
 created_at=models.DateTimeField(auto_now_add=True); updated_at=models.DateTimeField(auto_now=True)
 class Meta: abstract=True
class Profile(TimeStamped):
 ROLES=[('ADMIN','Administrator'),('OFFICER','Forest Officer'),('RESCUE','Rescue Team'),('TOURISM','Eco-Tourism Manager'),('CITIZEN','Citizen'),('TOURIST','Tourist')]
 user=models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='profile'); role=models.CharField(max_length=12,choices=ROLES,default='CITIZEN'); phone=models.CharField(max_length=30,blank=True)
 def __str__(self): return f'{self.user} ({self.get_role_display()})'
class ForestZone(TimeStamped):
 name=models.CharField(max_length=120); description=models.TextField(blank=True); latitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True); longitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True)
 def __str__(self): return self.name
class Patrol(TimeStamped):
 STATUS=[('ASSIGNED','Assigned'),('STARTED','Started'),('COMPLETED','Completed'),('CANCELLED','Cancelled')]
 zone=models.ForeignKey(ForestZone,on_delete=models.PROTECT,related_name='patrols'); officer=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name='patrols'); scheduled_for=models.DateTimeField(default=timezone.now); status=models.CharField(max_length=12,choices=STATUS,default='ASSIGNED'); notes=models.TextField(blank=True); started_at=models.DateTimeField(null=True,blank=True); completed_at=models.DateTimeField(null=True,blank=True)
 def __str__(self): return f'{self.zone} patrol - {self.get_status_display()}'
class GeoRecord(TimeStamped):
 latitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True,validators=[MinValueValidator(-90),MaxValueValidator(90)]); longitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True,validators=[MinValueValidator(-180),MaxValueValidator(180)]); description=models.TextField(blank=True); photo=models.ImageField(upload_to='reports/%Y/%m/',blank=True)
 class Meta: abstract=True
class PatrolIncident(GeoRecord):
 TYPES=[('ILLEGAL_LOGGING','Illegal logging'),('POACHING','Poaching'),('ENCROACHMENT','Encroachment'),('OTHER','Other')]; SEVERITY=[('LOW','Low'),('MEDIUM','Medium'),('HIGH','High'),('CRITICAL','Critical')]
 patrol=models.ForeignKey(Patrol,on_delete=models.CASCADE,related_name='incidents'); reported_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT); incident_type=models.CharField(max_length=24,choices=TYPES); severity=models.CharField(max_length=10,choices=SEVERITY,default='MEDIUM'); occurred_at=models.DateTimeField(default=timezone.now)
 def __str__(self): return self.get_incident_type_display()
class Animal(TimeStamped):
 GENDER=[('UNKNOWN','Unknown'),('MALE','Male'),('FEMALE','Female')]; HEALTH=[('HEALTHY','Healthy'),('INJURED','Injured'),('UNDER_TREATMENT','Under treatment'),('RELEASED','Released')]
 animal_id=models.CharField(max_length=40,unique=True); species=models.CharField(max_length=100); approximate_age=models.CharField(max_length=40,blank=True); gender=models.CharField(max_length=10,choices=GENDER,default='UNKNOWN'); health_status=models.CharField(max_length=20,choices=HEALTH,default='HEALTHY'); photo=models.ImageField(upload_to='animals/',blank=True)
 def __str__(self): return f'{self.animal_id} - {self.species}'
class AnimalSighting(GeoRecord):
 animal=models.ForeignKey(Animal,on_delete=models.CASCADE,related_name='sightings'); recorded_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT); sighted_at=models.DateTimeField(default=timezone.now)
class RescueCase(TimeStamped):
 STATUS=[('OPEN','Open'),('TREATMENT','Treatment'),('REHABILITATION','Rehabilitation'),('RELEASED','Released'),('TRANSFERRED','Transferred'),('CLOSED','Closed')]
 animal=models.ForeignKey(Animal,on_delete=models.PROTECT,related_name='rescue_cases'); assigned_team=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name='rescue_cases',null=True,blank=True); status=models.CharField(max_length=16,choices=STATUS,default='OPEN'); notes=models.TextField(blank=True); location=models.CharField(max_length=200,blank=True); resolved_at=models.DateTimeField(null=True,blank=True)
class FireIncident(GeoRecord):
 SEVERITY=[('LOW','Low'),('MEDIUM','Medium'),('HIGH','High'),('CRITICAL','Critical')]; STATUS=[('REPORTED','Reported'),('VERIFIED','Verified'),('ASSIGNED','Assigned'),('IN_PROGRESS','In progress'),('RESOLVED','Resolved')]
 reported_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name='fire_reports'); severity=models.CharField(max_length=10,choices=SEVERITY,default='MEDIUM'); status=models.CharField(max_length=12,choices=STATUS,default='REPORTED'); assigned_officer=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name='assigned_fires'); occurred_at=models.DateTimeField(default=timezone.now); risk_score=models.PositiveSmallIntegerField(default=40); is_demo=models.BooleanField(default=False)
 def classify_risk(self): return {'LOW':20,'MEDIUM':45,'HIGH':75,'CRITICAL':95}[self.severity]
 def save(self,*args,**kwargs): self.risk_score=self.classify_risk(); super().save(*args,**kwargs)
class PlantationProject(TimeStamped):
 name=models.CharField(max_length=140); area_hectares=models.DecimalField(max_digits=9,decimal_places=2,validators=[MinValueValidator(.01)]); location=models.CharField(max_length=180); latitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True); longitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True); species=models.CharField(max_length=120); planting_date=models.DateField(); trees_planted=models.PositiveIntegerField(validators=[MinValueValidator(1)]); officer=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name='plantation_projects'); photo=models.ImageField(upload_to='plantations/',blank=True)
 @property
 def survival_rate(self):
  m=self.monitoring.order_by('-recorded_on').first(); return round(m.living_count/self.trees_planted*100,1) if m and self.trees_planted else None
 def __str__(self): return self.name
class PlantationMonitoring(TimeStamped):
 project=models.ForeignKey(PlantationProject,on_delete=models.CASCADE,related_name='monitoring'); recorded_on=models.DateField(default=timezone.localdate); living_count=models.PositiveIntegerField(); dead_count=models.PositiveIntegerField(default=0); notes=models.TextField(blank=True); photo=models.ImageField(upload_to='plantations/monitoring/',blank=True)
 def clean(self):
  if self.project_id and self.living_count+self.dead_count>self.project.trees_planted: raise ValidationError('Living and dead counts cannot exceed trees planted.')
class EcoLocation(TimeStamped):
 name=models.CharField(max_length=120); description=models.TextField(); photo=models.ImageField(upload_to='destinations/',blank=True); entry_fee=models.DecimalField(max_digits=8,decimal_places=2,default=0,validators=[MinValueValidator(0)]); opening_hours=models.CharField(max_length=120,default='08:00 - 17:00'); capacity_per_slot=models.PositiveIntegerField(default=30,validators=[MinValueValidator(1)]); latitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True); longitude=models.DecimalField(max_digits=9,decimal_places=6,null=True,blank=True); is_active=models.BooleanField(default=True)
 def __str__(self): return self.name
class Booking(TimeStamped):
 STATUS=[('CONFIRMED','Confirmed'),('CANCELLED','Cancelled'),('VISITED','Visited')]; PAYMENT=[('PAY_ON_ARRIVAL','Pay on arrival'),('SIMULATED_PAID','Demo payment'),('NOT_APPLICABLE','Not applicable')]
 booking_id=models.UUIDField(default=uuid.uuid4,editable=False,unique=True); destination=models.ForeignKey(EcoLocation,on_delete=models.PROTECT,related_name='bookings'); tourist=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name='bookings'); visit_date=models.DateField(); time_slot=models.CharField(max_length=30); visitor_count=models.PositiveIntegerField(validators=[MinValueValidator(1)]); visitor_name=models.CharField(max_length=120); visitor_email=models.EmailField(); status=models.CharField(max_length=12,choices=STATUS,default='CONFIRMED'); payment_status=models.CharField(max_length=20,choices=PAYMENT,default='PAY_ON_ARRIVAL'); qr_token=models.UUIDField(default=uuid.uuid4,unique=True,editable=False)
 class Meta: indexes=[models.Index(fields=['destination','visit_date','time_slot','status'])]
 def __str__(self): return str(self.booking_id)
class VisitorEntry(TimeStamped):
 booking=models.ForeignKey(Booking,on_delete=models.CASCADE,related_name='entries'); action=models.CharField(max_length=8,choices=[('ENTRY','Entry'),('EXIT','Exit')]); recorded_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT); visitor_count=models.PositiveIntegerField(default=1)
class ConflictIncident(GeoRecord):
 TYPE=[('INTRUSION','Animal intrusion'),('CROP_DAMAGE','Crop damage'),('LIVESTOCK','Livestock attack'),('ROAD','Road incident'),('HUMAN_INJURY','Human injury')]; STATUS=[('REPORTED','Reported'),('VERIFY','Under verification'),('ASSIGNED','Assigned'),('IN_PROGRESS','In progress'),('RESOLVED','Resolved'),('CLOSED','Closed')]; SEVERITY=[('LOW','Low'),('MEDIUM','Medium'),('HIGH','High'),('CRITICAL','Critical')]
 incident_type=models.CharField(max_length=16,choices=TYPE); animal_type=models.CharField(max_length=100,blank=True); reported_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name='conflict_reports'); severity=models.CharField(max_length=10,choices=SEVERITY,default='MEDIUM'); status=models.CharField(max_length=14,choices=STATUS,default='REPORTED'); assigned_team=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name='assigned_conflicts'); action_notes=models.TextField(blank=True); occurred_at=models.DateTimeField(default=timezone.now); resolved_at=models.DateTimeField(null=True,blank=True)
class CompensationClaim(TimeStamped):
 STATUS=[('SUBMITTED','Submitted'),('ASSESSMENT','Under assessment'),('APPROVED','Approved'),('REJECTED','Rejected'),('PAID','Paid')]
 incident=models.ForeignKey(ConflictIncident,on_delete=models.CASCADE,related_name='claims'); claimant=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT); amount_claimed=models.DecimalField(max_digits=10,decimal_places=2,validators=[MinValueValidator(0)]); status=models.CharField(max_length=14,choices=STATUS,default='SUBMITTED'); assessment_notes=models.TextField(blank=True)
class Notification(TimeStamped):
 recipient=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='notifications'); subject=models.CharField(max_length=180); message=models.TextField(); read_at=models.DateTimeField(null=True,blank=True)
class AuditLog(TimeStamped):
 user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True); action=models.CharField(max_length=100); object_type=models.CharField(max_length=80); object_id=models.CharField(max_length=80,blank=True); detail=models.TextField(blank=True)
