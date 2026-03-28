from datetime import date, timedelta
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_http_methods
from django.contrib import messages
from django.contrib.auth.models import User
from django.utils import timezone
import json

from AutenticarApp.models import Perfil
from .models import Cita


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def _json_body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


def _cita_to_dict(cita, rol):
    """Serializa una Cita a dict para JSON responses."""
    d = {
        'id':           cita.pk,
        'fecha':        str(cita.fecha),
        'hora':         str(cita.hora)[:5],
        'motivo':       cita.motivo,
        'estado':       cita.estado,
        'fechaEfectiva': str(cita.fecha_efectiva),
        'horaEfectiva':  str(cita.hora_efectiva)[:5],
        'creadoEn':     cita.creado_en.strftime('%Y-%m-%d %H:%M'),
    }
    if rol == 3:  # orientador ve el nombre del estudiante
        d['nombreEstudiante'] = cita.estudiante.get_full_name() or cita.estudiante.username
    if rol == 2:  # estudiante ve el nombre del orientador
        d['nombreOrientador'] = cita.orientador.get_full_name() or cita.orientador.username
    return d


def _get_perfil(user):
    try:
        return user.perfil
    except Perfil.DoesNotExist:
        return None


def _fecha_valida(fecha_str):
    """
    Devuelve (fecha, error_str).
    Reglas: mínimo mañana, máximo 2 meses desde hoy.
    """
    try:
        fecha = date.fromisoformat(fecha_str)
    except (ValueError, TypeError):
        return None, 'Formato de fecha inválido.'

    hoy    = date.today()
    minima = hoy + timedelta(days=1)
    maxima = hoy + timedelta(days=60)

    if fecha < minima:
        return None, 'La fecha mínima para una cita es mañana.'
    if fecha > maxima:
        return None, 'La fecha máxima es 2 meses desde hoy.'

    return fecha, None


def _orientador_disponible(orientador, fecha, hora, excluir_cita_id=None):
    """Verifica que el orientador no tenga otra cita aprobada/pendiente en esa fecha+hora."""
    qs = Cita.objects.filter(
        orientador=orientador,
        estado__in=('PENDIENTE', 'APROBADA', 'REPROGRAMADA'),
    ).filter(
        # Chequea tanto fecha original como reprogramada
        fecha=fecha, hora=hora,
    )
    if excluir_cita_id:
        qs = qs.exclude(pk=excluir_cita_id)
    return not qs.exists()


def _orientador_tiene_cupo(orientador):
    """Máximo 4 citas pendientes por orientador."""
    return Cita.objects.filter(
        orientador=orientador,
        estado='PENDIENTE'
    ).count() < 4


# ─────────────────────────────────────────────
#  VISTA PRINCIPAL (HTML)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def gestionar_citas(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id not in (2, 3):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')

    # Lista de orientadores activos con cupo disponible (para el select del estudiante)
    orientadores = []
    if perfil.rol_id == 2:
        for p in Perfil.objects.filter(rol_id=3, activo=True).select_related('user'):
            if _orientador_tiene_cupo(p.user):
                orientadores.append({
                    'id':     p.user.pk,
                    'nombre': p.user.get_full_name() or p.user.username,
                })

    contexto = {
        'rol':          perfil.rol_id,
        'nombres':      request.user.first_name,
        'apellidos':    request.user.last_name,
        'rol_label':    {2: 'Aprendiz', 3: 'Instructor'}.get(perfil.rol_id, ''),
        'orientadores': orientadores,
    }
    return render(request, 'gestionar_citas.html', contexto)


