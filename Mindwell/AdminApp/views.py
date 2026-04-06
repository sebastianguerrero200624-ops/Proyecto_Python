import json
from datetime import date, timedelta
from collections import defaultdict
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.models import User
from django.template.loader import render_to_string
from django.db.models import Count
from django.utils import timezone

from AutenticarApp.models import Perfil
from GestionarCitasApp.models import Cita
from ActividadApp.models import ActividadAsignada
from ResultadoApp.models import Resultado
from .models import LogActividad, CambioRol


# ─────────────────────────────────────────────
#  DECORADOR: solo administradores (rol_id=1)
# ─────────────────────────────────────────────

def solo_admin(view_func):
    def wrapper(request, *args, **kwargs):
        try:
            if request.user.perfil.rol_id != 1:
                return HttpResponse('Sin permiso de administrador.', status=403)
        except Perfil.DoesNotExist:
            return HttpResponse('Sin perfil asignado.', status=403)
        return view_func(request, *args, **kwargs)
    wrapper.__name__ = view_func.__name__
    return wrapper


def _json_body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


ROL_LABEL = {1: 'Administrador', 2: 'Aprendiz', 3: 'Orientador'}
MESES_ES  = ['Ene','Feb','Mar','Abr','May','Jun',
             'Jul','Ago','Sep','Oct','Nov','Dic']


# ─────────────────────────────────────────────
#  VISTA: USUARIOS
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@solo_admin
def usuarios(request):
    return render(request, 'usuarios.html', {
        'nombres':   request.user.first_name,
        'apellidos': request.user.last_name,
    })


@login_required(login_url='/autenticar/login')
@solo_admin
def api_listar_usuarios(request):
    perfiles = Perfil.objects.select_related('user').all().order_by('-user__date_joined')
    data = []
    for p in perfiles:
        u = p.user
        data.append({
            'id':          u.pk,
            'nombres':     u.first_name,
            'apellidos':   u.last_name,
            'email':       u.email,
            'documento':   p.documento,
            'rol_id':      p.rol_id,
            'rol_label':   ROL_LABEL.get(p.rol_id, 'Desconocido'),
            'activo':      p.activo,
            'fecha_union': u.date_joined.strftime('%Y-%m-%d'),
        })
    return JsonResponse({'usuarios': data})


# ─────────────────────────────────────────────
#  API: CAMBIO DE ROL
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@solo_admin
@require_POST
def api_cambiar_rol(request, user_id):
    data      = _json_body(request)
    nuevo_rol = int(data.get('rol_nuevo', 0))

    if nuevo_rol not in (1, 2, 3):
        return JsonResponse({'error': 'Rol no válido. Debe ser 1, 2 o 3.'}, status=400)

    if user_id == request.user.pk and nuevo_rol != 1:
        return JsonResponse({'error': 'No puedes quitarte el rol de administrador a ti mismo.'}, status=400)

    usuario = get_object_or_404(User, pk=user_id)
    try:
        perfil = usuario.perfil
    except Perfil.DoesNotExist:
        return JsonResponse({'error': 'El usuario no tiene perfil asignado.'}, status=400)

    rol_anterior = perfil.rol_id

    if rol_anterior == nuevo_rol:
        return JsonResponse({'error': 'El usuario ya tiene ese rol.'}, status=400)

    perfil.rol_id = nuevo_rol
    perfil.save(update_fields=['rol_id'])

    CambioRol.objects.create(
        administrador=request.user,
        usuario_afectado=usuario,
        rol_anterior=rol_anterior,
        rol_nuevo=nuevo_rol,
    )

    return JsonResponse({
        'ok':        True,
        'mensaje':   f'Rol cambiado de {ROL_LABEL[rol_anterior]} a {ROL_LABEL[nuevo_rol]}.',
        'rol_nuevo': nuevo_rol,
        'rol_label': ROL_LABEL[nuevo_rol],
    })


# ─────────────────────────────────────────────
#  VISTA: REPORTES
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@solo_admin
def reportes(request):
    return render(request, 'reportes.html', {
        'nombres':   request.user.first_name,
        'apellidos': request.user.last_name,
    })


