from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.urls import reverse
from io import BytesIO
import base64
import qrcode
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Count,Sum
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404,redirect,render
from django.utils import timezone
from django.views.decorators.http import require_POST
from .forms import *
from .models import *
from .permissions import roles_required,staff_roles
from .services import book_slot,notify_user

def home(request): return render(request,'core/home.html',{'destinations':EcoLocation.objects.filter(is_active=True)[:3]})
def about(request): return render(request,'core/about.html')
def register(request):
 form=RegistrationForm(request.POST or None)
 if form.is_valid():
  d=form.cleaned_data; u=User.objects.create_user(d['username'],d['email'],d['password'],first_name=d['first_name']); Profile.objects.create(user=u,role=d['role']); login(request,u); return redirect('dashboard')
 return render(request,'core/form.html',{'form':form,'title':'Create account'})
@login_required
def dashboard(request):
 role='ADMIN' if request.user.is_superuser else getattr(getattr(request.user,'profile',None),'role','CITIZEN')
 if role=='ADMIN': return render(request,'core/react_admin.html')
 if role in ('ADMIN','OFFICER','RESCUE','TOURISM'):
  c={'role':role,'staff_dashboard':True,'users':User.objects.count(),'patrols':Patrol.objects.exclude(status__in=['COMPLETED','CANCELLED']).count(),'sightings':AnimalSighting.objects.count(),'rescues':RescueCase.objects.exclude(status__in=['RELEASED','TRANSFERRED','CLOSED']).count(),'fires':FireIncident.objects.exclude(status='RESOLVED').count(),'plantations':PlantationProject.objects.count(),'bookings':Booking.objects.filter(visit_date=timezone.localdate(),status='CONFIRMED').count(),'conflicts':ConflictIncident.objects.exclude(status__in=['RESOLVED','CLOSED']).count(),'recent_fires':FireIncident.objects.order_by('-created_at')[:5],'recent_conflicts':ConflictIncident.objects.order_by('-created_at')[:5],'monthly':list(FireIncident.objects.values('severity').annotate(total=Count('id')))}
 else: c={'role':role,'staff_dashboard':False,'my_bookings':Booking.objects.filter(tourist=request.user).order_by('-created_at')[:10]}
 return render(request,'core/dashboard.html',c)
@require_GET
def admin_overview_api(request):
 if not request.user.is_authenticated:
  return JsonResponse({'error':'Sign in required','login_url':'http://127.0.0.1:8000/login/?next=/dashboard/'},status=401)
 role='ADMIN' if request.user.is_superuser else getattr(getattr(request.user,'profile',None),'role','')
 if role not in ('ADMIN','OFFICER','RESCUE','TOURISM'):
  return JsonResponse({'error':'Administrator access required'},status=403)
 recent=[]
 for fire in FireIncident.objects.order_by('-created_at')[:5]:
  recent.append({'id':f'F-{fire.pk:04d}','type':'Fire report','title':fire.description,'location':f'{fire.latitude or "Location pending"}, {fire.longitude or ""}'.strip(', '),'status':fire.get_status_display(),'severity':fire.get_severity_display(),'priority':fire.severity,'created_at':fire.created_at.isoformat(),'demo':fire.is_demo})
 for conflict in ConflictIncident.objects.order_by('-created_at')[:5]:
  recent.append({'id':f'C-{conflict.pk:04d}','type':'Wildlife conflict','title':conflict.get_incident_type_display(),'location':f'{conflict.latitude or "Location pending"}, {conflict.longitude or ""}'.strip(', '),'status':conflict.get_status_display(),'severity':conflict.get_severity_display(),'priority':conflict.severity,'created_at':conflict.created_at.isoformat(),'demo':False})
 recent.sort(key=lambda item:item['created_at'],reverse=True)
 return JsonResponse({'user':{'name':request.user.get_full_name() or request.user.username,'role':role},'stats':{'users':User.objects.count(),'patrols':Patrol.objects.exclude(status__in=['COMPLETED','CANCELLED']).count(),'sightings':AnimalSighting.objects.count(),'rescues':RescueCase.objects.exclude(status__in=['RELEASED','TRANSFERRED','CLOSED']).count(),'fires':FireIncident.objects.exclude(status='RESOLVED').count(),'plantations':PlantationProject.objects.count(),'bookings_today':Booking.objects.filter(visit_date=timezone.localdate(),status='CONFIRMED').count(),'conflicts':ConflictIncident.objects.exclude(status__in=['RESOLVED','CLOSED']).count()},'recent':recent[:7],'fires_by_severity':list(FireIncident.objects.values('severity').annotate(total=Count('id')).order_by('severity')),'open_rescues':RescueCase.objects.exclude(status__in=['RELEASED','TRANSFERRED','CLOSED']).count(),'open_conflicts':ConflictIncident.objects.exclude(status__in=['RESOLVED','CLOSED']).count(),'open_fires':FireIncident.objects.exclude(status='RESOLVED').count()})

