import json
from datetime import datetime
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_http_methods
from django.contrib import messages
from django.contrib.auth.models import User

from AutenticarApp.models import Perfil
from GestionarCitasApp.models import Cita
from .models import Recurso, ActividadAsignada


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def _json_body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


def _get_perfil(user):
    try:
        return user.perfil
    except Perfil.DoesNotExist:
        return None


def _recurso_to_dict(r):
    return {
        'id':          r.pk,
        'titulo':      r.titulo,
        'descripcion': r.descripcion,
        'urlRecurso':  r.url_recurso,
        'activo':      r.activo,
        'creadoEn':    r.creado_en.strftime('%Y-%m-%d'),
    }


def _asignada_to_dict(a, rol):
    d = {
        'id':              a.pk,
        'titulo':          a.titulo,
        'descripcion':     a.descripcion,
        'urlActividad':    a.url_actividad,
        'estado':          a.estado,
        'fechaAsignacion': str(a.fecha_asignacion),
        'observacion':     a.observacion,
    }
    if rol == 3:   # orientador ve el nombre del estudiante
        d['nombreEstudiante'] = a.estudiante.get_full_name() or a.estudiante.username
        d['idEstudiante']     = a.estudiante.pk
    if rol == 2:   # estudiante ve el nombre del orientador
        d['nombreOrientador'] = a.orientador.get_full_name() or a.orientador.username
    return d


def _orientador_tiene_cita_finalizada(orientador, estudiante):
    """Verifica que exista al menos una cita FINALIZADA entre orientador y estudiante."""
    return Cita.objects.filter(
        orientador=orientador,
        estudiante=estudiante,
        estado='FINALIZADA'
    ).exists()


# ─────────────────────────────────────────────
#  VISTA PRINCIPAL (HTML)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def actividades(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id not in (2, 3):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')

    # Para el orientador: lista de aprendices con cita FINALIZADA con él
    aprendices_disponibles = []
    if perfil.rol_id == 3:
        ids_estudiantes = Cita.objects.filter(
            orientador=request.user,
            estado='FINALIZADA'
        ).values_list('estudiante_id', flat=True).distinct()

        aprendices_disponibles = [
            {'id': u.pk, 'nombre': u.get_full_name() or u.username}
            for u in User.objects.filter(pk__in=ids_estudiantes)
        ]

    contexto = {
        'rol':perfil.rol_id,
        'nombres':request.user.first_name,
        'apellidos':request.user.last_name,
        'rol_label':{2: 'Aprendiz', 3: 'Orientador'}.get(perfil.rol_id, ''),
        'aprendices_disponibles': aprendices_disponibles,
    }
    return render(request, 'actividades.html', contexto)


# ─────────────────────────────────────────────
#  API — RECURSOS
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_listar_recursos(request):
    """
    - Aprendiz (rol 2): solo ve recursos ACTIVOS.
    - Orientador (rol 3): ve todos (activos e inactivos) para poder gestionarlos.
    """
    perfil = _get_perfil(request.user)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil.'}, status=403)

    if perfil.rol_id == 2:
        recursos = Recurso.objects.filter(activo=True)
    else:
        # El orientador puede filtrar por activo si quiere
        solo_activos = request.GET.get('activos')
        if solo_activos == '1':
            recursos = Recurso.objects.filter(activo=True)
        else:
            recursos = Recurso.objects.all()

    return JsonResponse({'recursos': [_recurso_to_dict(r) for r in recursos]})


@login_required(login_url='/autenticar/login')
@require_POST
def api_crear_recurso(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'Solo los orientadores pueden crear recursos.'}, status=403)

    data = _json_body(request)
    titulo      = data.get('titulo', '').strip()
    descripcion = data.get('descripcion', '').strip()
    url         = data.get('url_recurso', '').strip()

    if not titulo:
        return JsonResponse({'error': 'El título es obligatorio.'}, status=400)

    if len(titulo) > 150:
        return JsonResponse({'error': 'El título no puede superar 150 caracteres.'}, status=400)

    if len(descripcion) > 400:
        return JsonResponse({'error': 'La descripción no puede superar 400 caracteres.'}, status=400)

    recurso = Recurso.objects.create(
        titulo=titulo,
        descripcion=descripcion,
        url_recurso=url,
        creado_por=request.user,
        activo=True,
    )
    return JsonResponse({'ok': True, 'id': recurso.pk, 'mensaje': 'Recurso creado exitosamente.'}, status=201)


