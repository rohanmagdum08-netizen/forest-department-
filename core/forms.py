from django import forms
from .models import *
class StyledModelForm(forms.ModelForm):
 def __init__(self,*a,**kw):
  super().__init__(*a,**kw)
  for f in self.fields.values(): f.widget.attrs['class']='form-check-input' if isinstance(f.widget,forms.CheckboxInput) else 'form-control'
class RegistrationForm(forms.Form):
 username=forms.CharField(max_length=150); email=forms.EmailField(); password=forms.CharField(widget=forms.PasswordInput); role=forms.ChoiceField(choices=[('CITIZEN','Citizen'),('TOURIST','Tourist')]); first_name=forms.CharField(max_length=150)
class PatrolForm(StyledModelForm):
 class Meta: model=Patrol; fields=['zone','officer','scheduled_for','notes']
class PatrolIncidentForm(StyledModelForm):
 class Meta: model=PatrolIncident; fields=['incident_type','severity','description','latitude','longitude','photo','occurred_at']
class AnimalForm(StyledModelForm):
 class Meta: model=Animal; fields=['animal_id','species','approximate_age','gender','health_status','photo']
class SightingForm(StyledModelForm):
 class Meta: model=AnimalSighting; fields=['animal','latitude','longitude','description','photo','sighted_at']
class RescueForm(StyledModelForm):
 class Meta: model=RescueCase; fields=['animal','assigned_team','status','location','notes']
class FireForm(StyledModelForm):
 class Meta: model=FireIncident; fields=['severity','description','latitude','longitude','photo','occurred_at']
class PlantationForm(StyledModelForm):
 class Meta: model=PlantationProject; fields=['name','area_hectares','location','latitude','longitude','species','planting_date','trees_planted','officer','photo']
class MonitoringForm(StyledModelForm):
 class Meta: model=PlantationMonitoring; fields=['recorded_on','living_count','dead_count','notes','photo']
class DestinationForm(StyledModelForm):
 class Meta: model=EcoLocation; fields=['name','description','photo','entry_fee','opening_hours','capacity_per_slot','latitude','longitude','is_active']
class BookingForm(StyledModelForm):
 class Meta: model=Booking; fields=['visit_date','time_slot','visitor_count','visitor_name','visitor_email']
 def clean_visit_date(self):
  from django.utils import timezone
  d=self.cleaned_data['visit_date']
  if d<timezone.localdate(): raise forms.ValidationError('Choose today or a future date.')
  return d
class ConflictForm(StyledModelForm):
 class Meta: model=ConflictIncident; fields=['incident_type','animal_type','severity','description','latitude','longitude','photo','occurred_at']
class ConflictUpdateForm(StyledModelForm):
 class Meta: model=ConflictIncident; fields=['status','assigned_team','action_notes']
