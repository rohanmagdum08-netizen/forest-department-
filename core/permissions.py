from functools import wraps
from django.contrib import messages
from django.shortcuts import redirect
def roles_required(*roles):
 def deco(view):
  @wraps(view)
  def wrapped(request,*args,**kwargs):
   if not request.user.is_authenticated: return redirect('login')
   role='ADMIN' if request.user.is_superuser else getattr(getattr(request.user,'profile',None),'role','')
   if role not in roles:
    messages.error(request,'You do not have access to that page.'); return redirect('dashboard')
   return view(request,*args,**kwargs)
  return wrapped
 return deco
def staff_roles(*roles): return roles_required('ADMIN',*roles)