@login_required(login_url='/autenticar/login')
@require_http_methods(['PUT'])
def api_editar_recurso(request, recurso_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    recurso = get_object_or_404(Recurso, pk=recurso_id, creado_por=request.user)
    data = _json_body(request)

    titulo = data.get('titulo', recurso.titulo).strip()
    if not titulo:
        return JsonResponse({'error': 'El título es obligatorio.'}, status=400)

    recurso.titulo      = titulo
    recurso.descripcion = data.get('descripcion', recurso.descripcion).strip()
    recurso.url_recurso = data.get('url_recurso', recurso.url_recurso).strip()
    recurso.save()
    return JsonResponse({'ok': True, 'mensaje': 'Recurso actualizado.'})


@login_required(login_url='/autenticar/login')
@require_POST
def api_toggle_recurso(request, recurso_id):
    """
    Soft-delete / reactivar: alterna el campo `activo` del recurso.
    El recurso NUNCA se elimina de la base de datos.
    """
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    recurso = get_object_or_404(Recurso, pk=recurso_id, creado_por=request.user)
    recurso.activo = not recurso.activo
    recurso.save(update_fields=['activo'])

    estado = 'activado' if recurso.activo else 'desactivado'
    return JsonResponse({'ok': True, 'activo': recurso.activo, 'mensaje': f'Recurso {estado} correctamente.'})


@login_required(login_url='/autenticar/login')
@require_http_methods(['DELETE'])
def api_eliminar_recurso(request, recurso_id):
    """
    Eliminación REAL — solo disponible para el orientador creador.
    Nota: el frontend ya no llama a este endpoint para recursos;
    usa toggle en su lugar. Se mantiene para compatibilidad.
    """
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    recurso = get_object_or_404(Recurso, pk=recurso_id, creado_por=request.user)
    recurso.delete()
    return JsonResponse({'ok': True, 'mensaje': 'Recurso eliminado.'})


# ─────────────────────────────────────────────
#  API — ACTIVIDADES ASIGNADAS
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_listar_asignadas(request):
    perfil = _get_perfil(request.user)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil.'}, status=403)

    if perfil.rol_id == 2:
        qs = ActividadAsignada.objects.filter(estudiante=request.user)
    elif perfil.rol_id == 3:
        qs = ActividadAsignada.objects.filter(orientador=request.user)
    else:
        return JsonResponse({'error': 'Rol no autorizado.'}, status=403)

    # Filtros opcionales
    estado = request.GET.get('estado')
    if estado in ('Pendiente', 'Completada'):
        qs = qs.filter(estado=estado)

    return JsonResponse({'actividades': [_asignada_to_dict(a, perfil.rol_id) for a in qs]})


@login_required(login_url='/autenticar/login')
@require_POST
def api_crear_asignada(request):
    """
    El orientador asigna una actividad a un aprendiz.
    VALIDACIÓN: debe existir una Cita FINALIZADA entre ellos.
    """
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'Solo los orientadores pueden asignar actividades.'}, status=403)

    data          = _json_body(request)
    estudiante_id = data.get('estudiante_id')
    titulo        = data.get('titulo', '').strip()
    descripcion   = data.get('descripcion', '').strip()
    url           = data.get('url_actividad', '').strip()
    recurso_id    = data.get('recurso_id')
    observacion   = data.get('observacion', '').strip()

    # Validaciones
    if not estudiante_id:
        return JsonResponse({'error': 'Debes seleccionar un aprendiz.'}, status=400)
    if not titulo:
        return JsonResponse({'error': 'El título es obligatorio.'}, status=400)
    if len(titulo) > 150:
        return JsonResponse({'error': 'El título no puede superar 150 caracteres.'}, status=400)

    try:
        estudiante = User.objects.get(pk=estudiante_id)
        ep = estudiante.perfil
        if ep.rol_id != 2 or not ep.activo:
            raise ValueError('Estudiante inactivo o con rol incorrecto.')
    except (User.DoesNotExist, Perfil.DoesNotExist, ValueError) as ex:
        return JsonResponse({'error': str(ex) or 'Estudiante no válido.'}, status=400)

    # Validación clave: cita finalizada
    if not _orientador_tiene_cita_finalizada(request.user, estudiante):
        return JsonResponse({
            'error': (
                'No puedes asignar una actividad a este aprendiz. '
                'Debes tener al menos una cita FINALIZADA con él.'
            )
        }, status=403)

    recurso = None
    if recurso_id:
        try:
            recurso = Recurso.objects.get(pk=recurso_id)
        except Recurso.DoesNotExist:
            pass

    actividad = ActividadAsignada.objects.create(
        orientador=request.user,
        estudiante=estudiante,
        recurso=recurso,
        titulo=titulo,
        descripcion=descripcion,
        url_actividad=url,
        observacion=observacion,
        estado='Pendiente',
    )
    return JsonResponse({'ok': True, 'id': actividad.pk, 'mensaje': 'Actividad asignada correctamente.'}, status=201)