# ─────────────────────────────────────────────
#  API — LISTAR CITAS
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_listar_citas(request):
    perfil = _get_perfil(request.user)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil'}, status=403)

    if perfil.rol_id == 2:
        citas = Cita.objects.filter(estudiante=request.user)
    elif perfil.rol_id == 3:
        citas = Cita.objects.filter(orientador=request.user)
    else:
        return JsonResponse({'error': 'Rol no autorizado'}, status=403)

    # Filtros opcionales via GET
    estado = request.GET.get('estado')
    fecha  = request.GET.get('fecha')
    if estado:
        citas = citas.filter(estado=estado)
    if fecha:
        citas = citas.filter(fecha=fecha)

    return JsonResponse({
        'citas': [_cita_to_dict(c, perfil.rol_id) for c in citas]
    })


# ─────────────────────────────────────────────
#  API — LISTAR ORIENTADORES CON CUPO
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_orientadores(request):
    orientadores = []
    for p in Perfil.objects.filter(rol_id=3, activo=True).select_related('user'):
        if _orientador_tiene_cupo(p.user):
            orientadores.append({
                'id':     p.user.pk,
                'nombre': p.user.get_full_name() or p.user.username,
            })
    return JsonResponse({'orientadores': orientadores})


# ─────────────────────────────────────────────
#  API — CREAR CITA (solo estudiante)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@require_POST
def api_crear_cita(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 2:
        return JsonResponse({'error': 'Solo los aprendices pueden solicitar citas.'}, status=403)

    data         = _json_body(request)
    orientador_id = data.get('orientador_id')
    fecha_str    = data.get('fecha')
    hora_str     = data.get('hora')
    motivo       = data.get('motivo', '').strip()

    # Validaciones básicas
    if not all([orientador_id, fecha_str, hora_str, motivo]):
        return JsonResponse({'error': 'Todos los campos son obligatorios.'}, status=400)

    fecha, err = _fecha_valida(fecha_str)
    if err:
        return JsonResponse({'error': err}, status=400)

    try:
        hora = __import__('datetime').time.fromisoformat(hora_str)
    except ValueError:
        return JsonResponse({'error': 'Formato de hora inválido.'}, status=400)

    try:
        orientador = User.objects.get(pk=orientador_id)
        o_perfil   = orientador.perfil
        if o_perfil.rol_id != 3 or not o_perfil.activo:
            raise ValueError
    except (User.DoesNotExist, Perfil.DoesNotExist, ValueError):
        return JsonResponse({'error': 'Orientador no válido.'}, status=400)

    if not _orientador_tiene_cupo(orientador):
        return JsonResponse({'error': 'El orientador ya tiene el máximo de citas pendientes (4). Elige otro.'}, status=400)

    if not _orientador_disponible(orientador, fecha, hora):
        return JsonResponse({'error': 'El orientador no está disponible en esa fecha y hora.'}, status=400)

    cita = Cita.objects.create(
        estudiante=request.user,
        orientador=orientador,
        fecha=fecha,
        hora=hora,
        motivo=motivo,
        estado='PENDIENTE',
    )
    return JsonResponse({'ok': True, 'id': cita.pk, 'mensaje': 'Cita solicitada exitosamente.'}, status=201)


# ─────────────────────────────────────────────
#  API — APROBAR CITA (solo orientador)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@require_POST
def api_aprobar_cita(request, cita_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'Solo los orientadores pueden aprobar citas.'}, status=403)

    cita = get_object_or_404(Cita, pk=cita_id, orientador=request.user)

    if not cita.puede_aprobar:
        return JsonResponse({'error': f'No se puede aprobar una cita en estado {cita.estado}.'}, status=400)

    cita.estado = 'APROBADA'
    cita.save(update_fields=['estado', 'actualizado'])
    return JsonResponse({'ok': True, 'mensaje': 'Cita aprobada.'})


