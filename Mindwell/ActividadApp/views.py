from django.shortcuts import render

import json
from django.http             import JsonResponse
from django.views            import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth     import authenticate, login
from django.contrib.auth.models import User
from django.utils            import timezone
# Create your views here.


def require_login(fn):
    """Decorador: devuelve 401 si no hay sesión activa."""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        return fn(request, *args, **kwargs)
    return wrapper
 
 
def perfil_rol(user):
    """Devuelve el rol numérico del usuario desde su Perfil."""
    try:
        return user.perfil.rol_id   # 1=Admin, 2=Aprendiz, 3=Orientador
    except Exception:
        return None
 
 
def user_to_dict(user):
    """Serializa un User + Perfil al formato que espera el JS."""
    rol = perfil_rol(user)
    data = {
        'idUsuario':      user.id,
        'nombreCompleto': user.get_full_name() or user.username,
        'correo':         user.email,
        'rol':            rol,
    }
    if rol == 2:
        data['idEstudiante'] = user.id
    elif rol == 3:
        data['idOrientador'] = user.id
    elif rol == 1:
        data['idAdministrador'] = user.id
    return data