@login_required(login_url='/autenticar/login')
@require_http_methods(['PUT'])
def api_editar_asignada(request, asignada_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    act  = get_object_or_404(ActividadAsignada, pk=asignada_id, orientador=request.user)
    data = _json_body(request)

    titulo = data.get('titulo', act.titulo).strip()
    if not titulo:
        return JsonResponse({'error': 'El título es obligatorio.'}, status=400)

    act.titulo        = titulo
    act.descripcion   = data.get('descripcion', act.descripcion).strip()
    act.url_actividad = data.get('url_actividad', act.url_actividad).strip()
    act.observacion   = data.get('observacion', act.observacion).strip()
    act.save()
    return JsonResponse({'ok': True, 'mensaje': 'Actividad actualizada.'})


@login_required(login_url='/autenticar/login')
@require_http_methods(['DELETE'])
def api_eliminar_asignada(request, asignada_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    act = get_object_or_404(ActividadAsignada, pk=asignada_id, orientador=request.user)
    act.delete()
    return JsonResponse({'ok': True, 'mensaje': 'Actividad eliminada.'})


@login_required(login_url='/autenticar/login')
@require_POST
def api_completar_asignada(request, asignada_id):
    """Solo el estudiante puede marcar su actividad como completada."""
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 2:
        return JsonResponse({'error': 'Solo el aprendiz puede completar actividades.'}, status=403)

    act = get_object_or_404(ActividadAsignada, pk=asignada_id, estudiante=request.user)

    if act.estado == 'Completada':
        return JsonResponse({'error': 'La actividad ya está completada.'}, status=400)

    act.estado           = 'Completada'
    act.fecha_completado = datetime.now()
    act.save(update_fields=['estado', 'fecha_completado'])
    return JsonResponse({'ok': True, 'mensaje': 'Actividad marcada como completada.'})


@login_required(login_url='/autenticar/login')
def api_detalle_asignada(request, asignada_id):
    perfil = _get_perfil(request.user)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil.'}, status=403)

    if perfil.rol_id == 2:
        act = get_object_or_404(ActividadAsignada, pk=asignada_id, estudiante=request.user)
    elif perfil.rol_id == 3:
        act = get_object_or_404(ActividadAsignada, pk=asignada_id, orientador=request.user)
    else:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    return JsonResponse(_asignada_to_dict(act, perfil.rol_id))


# ─────────────────────────────────────────────
#  API — APRENDICES CON CITA FINALIZADA
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_aprendices_disponibles(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    ids = Cita.objects.filter(
        orientador=request.user,
        estado='FINALIZADA'
    ).values_list('estudiante_id', flat=True).distinct()

    aprendices = []
    for uid in ids:
        try:
            u = User.objects.get(pk=uid)
            aprendices.append({'id': u.pk, 'nombre': u.get_full_name() or u.username})
        except User.DoesNotExist:
            pass

    return JsonResponse({'aprendices': aprendices})