# ─────────────────────────────────────────────
#  API — REPROGRAMAR CITA (solo orientador, solo si APROBADA)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@require_POST
def api_reprogramar_cita(request, cita_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'Solo los orientadores pueden reprogramar citas.'}, status=403)

    cita = get_object_or_404(Cita, pk=cita_id, orientador=request.user)

    if not cita.puede_reprogramar_orientador:
        return JsonResponse(
            {'error': f'Solo se pueden reprogramar citas en estado APROBADA. Esta está en {cita.estado}.'},
            status=400
        )

    data      = _json_body(request)
    fecha_str = data.get('fecha')
    hora_str  = data.get('hora')
    motivo_r  = data.get('motivo', '').strip()

    fecha, err = _fecha_valida(fecha_str)
    if err:
        return JsonResponse({'error': err}, status=400)

    try:
        hora = __import__('datetime').time.fromisoformat(hora_str)
    except ValueError:
        return JsonResponse({'error': 'Formato de hora inválido.'}, status=400)

    if not _orientador_disponible(cita.orientador, fecha, hora, excluir_cita_id=cita.pk):
        return JsonResponse({'error': 'Ya tienes otra cita en esa fecha y hora.'}, status=400)

    cita.fecha_reprogramada    = fecha
    cita.hora_reprogramada     = hora
    cita.motivo_reprogramacion = motivo_r
    cita.estado                = 'REPROGRAMADA'
    cita.save(update_fields=['fecha_reprogramada', 'hora_reprogramada',
                              'motivo_reprogramacion', 'estado', 'actualizado'])
    return JsonResponse({'ok': True, 'mensaje': 'Cita reprogramada exitosamente.'})


# ─────────────────────────────────────────────
#  API — CANCELAR CITA
#  Estudiante: solo PENDIENTE
#  Orientador: PENDIENTE o APROBADA
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@require_POST
def api_cancelar_cita(request, cita_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id not in (2, 3):
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    if perfil.rol_id == 2:
        cita = get_object_or_404(Cita, pk=cita_id, estudiante=request.user)
        if not cita.puede_cancelar_estudiante:
            return JsonResponse(
                {'error': 'Solo puedes cancelar citas en estado PENDIENTE.'},
                status=400
            )
    else:
        cita = get_object_or_404(Cita, pk=cita_id, orientador=request.user)
        if cita.estado not in ('PENDIENTE', 'APROBADA', 'REPROGRAMADA'):
            return JsonResponse(
                {'error': f'No se puede cancelar una cita en estado {cita.estado}.'},
                status=400
            )

    cita.estado = 'CANCELADA'
    cita.save(update_fields=['estado', 'actualizado'])
    return JsonResponse({'ok': True, 'mensaje': 'Cita cancelada.'})


# ─────────────────────────────────────────────
#  API — FINALIZAR CITA (solo orientador, solo APROBADA)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@require_POST
def api_finalizar_cita(request, cita_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'Solo los orientadores pueden finalizar citas.'}, status=403)

    cita = get_object_or_404(Cita, pk=cita_id, orientador=request.user)

    if not cita.puede_finalizar:
        return JsonResponse(
            {'error': f'Solo se pueden finalizar citas en estado APROBADA. Esta está en {cita.estado}.'},
            status=400
        )

    cita.estado = 'FINALIZADA'
    cita.save(update_fields=['estado', 'actualizado'])
    return JsonResponse({'ok': True, 'mensaje': 'Cita finalizada.'})


# ─────────────────────────────────────────────
#  API — DETALLE DE UNA CITA
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_detalle_cita(request, cita_id):
    perfil = _get_perfil(request.user)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil.'}, status=403)

    if perfil.rol_id == 2:
        cita = get_object_or_404(Cita, pk=cita_id, estudiante=request.user)
    elif perfil.rol_id == 3:
        cita = get_object_or_404(Cita, pk=cita_id, orientador=request.user)
    else:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    return JsonResponse(_cita_to_dict(cita, perfil.rol_id))


# ─────────────────────────────────────────────
#  API — CITAS PENDIENTES (para modal de aprobar del orientador)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_citas_pendientes(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    citas = Cita.objects.filter(orientador=request.user, estado='PENDIENTE')
    return JsonResponse({
        'citas': [_cita_to_dict(c, 3) for c in citas]
    })