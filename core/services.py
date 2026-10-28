from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from .models import Booking,Notification
def notify_user(user,subject,message):
 Notification.objects.create(recipient=user,subject=subject,message=message)
 if getattr(user,'email',''): send_mail(subject,message,settings.DEFAULT_FROM_EMAIL,[user.email],fail_silently=True)
def book_slot(*,destination,tourist,form_data):
 with transaction.atomic():
  loc=type(destination).objects.select_for_update().get(pk=destination.pk)
  total=Booking.objects.filter(destination=loc,visit_date=form_data['visit_date'],time_slot=form_data['time_slot'],status='CONFIRMED').aggregate(n=Sum('visitor_count'))['n'] or 0
  if total+form_data['visitor_count']>loc.capacity_per_slot: return None
  booking=Booking.objects.create(destination=loc,tourist=tourist,**form_data)
 notify_user(tourist,'Booking confirmed',f'Booking {booking.booking_id} is confirmed for {loc.name} on {booking.visit_date}. Payment is due on arrival.')
 return booking