def _list(request,model,title,create_url=None,queryset=None):
 qs=queryset if queryset is not None else model.objects.all(); q=request.GET.get('q','').strip()
 if q:
  from django.db.models import Q
  query=Q()
  for f in model._meta.fields:
   if f.get_internal_type() in ('CharField','TextField'): query|=Q(**{f.name+'__icontains':q})
  qs=qs.filter(query)
 return render(request,'core/list.html',{'objects':qs,'title':title,'create_url':create_url,'q':q})
@login_required
@staff_roles('OFFICER','RESCUE')
def patrols(request): return _list(request,Patrol,'Forest patrols','patrol-create',Patrol.objects.select_related('zone','officer'))
@login_required
@staff_roles('OFFICER')
def patrol_create(request):
 form=PatrolForm(request.POST or None)
 if form.is_valid(): form.save(); messages.success(request,'Patrol assigned.'); return redirect('patrols')
 return render(request,'core/form.html',{'form':form,'title':'Assign a patrol'})
@login_required
@staff_roles('OFFICER')
def patrol_action(request,pk,action):
 p=get_object_or_404(Patrol,pk=pk)
 if p.officer_id!=request.user.id and not request.user.is_superuser: return HttpResponseForbidden()
 if request.method=='POST':
  nxt={'start':('ASSIGNED','STARTED'),'complete':('STARTED','COMPLETED'),'cancel':('ASSIGNED','CANCELLED')}.get(action)
  if not nxt or p.status!=nxt[0]: messages.error(request,'That patrol status transition is not allowed.')
  else:
   p.status=nxt[1]
   if action=='start': p.started_at=timezone.now()
   if action=='complete': p.completed_at=timezone.now()
   p.save(); messages.success(request,'Patrol updated.')
 return redirect('patrols')
@login_required
@staff_roles('OFFICER')
def patrol_incident_create(request,pk):
 p=get_object_or_404(Patrol,pk=pk)
 if p.officer_id!=request.user.id and not request.user.is_superuser: return HttpResponseForbidden()
 form=PatrolIncidentForm(request.POST or None,request.FILES or None)
 if form.is_valid(): i=form.save(commit=False); i.patrol=p; i.reported_by=request.user; i.save(); messages.success(request,'Patrol incident recorded.'); return redirect('patrols')
 return render(request,'core/form.html',{'form':form,'title':'Report patrol incident'})
@login_required
@staff_roles('OFFICER','RESCUE')
def animals(request): return _list(request,Animal,'Wildlife records','animal-create' if request.user.is_staff else None,Animal.objects.all())
@login_required
@staff_roles('OFFICER','RESCUE')
def animal_create(request):
 form=AnimalForm(request.POST or None,request.FILES or None)
 if form.is_valid(): form.save(); messages.success(request,'Animal profile saved.'); return redirect('animals')
 return render(request,'core/form.html',{'form':form,'title':'Add wildlife profile'})
@login_required
@staff_roles('OFFICER')
def sighting_create(request):
 form=SightingForm(request.POST or None,request.FILES or None)
 if form.is_valid(): s=form.save(commit=False); s.recorded_by=request.user; s.save(); messages.success(request,'Sighting recorded.'); return redirect('map')
 return render(request,'core/form.html',{'form':form,'title':'Record wildlife sighting'})
@login_required
@staff_roles('OFFICER','RESCUE')
def rescues(request): return _list(request,RescueCase,'Wildlife rescue cases','rescue-create')
@login_required
@staff_roles('OFFICER','RESCUE')
def rescue_create(request):
 form=RescueForm(request.POST or None)
 if form.is_valid(): form.save(); messages.success(request,'Rescue case assigned.'); return redirect('rescues')
 return render(request,'core/form.html',{'form':form,'title':'Create rescue case'})
@login_required
def fires(request):
 qs=FireIncident.objects.select_related('reported_by','assigned_officer'); role=getattr(getattr(request.user,'profile',None),'role','')
 if not (request.user.is_staff or role in ('ADMIN','OFFICER','RESCUE')): qs=qs.filter(reported_by=request.user)
 return _list(request,FireIncident,'Forest fire reports','fire-create',qs)
@login_required
def fire_create(request):
 form=FireForm(request.POST or None,request.FILES or None)
 if form.is_valid():
  f=form.save(commit=False); f.reported_by=request.user; f.save()
  if f.severity in ('HIGH','CRITICAL'):
   for u in User.objects.filter(profile__role__in=['ADMIN','OFFICER']): notify_user(u,'High-priority fire report',f'{f.get_severity_display()} fire reported. Rule-based risk: {f.risk_score}/100.')
  messages.success(request,f'Fire report saved. Rule-based risk score {f.risk_score}/100.'); return redirect('fires')
 return render(request,'core/form.html',{'form':form,'title':'Report a forest fire'})