# ─────────────────────────────────────────────
#  API: DATOS PARA GRÁFICAS DE REPORTES
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@solo_admin
def api_datos_reporte(request):
    hoy = date.today()

    mes_str = request.GET.get('mes')
    if mes_str:
        try:
            año, mes = map(int, mes_str.split('-'))
            inicio = date(año, mes, 1)
            if mes == 12:
                fin = date(año + 1, 1, 1)
            else:
                fin = date(año, mes + 1, 1)
        except ValueError:
            inicio = date(hoy.year, hoy.month, 1)
            fin    = hoy + timedelta(days=1)
    else:
        inicio = date(hoy.year, hoy.month, 1)
        fin    = hoy + timedelta(days=1)

    citas_mes       = Cita.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin)
    actividades_mes = ActividadAsignada.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin)
    resultados_mes  = Resultado.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin)

    total_usuarios     = Perfil.objects.filter(activo=True).count()
    total_aprendices   = Perfil.objects.filter(rol_id=2, activo=True).count()
    total_instructores = Perfil.objects.filter(rol_id=3, activo=True).count()

    dias_mes = (fin - inicio).days
    citas_dia = defaultdict(int)
    act_dia   = defaultdict(int)
    res_dia   = defaultdict(int)

    for i in range(dias_mes):
        d = inicio + timedelta(days=i)
        citas_dia[str(d)] = 0
        act_dia[str(d)]   = 0
        res_dia[str(d)]   = 0

    for c in citas_mes:
        citas_dia[str(c.creado_en.date())] += 1
    for a in actividades_mes:
        act_dia[str(a.creado_en.date())] += 1
    for r in resultados_mes:
        res_dia[str(r.creado_en.date())] += 1

    fechas_keys = sorted(citas_dia.keys())

    top_aprendices_qs = (
        Cita.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin)
        .values('estudiante__first_name', 'estudiante__last_name', 'estudiante_id')
        .annotate(total=Count('id'))
        .order_by('-total')[:10]
    )
    top_aprendices = [
        {
            'nombre': f"{r['estudiante__first_name']} {r['estudiante__last_name']}".strip() or f"Usuario #{r['estudiante_id']}",
            'total':  r['total'],
        }
        for r in top_aprendices_qs
    ]

    roles = {
        'administradores': Perfil.objects.filter(rol_id=1).count(),
        'aprendices':       total_aprendices,
        'instructores':     total_instructores,
    }

    meses_labels = []
    meses_citas  = []
    for i in range(11, -1, -1):
        d   = date(hoy.year, hoy.month, 1) - timedelta(days=30 * i)
        lbl = f'{MESES_ES[d.month-1]} {str(d.year)[-2:]}'
        meses_labels.append(lbl)
        cnt = Cita.objects.filter(fecha__year=d.year, fecha__month=d.month).count()
        meses_citas.append(cnt)

    return JsonResponse({
        'periodo': {
            'inicio': str(inicio),
            'fin':    str(fin - timedelta(days=1)),
        },
        'totales': {
            'usuarios':     total_usuarios,
            'aprendices':   total_aprendices,
            'instructores': total_instructores,
            'citas':        citas_mes.count(),
            'actividades':  actividades_mes.count(),
            'resultados':   resultados_mes.count(),
        },
        'actividadDiaria': {
            'labels':      [str((inicio + timedelta(i)).day) + '/' + str(inicio.month) for i in range(dias_mes)],
            'citas':       [citas_dia[k] for k in fechas_keys],
            'actividades': [act_dia[k]   for k in fechas_keys],
            'resultados':  [res_dia[k]   for k in fechas_keys],
        },
        'topAprendices': top_aprendices,
        'roles':         roles,
        'citasPor12Meses': {
            'labels':     meses_labels,
            'cantidades': meses_citas,
        },
    })


# ─────────────────────────────────────────────
#  PDF: REPORTE GENERAL DEL MES
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@solo_admin
def generar_pdf_reporte(request):
    hoy     = date.today()
    mes_str = request.GET.get('mes', f'{hoy.year}-{hoy.month:02d}')

    try:
        año, mes = map(int, mes_str.split('-'))
        inicio   = date(año, mes, 1)
        fin      = date(año, mes + 1, 1) if mes < 12 else date(año + 1, 1, 1)
    except ValueError:
        inicio = date(hoy.year, hoy.month, 1)
        fin    = hoy + timedelta(days=1)

    perfiles        = Perfil.objects.select_related('user').filter(activo=True)
    citas_mes       = Cita.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin).select_related('estudiante', 'orientador')
    actividades_mes = ActividadAsignada.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin).select_related('estudiante', 'orientador')
    resultados_mes  = Resultado.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin).select_related('estudiante', 'orientador')

    top_aprendices = (
        Cita.objects.filter(creado_en__date__gte=inicio, creado_en__date__lt=fin)
        .values('estudiante__first_name', 'estudiante__last_name')
        .annotate(total=Count('id'))
        .order_by('-total')[:10]
    )

    contexto = {
        'mes_label':          f'{MESES_ES[inicio.month-1]} {inicio.year}',
        'fecha_gen':          hoy,
        'generado_por':       request.user,
        'total_usuarios':     perfiles.count(),
        'total_aprendices':   perfiles.filter(rol_id=2).count(),
        'total_instructores': perfiles.filter(rol_id=3).count(),
        'total_citas':        citas_mes.count(),
        'total_actividades':  actividades_mes.count(),
        'total_resultados':   resultados_mes.count(),
        'citas_mes':          citas_mes[:50],
        'actividades_mes':    actividades_mes[:30],
        'top_aprendices':     top_aprendices,
        'nuevos_usuarios':    Perfil.objects.filter(
            activo=True,
            user__date_joined__date__gte=inicio,
            user__date_joined__date__lt=fin
        ).select_related('user'),
    }

    html_string = render_to_string('pdf_reporte.html', contexto)

    try:
        from weasyprint import HTML as WP_HTML
        pdf = WP_HTML(string=html_string).write_pdf()
        resp = HttpResponse(pdf, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="reporte_{mes_str}.pdf"'
        return resp
    except ImportError:
        return HttpResponse(html_string, content_type='text/html')