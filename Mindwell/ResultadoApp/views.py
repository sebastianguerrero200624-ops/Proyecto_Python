import json
from collections import defaultdict
from datetime import date, timedelta
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST, require_http_methods
from django.contrib import messages
from django.contrib.auth.models import User
from django.template.loader import render_to_string
from django.utils import timezone

from AutenticarApp.models import Perfil
from GestionarCitasApp.models import Cita
from ActividadApp.models import ActividadAsignada
from .models import Resultado


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def _get_perfil(user):
    try:
        return user.perfil
    except Perfil.DoesNotExist:
        return None


def _json_body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


def _resultado_to_dict(r, rol):
    d = {
        'id':                 r.pk,
        'citaId':             r.cita_id,
        'fechaEvaluacion':    str(r.fecha_evaluacion),
        'fechaCita':          str(r.cita.fecha),
        'puntuacionEstres':   r.puntuacion_estres,
        'puntuacionAnsiedad': r.puntuacion_ansiedad,
        'nivelDetectado':     r.nivel_detectado,
        'avanceObservado':    r.avance_observado,
        'recomendaciones':    r.recomendaciones,
        'observaciones':      r.observaciones,
        'requiereSeguimiento': r.requiere_seguimiento,
        'asistio':            r.asistio,
        'motivoCita':         r.cita.motivo,
    }
    if rol == 3:
        d['nombreEstudiante'] = r.estudiante.get_full_name() or r.estudiante.username
        d['idEstudiante']     = r.estudiante_id
    if rol == 2:
        d['nombreOrientador'] = r.orientador.get_full_name() or r.orientador.username
    return d


def _nivel_desde_puntuacion(estres, ansiedad):
    promedio = (estres + ansiedad) / 2
    if promedio <= 33:
        return 'BAJO'
    elif promedio <= 66:
        return 'MEDIO'
    return 'ALTO'


MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun',
            'Jul','Ago','Sep','Oct','Nov','Dic']
DIAS_ES  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

PALABRAS_ANSIEDAD = ['ansiedad','pánico','nervios','miedo','angustia','inseguridad']
PALABRAS_ESTRES   = ['estrés','estres','burnout','cansancio','agotamiento','presión','tension']


def _clasificar_motivo(motivo):
    m = motivo.lower()
    for p in PALABRAS_ANSIEDAD:
        if p in m:
            return 'ansiedad'
    for p in PALABRAS_ESTRES:
        if p in m:
            return 'estres'
    return 'otro'


def _build_estadisticas(citas_qs, resultados_qs):
    """Construye todos los datos para las gráficas."""
    hoy = date.today()

    # ── Citas por mes (últimos 12 meses) ──
    meses_labels = []
    meses_data   = defaultdict(int)
    for i in range(11, -1, -1):
        d = date(hoy.year, hoy.month, 1) - timedelta(days=30 * i)
        lbl = f'{MESES_ES[d.month - 1]} {d.year}'
        meses_labels.append(lbl)
        meses_data[lbl] = 0

    for c in citas_qs:
        lbl = f'{MESES_ES[c.fecha.month - 1]} {c.fecha.year}'
        if lbl in meses_data:
            meses_data[lbl] += 1

    # ── Motivos clasificados ──
    motivos = {'ansiedad': 0, 'estres': 0, 'otro': 0}
    for c in citas_qs:
        motivos[_clasificar_motivo(c.motivo)] += 1

    # ── Niveles de estrés ──
    niveles = {'bajo': 0, 'medio': 0, 'alto': 0}
    for r in resultados_qs:
        niveles[r.nivel_detectado.lower()] += 1

    # ── Horarios más frecuentes ──
    horas_data = defaultdict(int)
    for c in citas_qs:
        h = c.hora.strftime('%H:%M')
        horas_data[h] += 1
    horas_sorted = sorted(horas_data.items(), key=lambda x: -x[1])[:8]

    # ── Días de la semana ──
    dias = [0] * 7
    for c in citas_qs:
        dias[c.fecha.weekday()] += 1

    # ── Stats rápidas ──
    promedio_estres = 0
    if resultados_qs:
        promedio_estres = round(
            sum(r.puntuacion_estres for r in resultados_qs) / len(resultados_qs), 1
        )

    citas_este_mes = sum(
        1 for c in citas_qs
        if c.fecha.month == hoy.month and c.fecha.year == hoy.year
    )

    # ── Evaluaciones recientes (tabla) ──
    evaluaciones = [_resultado_to_dict(r, 3) for r in
                    sorted(resultados_qs, key=lambda x: x.fecha_evaluacion, reverse=True)[:20]]

    return {
        'citasPorMes':    {'meses': meses_labels, 'cantidades': [meses_data[m] for m in meses_labels]},
        'motivosClasificados': motivos,
        'nivelesEstres':  niveles,
        'citasPorHora':   {'horas': [h[0] for h in horas_sorted], 'cantidades': [h[1] for h in horas_sorted]},
        'citasPorDia':    {'cantidades': dias},
        'estadisticas': {
            'totalCitas':       len(list(citas_qs)),
            'totalEvaluaciones': len(list(resultados_qs)),
            'promedioEstres':   promedio_estres,
            'citasEsteMes':     citas_este_mes,
        },
        'evaluacionesRecientes': evaluaciones,
    }


