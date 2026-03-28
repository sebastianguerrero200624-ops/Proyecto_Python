from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from AutenticarApp.models import Perfil


# ──────────────────────────────────────────────
#  INICIO (raíz → redirige al dashboard si ya inició sesión)
# ──────────────────────────────────────────────

def inicio(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    return redirect('login')


# ──────────────────────────────────────────────
#  DASHBOARD ÚNICO (contenido dinámico por rol)
# ──────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def dashboard(request):
    try:
        perfil = request.user.perfil
        rol    = perfil.rol_id
    except Perfil.DoesNotExist:
        rol = 1  # superusuario sin perfil → trata como admin

    ROL_LABEL = {1: 'Administrador', 2: 'Aprendiz', 3: 'Instructor'}

    contexto = {
        'nombres':   request.user.first_name,
        'apellidos': request.user.last_name,
        'rol':       rol,
        'rol_label': ROL_LABEL.get(rol, 'Usuario'),
    }
    return render(request, 'dashboard.html', contexto)


# ──────────────────────────────────────────────
#  API — ESTADÍSTICAS
# ──────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_estadisticas(request):
    return JsonResponse({
        'success':           True,
        'totalUsuarios':     Perfil.objects.filter(activo=True).count(),
        'totalAprendices':   Perfil.objects.filter(rol_id=2, activo=True).count(),
        'totalOrientadores': Perfil.objects.filter(rol_id=3, activo=True).count(),
    })