@login_required
@staff_roles('OFFICER')
def fire_assign(request,pk):
 f=get_object_or_404(FireIncident,pk=pk)
 if request.method=='POST': f.assigned_officer=request.user; f.status='ASSIGNED'; f.save(); messages.success(request,'Fire response assigned.')
 return redirect('fires')
@login_required
@staff_roles('OFFICER','ADMIN')
def plantations(request): return _list(request,PlantationProject,'Plantation projects','plantation-create')
@login_required
@staff_roles('OFFICER','ADMIN')
def plantation_create(request):
 form=PlantationForm(request.POST or None,request.FILES or None)
 if form.is_valid(): form.save(); messages.success(request,'Plantation project created.'); return redirect('plantations')
 return render(request,'core/form.html',{'form':form,'title':'Create plantation project'})
@login_required
@staff_roles('OFFICER','ADMIN')
def monitoring_create(request,pk):
 project=get_object_or_404(PlantationProject,pk=pk); form=MonitoringForm(request.POST or None,request.FILES or None)
 if form.is_valid():
  item=form.save(commit=False); item.project=project
  try: item.full_clean(); item.save(); messages.success(request,'Monitoring record saved.'); return redirect('plantations')
  except Exception as e: form.add_error(None,str(e))
 return render(request,'core/form.html',{'form':form,'title':f'Monitor {project.name}'})
def destinations(request): return _list(request,EcoLocation,'Eco-tourism destinations','destination-create' if request.user.is_staff else None,EcoLocation.objects.filter(is_active=True))
@login_required
@staff_roles('TOURISM')
def destination_create(request):
 form=DestinationForm(request.POST or None,request.FILES or None)
 if form.is_valid(): form.save(); messages.success(request,'Destination saved.'); return redirect('destinations')
 return render(request,'core/form.html',{'form':form,'title':'Add tourism destination'})
@login_required
@roles_required('ADMIN','TOURIST','TOURISM')
def booking_create(request,pk):
 dest=get_object_or_404(EcoLocation,pk=pk,is_active=True); form=BookingForm(request.POST or None)
 if form.is_valid():
  booking=book_slot(destination=dest,tourist=request.user,form_data=form.cleaned_data)
  if booking: messages.success(request,f'Booking confirmed. Reference: {booking.booking_id}'); return redirect('booking-history')
  form.add_error(None,'This time slot is full. Choose another date or slot.')
 return render(request,'core/form.html',{'form':form,'title':f'Book {dest.name}','subtitle':f'Capacity {dest.capacity_per_slot} per slot. Payment on arrival.'})
@login_required
def booking_history(request):
 qs=Booking.objects.select_related('destination','tourist'); role=getattr(getattr(request.user,'profile',None),'role','')
 if not (request.user.is_staff or role in ('ADMIN','TOURISM')): qs=qs.filter(tourist=request.user)
 return _list(request,Booking,'Bookings',None,qs.order_by('-created_at'))
@login_required
def booking_detail(request,booking_id):
 b=get_object_or_404(Booking.objects.select_related('destination','tourist'),booking_id=booking_id)
 role=getattr(getattr(request.user,'profile',None),'role','')
 if b.tourist_id!=request.user.id and not (request.user.is_staff or request.user.is_superuser or role in ('ADMIN','TOURISM')): return HttpResponseForbidden()
 verify_url=request.build_absolute_uri(reverse('booking-verify',args=[b.qr_token]))
 image=qrcode.make(verify_url); stream=BytesIO(); image.save(stream,format='PNG'); qr='data:image/png;base64,'+base64.b64encode(stream.getvalue()).decode('ascii')
 return render(request,'core/booking_detail.html',{'booking':b,'qr_image':qr})

@login_required
@require_POST
def booking_cancel(request,pk):
 b=get_object_or_404(Booking,pk=pk); role=getattr(getattr(request.user,'profile',None),'role','')
 if b.tourist_id!=request.user.id and not (request.user.is_staff or role in ('ADMIN','TOURISM')): return HttpResponseForbidden()
 if b.status=='CONFIRMED' and b.visit_date>=timezone.localdate():
  b.status='CANCELLED'; b.save(); notify_user(b.tourist,'Booking cancelled',f'Booking {b.booking_id} was cancelled.'); messages.success(request,'Booking cancelled.')
 else: messages.error(request,'This booking cannot be cancelled.')
 return redirect('booking-history')