# ─────────────────────────────────────────────
#  VISTA PRINCIPAL (HTML)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def resultados(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id not in (2, 3):
        messages.error(request, 'Sin permiso para esta sección.')
        return redirect('dashboard')

    # Citas con resultado ya registrado (para que el orientador no cree duplicados)
    citas_sin_resultado = []
    if perfil.rol_id == 3:
        citas_sin_resultado = list(
            Cita.objects.filter(
                orientador=request.user,
                estado='FINALIZADA'
            ).exclude(resultado__isnull=False)
            .select_related('estudiante')
        )

    contexto = {
        'rol':               perfil.rol_id,
        'nombres':           request.user.first_name,
        'apellidos':         request.user.last_name,
        'rol_label':         {2: 'Aprendiz', 3: 'Orientador'}.get(perfil.rol_id, ''),
        'citas_sin_resultado': citas_sin_resultado,
    }
    return render(request, 'resultados.html', contexto)


# ─────────────────────────────────────────────
#  API — DATOS PARA GRÁFICAS
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_datos_graficas(request):
    perfil = _get_perfil(request.user)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil.'}, status=403)

    if perfil.rol_id == 2:
        citas_qs      = list(Cita.objects.filter(estudiante=request.user))
        resultados_qs = list(Resultado.objects.filter(estudiante=request.user).select_related('cita'))

    elif perfil.rol_id == 3:
        id_est = request.GET.get('idEstudiante')
        if id_est:
            citas_qs      = list(Cita.objects.filter(orientador=request.user, estudiante_id=id_est))
            resultados_qs = list(Resultado.objects.filter(orientador=request.user, estudiante_id=id_est).select_related('cita'))
        else:
            citas_qs      = list(Cita.objects.filter(orientador=request.user))
            resultados_qs = list(Resultado.objects.filter(orientador=request.user).select_related('cita'))
    else:
        return JsonResponse({'error': 'Rol no autorizado.'}, status=403)

    return JsonResponse(_build_estadisticas(citas_qs, resultados_qs))


# ─────────────────────────────────────────────
#  API — LISTAR RESULTADOS
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_listar_resultados(request):
    perfil = _get_perfil(request.user)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil.'}, status=403)

    if perfil.rol_id == 2:
        qs = Resultado.objects.filter(estudiante=request.user).select_related('cita', 'orientador')
    elif perfil.rol_id == 3:
        qs = Resultado.objects.filter(orientador=request.user).select_related('cita', 'estudiante')
    else:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    return JsonResponse({'resultados': [_resultado_to_dict(r, perfil.rol_id) for r in qs]})


# ─────────────────────────────────────────────
#  API — CREAR RESULTADO (solo orientador)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@require_POST
def api_crear_resultado(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'Solo los orientadores pueden crear resultados.'}, status=403)

    data    = _json_body(request)
    cita_id = data.get('cita_id')

    if not cita_id:
        return JsonResponse({'error': 'El ID de la cita es obligatorio.'}, status=400)

    cita = get_object_or_404(Cita, pk=cita_id, orientador=request.user, estado='FINALIZADA')

    # Verificar que no exista ya un resultado para esta cita
    if Resultado.objects.filter(cita=cita).exists():
        return JsonResponse({'error': 'Esta cita ya tiene un resultado registrado.'}, status=400)

    p_estres   = min(max(int(data.get('puntuacion_estres',   0)), 0), 100)
    p_ansiedad = min(max(int(data.get('puntuacion_ansiedad', 0)), 0), 100)

    resultado = Resultado.objects.create(
        cita=cita,
        orientador=request.user,
        estudiante=cita.estudiante,
        puntuacion_estres=p_estres,
        puntuacion_ansiedad=p_ansiedad,
        nivel_detectado=_nivel_desde_puntuacion(p_estres, p_ansiedad),
        avance_observado=data.get('avance_observado', '').strip(),
        recomendaciones=data.get('recomendaciones', '').strip(),
        observaciones=data.get('observaciones', '').strip(),
        requiere_seguimiento=bool(data.get('requiere_seguimiento', False)),
        asistio=bool(data.get('asistio', True)),
    )
    return JsonResponse({'ok': True, 'id': resultado.pk, 'mensaje': 'Resultado registrado correctamente.'}, status=201)


# ─────────────────────────────────────────────
#  API — EDITAR RESULTADO (solo orientador)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
@require_http_methods(['PUT'])
def api_editar_resultado(request, resultado_id):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    resultado = get_object_or_404(Resultado, pk=resultado_id, orientador=request.user)
    data = _json_body(request)

    p_estres   = min(max(int(data.get('puntuacion_estres',   resultado.puntuacion_estres)),   0), 100)
    p_ansiedad = min(max(int(data.get('puntuacion_ansiedad', resultado.puntuacion_ansiedad)), 0), 100)

    resultado.puntuacion_estres    = p_estres
    resultado.puntuacion_ansiedad  = p_ansiedad
    resultado.nivel_detectado      = _nivel_desde_puntuacion(p_estres, p_ansiedad)
    resultado.avance_observado     = data.get('avance_observado',  resultado.avance_observado).strip()
    resultado.recomendaciones      = data.get('recomendaciones',   resultado.recomendaciones).strip()
    resultado.observaciones        = data.get('observaciones',     resultado.observaciones).strip()
    resultado.requiere_seguimiento = bool(data.get('requiere_seguimiento', resultado.requiere_seguimiento))
    resultado.asistio              = bool(data.get('asistio', resultado.asistio))
    resultado.save()
    return JsonResponse({'ok': True, 'mensaje': 'Resultado actualizado.'})


# ─────────────────────────────────────────────
#  API — CITAS FINALIZADAS SIN RESULTADO (para el select del modal)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_citas_sin_resultado(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    citas = Cita.objects.filter(
        orientador=request.user,
        estado='FINALIZADA'
    ).exclude(resultado__isnull=False).select_related('estudiante')

    data = [{
        'id':       c.pk,
        'fecha':    str(c.fecha),
        'hora':     str(c.hora)[:5],
        'motivo':   c.motivo[:60],
        'estudiante': c.estudiante.get_full_name() or c.estudiante.username,
    } for c in citas]

    return JsonResponse({'citas': data})


# ─────────────────────────────────────────────
#  API — APRENDICES DEL ORIENTADOR (para filtro)
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def api_aprendices_orientador(request):
    perfil = _get_perfil(request.user)
    if not perfil or perfil.rol_id != 3:
        return JsonResponse({'error': 'No autorizado.'}, status=403)

    ids = Cita.objects.filter(
        orientador=request.user
    ).values_list('estudiante_id', flat=True).distinct()

    aprendices = []
    for uid in ids:
        try:
            u = User.objects.get(pk=uid)
            aprendices.append({'id': u.pk, 'nombre': u.get_full_name() or u.username})
        except User.DoesNotExist:
            pass

    return JsonResponse({'aprendices': aprendices})


# ─────────────────────────────────────────────
#  GENERAR PDF DEL PROCESO DE UN APRENDIZ
# ─────────────────────────────────────────────

@login_required(login_url='/autenticar/login')
def generar_pdf_proceso(request, estudiante_id):
    """
    Genera un PDF con el proceso completo de un aprendiz:
    citas, resultados y actividades asignadas.
    Accesible por el orientador que lo atendió o el propio estudiante.
    """
    perfil = _get_perfil(request.user)
    if not perfil:
        return HttpResponse('Sin permiso.', status=403)

    # Orientador ve a sus propios aprendices; aprendiz ve su propio proceso
    if perfil.rol_id == 3:
        try:
            estudiante = User.objects.get(pk=estudiante_id)
        except User.DoesNotExist:
            return HttpResponse('Aprendiz no encontrado.', status=404)
        # Validar que al menos haya una cita entre ellos
        if not Cita.objects.filter(orientador=request.user, estudiante=estudiante).exists():
            return HttpResponse('Sin permiso para ver este proceso.', status=403)

    elif perfil.rol_id == 2:
        if str(request.user.pk) != str(estudiante_id):
            return HttpResponse('Solo puedes ver tu propio proceso.', status=403)
        estudiante = request.user
    else:
        return HttpResponse('Sin permiso.', status=403)

    # Recopilar datos del proceso
    citas = Cita.objects.filter(
        estudiante=estudiante
    ).select_related('orientador').order_by('fecha')

    resultados = Resultado.objects.filter(
        estudiante=estudiante
    ).select_related('cita', 'orientador').order_by('fecha_evaluacion')

    actividades = ActividadAsignada.objects.filter(
        estudiante=estudiante
    ).select_related('orientador').order_by('fecha_asignacion')

    # Estadísticas rápidas para el PDF
    total_citas      = citas.count()
    total_resultados = resultados.count()
    promedio_estres  = 0
    if total_resultados:
        promedio_estres = round(
            sum(r.puntuacion_estres for r in resultados) / total_resultados, 1
        )

    contexto = {
        'estudiante':       estudiante,
        'generado_por':     request.user,
        'fecha_generacion': date.today(),
        'citas':            citas,
        'resultados':       resultados,
        'actividades':      actividades,
        'total_citas':      total_citas,
        'total_resultados': total_resultados,
        'promedio_estres':  promedio_estres,
    }

    html_string = render_to_string('pdf_proceso.html', contexto)

    # ── Intentar WeasyPrint; si no está instalado, devolver HTML ──
    try:
        from weasyprint import HTML as WP_HTML
        pdf = WP_HTML(string=html_string).write_pdf()
        response = HttpResponse(pdf, content_type='application/pdf')
        nombre = f"proceso_{estudiante.username}_{date.today()}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{nombre}"'
        return response
    except ImportError:
        # Fallback: devolver el HTML para que el usuario pueda imprimir/guardar como PDF
        return HttpResponse(html_string, content_type='text/html')