@login_required
@staff_roles('TOURISM')
def booking_verify(request,token):
 b=get_object_or_404(Booking,qr_token=token)
 if request.method=='POST' and b.status in ('CONFIRMED','VISITED'):
  action=request.POST.get('action'); count=int(request.POST.get('visitor_count',b.visitor_count))
  allowed=(action=='ENTRY' and b.status=='CONFIRMED') or (action=='EXIT' and b.status=='VISITED')
  if allowed and 0<count<=b.visitor_count:
   VisitorEntry.objects.create(booking=b,action=action,recorded_by=request.user,visitor_count=count)
   if action=='ENTRY': b.status='VISITED'; b.save()
   messages.success(request,f'{action.title()} recorded.')
 return render(request,'core/verify.html',{'booking':b})
@login_required
def conflicts(request):
 qs=ConflictIncident.objects.select_related('reported_by','assigned_team'); role=getattr(getattr(request.user,'profile',None),'role','')
 if not (request.user.is_staff or role in ('ADMIN','OFFICER','RESCUE')): qs=qs.filter(reported_by=request.user)
 return _list(request,ConflictIncident,'Human-wildlife conflict reports','conflict-create',qs)
@login_required
def conflict_create(request):
 form=ConflictForm(request.POST or None,request.FILES or None)
 if form.is_valid(): c=form.save(commit=False); c.reported_by=request.user; c.save(); messages.success(request,'Conflict report recorded.'); return redirect('conflicts')
 return render(request,'core/form.html',{'form':form,'title':'Report a human-wildlife conflict'})
@login_required
@staff_roles('OFFICER','RESCUE')
def conflict_update(request,pk):
 c=get_object_or_404(ConflictIncident,pk=pk); form=ConflictUpdateForm(request.POST or None,instance=c)
 if form.is_valid():
  item=form.save(commit=False)
  if item.status in ('RESOLVED','CLOSED'): item.resolved_at=timezone.now()
  item.save(); notify_user(item.reported_by,'Conflict report updated',f'Your report is now {item.get_status_display()}.'); messages.success(request,'Conflict response updated.'); return redirect('conflicts')
 return render(request,'core/form.html',{'form':form,'title':'Update conflict response'})
@login_required
def map_view(request):
 points=[]; role='ADMIN' if request.user.is_superuser else getattr(getattr(request.user,'profile',None),'role','')
 operational=role in ('ADMIN','OFFICER','RESCUE')
 if operational:
  rows=([(x,x.get_incident_type_display(),'patrol') for x in PatrolIncident.objects.all()]+[(x,x.animal.species,'wildlife') for x in AnimalSighting.objects.select_related('animal')]+[(x,'Forest fire','fire') for x in FireIncident.objects.all()]+[(x,x.name,'plantation') for x in PlantationProject.objects.all()]+[(x,x.get_incident_type_display(),'conflict') for x in ConflictIncident.objects.all()])
 elif role=='TOURISM': rows=[]
 else:
  rows=([(x,'Forest fire','fire') for x in FireIncident.objects.filter(reported_by=request.user)]+[(x,x.get_incident_type_display(),'conflict') for x in ConflictIncident.objects.filter(reported_by=request.user)])
 rows += [(x,x.name,'tourism') for x in EcoLocation.objects.filter(is_active=True)]
 for obj,label,kind in rows:
  if obj.latitude is not None and obj.longitude is not None: points.append({'lat':float(obj.latitude),'lon':float(obj.longitude),'label':label,'kind':kind})
 return render(request,'core/map.html',{'points':points})
@login_required
def reports(request):
 return render(request,'core/reports.html',{'fires':FireIncident.objects.count(),'conflicts':ConflictIncident.objects.count(),'bookings':Booking.objects.count(),'plantations':PlantationProject.objects.count(),'monthly':list(FireIncident.objects.values('severity').annotate(total=Count('id')))})
@login_required

def profile(request):
 Profile.objects.get_or_create(user=request.user,defaults={'role':'ADMIN' if request.user.is_superuser else 'CITIZEN'})
 return render(request,'core/profile.html',{'notifications':request.user.notifications.order_by('-created_at')[:20]})
@login_required
@staff_roles('OFFICER','RESCUE')
def rescue_update(request,pk):
 case=get_object_or_404(RescueCase.objects.select_related('assigned_team'),pk=pk)
 role=getattr(getattr(request.user,'profile',None),'role','')
 if role=='RESCUE' and case.assigned_team_id!=request.user.id: return HttpResponseForbidden()
 form=RescueForm(request.POST or None,instance=case)
 if form.is_valid():
  item=form.save(commit=False)
  if item.status in ('RELEASED','TRANSFERRED','CLOSED'): item.resolved_at=timezone.now()
  item.save(); messages.success(request,'Rescue case updated.'); return redirect('rescues')
 return render(request,'core/form.html',{'form':form,'title':'Update rescue case'})
