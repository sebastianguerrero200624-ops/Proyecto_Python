// ============================================================
//  MINDWELL — Gestión de Citas
//  Lógica controlada por window.MW_ROL (2=aprendiz, 3=instructor)
// ============================================================

const ROL  = window.MW_ROL;
const CSRF = window.MW_CSRF;
const BASE = window.MW_BASE_URL || '';

let citaSeleccionadaId = null;

// ─── Helpers de fetch ───────────────────────────────────────

async function apiGet(url) {
  const res = await fetch(BASE + url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiPost(url, body = {}) {
  const res = await fetch(BASE + url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ─── Modales ────────────────────────────────────────────────

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('active'); m.scrollTop = 0; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

window.addEventListener('click', e => {
  document.querySelectorAll('.modal.active').forEach(m => {
    if (e.target === m) m.classList.remove('active');
  });
});

// ─── Sidebar / Tema ─────────────────────────────────────────

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('closed');
}

function initTema() {
  const icon   = document.getElementById('theme-icon');
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (icon) icon.textContent = '☀️';
  }
  toggle.addEventListener('click', () => {
    const dark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', dark ? '' : 'dark');
    if (icon) icon.textContent = dark ? '🌙' : '☀️';
    localStorage.setItem('theme', dark ? 'light' : 'dark');
  });
}

// ─── Fechas ─────────────────────────────────────────────────

function getFechasMinMax() {
  const hoy    = new Date();
  const minima = new Date(hoy); minima.setDate(hoy.getDate() + 1);
  const maxima = new Date(hoy); maxima.setDate(hoy.getDate() + 60);
  const fmt = d => d.toISOString().split('T')[0];
  return { min: fmt(minima), max: fmt(maxima) };
}

function configurarInputFecha(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const { min, max } = getFechasMinMax();
  input.setAttribute('min', min);
  input.setAttribute('max', max);
  if (typeof flatpickr !== 'undefined') {
    flatpickr(input, { locale: 'es', dateFormat: 'Y-m-d', minDate: min, maxDate: max, disableMobile: true });
  }
}

// ─── RELOJ ESTÉTICO ──────────────────────────────────────────

function crearRelojEstetico(containerId, inputHiddenId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const horas   = Array.from({ length: 13 }, (_, i) => i + 6);
  const minutos = [0, 30];
  container.innerHTML = `
    <div class="reloj-container">
      <div class="reloj-display" id="reloj-display-${containerId}">
        <span class="reloj-icon">🕐</span>
        <span class="reloj-hora-seleccionada">Selecciona hora</span>
      </div>
      <div class="reloj-grid" id="reloj-grid-${containerId}">
        ${horas.map(h => minutos.map(m => {
          const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          return `<button type="button" class="reloj-slot" data-val="${val}"
            onclick="seleccionarHora('${containerId}','${inputHiddenId}','${val}')">${val}</button>`;
        }).join('')).join('')}
      </div>
    </div>`;
}

function seleccionarHora(containerId, inputHiddenId, val) {
  const display = document.querySelector(`#reloj-display-${containerId} .reloj-hora-seleccionada`);
  if (display) { display.textContent = val; display.parentElement.classList.add('selected'); }
  document.querySelectorAll(`#reloj-grid-${containerId} .reloj-slot`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === val);
  });
  const hidden = document.getElementById(inputHiddenId);
  if (hidden) hidden.value = val;
}

// ─── ANÁLISIS DE PRIORIDAD ───────────────────────────────────

const PALABRAS_ALTA = [
  'suicid','autolesion','autolesión','crisis','urgente','emergencia',
  'depresion','depresión','pánico','panico','violencia','abuso',
  'agresion','agresión','desesper','no puedo más','no puedo mas',
  'me quiero morir','hacerme daño','grave','trauma',
  'suicide','self-harm','self harm','urgent','emergency',
  'depression','panic attack','violence','abuse','desperate',
  "can't go on",'cant go on',
];

const PALABRAS_MEDIA = [
  'ansiedad','estrés','estres','nervios','preocupacion','preocupación',
  'tristeza','soledad','problema familiar','conflicto','rendimiento',
  'académico','academico','trabajo','relaciones','pareja','amigos',
  'motivacion','motivación','orientacion','orientación','vocacional',
  'insomni','cansancio','agotamiento','burnout',
  'anxiety','stress','worried','sadness','loneliness','family',
  'conflict','academic','performance','relationship','friends',
  'motivation','guidance','insomnia','tired','exhausted',
];

function analizarPrioridad(motivo) {
  const texto = motivo.toLowerCase();
  for (const p of PALABRAS_ALTA)  if (texto.includes(p)) return 'ALTA';
  for (const p of PALABRAS_MEDIA) if (texto.includes(p)) return 'MEDIA';
  if (texto.trim().length < 10) return 'MEDIA';
  return 'BAJA';
}

function mostrarIndicadorPrioridad(prioridad, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const config = {
    ALTA:  { label: '🔴 Prioridad ALTA',  clase: 'prioridad-alta',  msg: 'Se detectaron palabras que indican urgencia emocional.' },
    MEDIA: { label: '🟡 Prioridad MEDIA', clase: 'prioridad-media', msg: 'Motivo reconocido. El orientador evaluará la urgencia.' },
    BAJA:  { label: '🟢 Prioridad BAJA',  clase: 'prioridad-baja',  msg: 'Motivo estándar. Será atendido en orden de llegada.' },
  };
  const c = config[prioridad] || config.MEDIA;
  el.innerHTML = `<div class="prioridad-badge ${c.clase}"><strong>${c.label}</strong><span>${c.msg}</span></div>`;
}

// ─── ORDENAR POR PRIORIDAD ───────────────────────────────────
// ALTA = 0, MEDIA = 1, BAJA = 2 → sort ascendente pone ALTA primero

const ORDEN_PRIORIDAD = { ALTA: 0, MEDIA: 1, BAJA: 2 };

function ordenarPorPrioridad(citas) {
  return [...citas].sort((a, b) =>
    (ORDEN_PRIORIDAD[a.prioridad] ?? 1) - (ORDEN_PRIORIDAD[b.prioridad] ?? 1)
  );
}

// ─── RESUMEN DE MOTIVO ───────────────────────────────────────

function resumirMotivo(motivo) {
  const texto = motivo.trim();
  if (!texto || texto.length < 5) return 'Sin descripción clara — requiere revisión.';
  const genericos = ['porque si','porque sí','no sé','no se','nada','etc','por favor','gracias'];
  if (genericos.some(g => texto.toLowerCase() === g) || texto.length < 8) {
    return '⚠️ Motivo no especificado — requiere revisión del orientador.';
  }
  return texto;
}

// ─── CHIPS DE PRIORIDAD ──────────────────────────────────────

const PRIORIDAD_CONFIG = {
  ALTA:  { clase: 'prioridad-alta-chip',  icono: '🔴' },
  MEDIA: { clase: 'prioridad-media-chip', icono: '🟡' },
  BAJA:  { clase: 'prioridad-baja-chip',  icono: '🟢' },
};

// ─── Renderizar tabla principal ──────────────────────────────

function renderTabla(citas) {
  const tbody = document.getElementById('tabla-citas-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!citas || citas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="no-citas-message">📭 No hay citas registradas.</td></tr>`;
    return;
  }

  // Ordenar: PENDIENTE+ALTA primero, luego resto de pendientes, luego demás
  const ordenadas = [...citas].sort((a, b) => {
    if (a.estado === 'PENDIENTE' && b.estado === 'PENDIENTE') {
      return (ORDEN_PRIORIDAD[a.prioridad] ?? 1) - (ORDEN_PRIORIDAD[b.prioridad] ?? 1);
    }
    if (a.estado === 'PENDIENTE') return -1;
    if (b.estado === 'PENDIENTE') return 1;
    return 0;
  });

  ordenadas.forEach(c => {
    const row = document.createElement('tr');
    const pc  = PRIORIDAD_CONFIG[c.prioridad] || PRIORIDAD_CONFIG.MEDIA;

    if (c.prioridad === 'ALTA' && c.estado === 'PENDIENTE') {
      row.classList.add('fila-prioridad-alta');
    }

    const personaCell     = ROL === 3
      ? `<td>${c.nombreEstudiante || '—'}</td>`
      : `<td>${c.nombreOrientador || '—'}</td>`;
    const motivoResumen   = resumirMotivo(c.motivo);
    const motivoCorto     = motivoResumen.length > 40 ? motivoResumen.substring(0, 40) + '…' : motivoResumen;

    let acciones = `<button class="btn-ver" onclick="verDetalle(${c.id})">👁 Ver</button>`;
    if (c.estado !== 'CANCELADA' && c.estado !== 'FINALIZADA') {
      if (ROL === 2 && c.estado === 'PENDIENTE') {
        acciones += `<button class="btn-cancelar" onclick="seleccionarCita(${c.id}); openModal('modal-cancelar-est')">❌ Cancelar</button>`;
      }
      if (ROL === 3) {
        if (c.estado === 'PENDIENTE')
          acciones += `<button class="btn-aprobar" onclick="aprobarDirecto(${c.id})">✓ Aprobar</button>`;
        if (c.estado === 'APROBADA') {
          acciones += `<button class="btn-finalizar" onclick="seleccionarCita(${c.id}); openModal('modal-finalizar')">✅ Finalizar</button>`;
        }
        //if (['PENDIENTE','APROBADA','REPROGRAMADA'].includes(c.estado))
        //  acciones += `<button class="btn-cancelar" onclick="seleccionarCita(${c.id}); openModal('modal-cancelar-ori')">❌ Cancelar</button>`;
      }
    }

    row.innerHTML = `
      ${personaCell}
      <td>${c.fechaEfectiva}</td>
      <td>${c.horaEfectiva}</td>
      <td title="${motivoResumen}">${motivoCorto}</td>
      <td><span class="estado estado-${c.estado.toLowerCase()}">${c.estado}</span></td>
      <td><span class="chip ${pc.clase}">${pc.icono} ${c.prioridad}</span></td>
      <td class="acciones">${acciones}</td>
    `;
    tbody.appendChild(row);
  });
}

// ─── Cargar citas ────────────────────────────────────────────

async function cargarCitas(params = {}) {
  try {
    const qs   = new URLSearchParams(params).toString();
    const data = await apiGet(`/api/citas/${qs ? '?' + qs : ''}`);
    renderTabla(data.citas);
  } catch (e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las citas.' });
  }
}

// ─── Ver detalle ─────────────────────────────────────────────

async function verDetalle(id) {
  try {
    const c  = await apiGet(`/api/citas/${id}/`);
    const pc = PRIORIDAD_CONFIG[c.prioridad] || PRIORIDAD_CONFIG.MEDIA;
    const persona = ROL === 3
      ? `<div class="detalle-row"><span class="detalle-label">👤 Estudiante</span><span>${c.nombreEstudiante || '—'}</span></div>`
      : `<div class="detalle-row"><span class="detalle-label">👤 Orientador</span><span>${c.nombreOrientador || '—'}</span></div>`;

    let extraInfo = '';
    if (c.estado === 'REPROGRAMADA' && c.motivoReprogramacion) {
      extraInfo += `<div class="detalle-row detalle-highlight repro">
        <span class="detalle-label">📅 Motivo reprogramación</span>
        <span>${c.motivoReprogramacion}</span></div>`;
    }
    if (c.estado === 'CANCELADA' && c.motivoCancelacion) {
      extraInfo += `<div class="detalle-row detalle-highlight cancel">
        <span class="detalle-label">❌ Motivo cancelación</span>
        <span>${c.motivoCancelacion}</span></div>`;
    }

    document.getElementById('detalle-cita-content').innerHTML = `
      <div class="detalle-grid">
        ${persona}
        <div class="detalle-row"><span class="detalle-label">📅 Fecha efectiva</span><span>${c.fechaEfectiva}</span></div>
        <div class="detalle-row"><span class="detalle-label">🕐 Hora efectiva</span><span>${c.horaEfectiva}</span></div>
        <div class="detalle-row"><span class="detalle-label">📊 Estado</span>
          <span class="estado estado-${c.estado.toLowerCase()}">${c.estado}</span></div>
        <div class="detalle-row"><span class="detalle-label">⚡ Prioridad</span>
          <span class="chip ${pc.clase}">${c.prioridad}</span></div>
        <div class="detalle-row detalle-motivo-full">
          <span class="detalle-label">📝 Motivo completo</span>
          <span>${resumirMotivo(c.motivo)}</span></div>
        <div class="detalle-row"><span class="detalle-label">📆 Creada</span><span>${c.creadoEn}</span></div>
        ${extraInfo}
      </div>`;
    openModal('modal-ver');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e.message });
  }
}

// ─── Seleccionar cita ────────────────────────────────────────

function seleccionarCita(id) { citaSeleccionadaId = id; }

// ─── CREAR CITA ──────────────────────────────────────────────

async function crearCita(e) {
  e.preventDefault();
  const orientador_id = document.getElementById('orientador')?.value;
  const fecha         = document.getElementById('fecha')?.value;
  const hora          = document.getElementById('hora-hidden')?.value;
  const motivo        = document.getElementById('motivo')?.value.trim();

  if (!orientador_id || !fecha || !hora || !motivo)
    return Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Completa todos los campos obligatorios.' });
  if (motivo.length < 10)
    return Swal.fire({ icon: 'warning', title: 'Motivo muy corto', text: 'Por favor describe mejor el motivo (mínimo 10 caracteres).' });

  try {
    const data = await apiPost('/api/citas/crear/', { orientador_id, fecha, hora, motivo });
    const pc   = PRIORIDAD_CONFIG[data.prioridad] || PRIORIDAD_CONFIG.MEDIA;
    Swal.fire({
      icon: 'success', title: '¡Cita solicitada!',
      html: `${data.mensaje}<br><br><span class="chip ${pc.clase}">${pc.icono} ${data.prioridad || ''}</span>`,
      timer: 3000, showConfirmButton: false,
    });
    closeModal('modal-crear');
    document.getElementById('formCrearCita').reset();
    document.querySelectorAll('.reloj-slot').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.reloj-hora-seleccionada').forEach(s => s.textContent = 'Selecciona hora');
    document.querySelectorAll('.reloj-display').forEach(d => d.classList.remove('selected'));
    document.getElementById('indicador-prioridad').innerHTML = '';
    cargarCitas();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ─── APROBAR ─────────────────────────────────────────────────

async function aprobarDirecto(id) {
  const { isConfirmed } = await Swal.fire({
    icon: 'question', title: '¿Aprobar esta cita?',
    showCancelButton: true, confirmButtonText: 'Sí, aprobar',
    cancelButtonText: 'No', confirmButtonColor: '#28a745',
  });
  if (!isConfirmed) return;
  try {
    const data = await apiPost(`/api/citas/${id}/aprobar/`);
    Swal.fire({ icon: 'success', title: '¡Aprobada!', text: data.mensaje, timer: 2000, showConfirmButton: false });
    cargarCitas();
    cargarPendientes();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ─── PENDIENTES — ALTA siempre primero ───────────────────────

async function cargarPendientes() {
  try {
    const data  = await apiGet('/api/citas/pendientes/');
    const tbody = document.getElementById('tabla-pendientes-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data.citas.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-citas-message">✅ Sin citas pendientes.</td></tr>';
      return;
    }

    // ALTA primero, luego MEDIA, luego BAJA — sin excepción
    const ordenadas = ordenarPorPrioridad(data.citas);

    ordenadas.forEach(c => {
      const pc  = PRIORIDAD_CONFIG[c.prioridad] || PRIORIDAD_CONFIG.MEDIA;
      const row = document.createElement('tr');
      if (c.prioridad === 'ALTA') row.classList.add('fila-prioridad-alta');
      row.innerHTML = `
        <td>${c.nombreEstudiante}</td>
        <td>${c.fecha}</td>
        <td>${c.hora}</td>
        <td title="${c.motivo}">${resumirMotivo(c.motivo).substring(0, 50)}…</td>
        <td><span class="chip ${pc.clase}">${pc.icono} ${c.prioridad}</span></td>
        <td><button class="btn-aprobar" onclick="aprobarDirecto(${c.id})">Aprobar</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (e) {
    console.error(e);
  }
}

function abrirModalAprobar() { cargarPendientes(); openModal('modal-aprobar'); }

// ─── REPROGRAMAR ─────────────────────────────────────────────

async function abrirModalReprogramar() {
  try {
    const data   = await apiGet('/api/citas/?estado=APROBADA');
    const select = document.getElementById('cita-reprogramar-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona una cita</option>';
    data.citas.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nombreEstudiante} — ${c.fechaEfectiva} ${c.horaEfectiva}`;
      select.appendChild(opt);
    });
    openModal('modal-reprogramar-ori');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las citas.' });
  }
}

async function reprogramarCita(e) {
  e.preventDefault();
  const id     = document.getElementById('cita-reprogramar-select')?.value;
  const fecha  = document.getElementById('fecha-repro')?.value;
  const hora   = document.getElementById('hora-repro-hidden')?.value;
  const motivo = document.getElementById('motivo-repro')?.value.trim();
  if (!id || !fecha || !hora)
    return Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Selecciona cita, fecha y hora.' });
  try {
    const data = await apiPost(`/api/citas/${id}/reprogramar/`, { fecha, hora, motivo });
    Swal.fire({ icon: 'success', title: '¡Reprogramada!', text: data.mensaje, timer: 2000, showConfirmButton: false });
    closeModal('modal-reprogramar-ori');
    document.getElementById('formReprogramar').reset();
    cargarCitas();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ─── CANCELAR ────────────────────────────────────────────────

function ejecutarCancelar() {
  const id = citaSeleccionadaId;
  if (!id) return Swal.fire({ icon: 'warning', title: 'Sin selección', text: 'Selecciona una cita.' });
  apiPost(`/api/citas/${id}/cancelar/`)
    .then(d => {
      Swal.fire({ icon: 'success', title: '¡Cancelada!', text: d.mensaje, timer: 2000, showConfirmButton: false });
      closeModal('modal-cancelar-est');
      cargarCitas();
      citaSeleccionadaId = null;
    })
    .catch(e => Swal.fire({ icon: 'error', title: 'Error', text: e.message }));
}

async function cancelarOrientador(e) {
  e.preventDefault();
  const id                 = document.getElementById('cita-cancelar-select')?.value;
  const motivo_cancelacion = document.getElementById('motivo-cancelacion')?.value.trim();
  if (!id) return Swal.fire({ icon: 'warning', title: 'Sin selección', text: 'Selecciona una cita.' });
  try {
    const data = await apiPost(`/api/citas/${id}/cancelar/`, { motivo_cancelacion });
    Swal.fire({ icon: 'success', title: '¡Cancelada!', text: data.mensaje, timer: 2000, showConfirmButton: false });
    closeModal('modal-cancelar-ori');
    document.getElementById('formCancelarOri').reset();
    cargarCitas();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

async function abrirModalCancelar() {
  try {
    const data   = await apiGet('/api/citas/');
    const select = document.getElementById('cita-cancelar-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona una cita</option>';
    data.citas
      .filter(c => ['PENDIENTE','APROBADA','REPROGRAMADA'].includes(c.estado))
      .forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nombreEstudiante} — ${c.fechaEfectiva} (${c.estado})`;
        select.appendChild(opt);
      });
    openModal('modal-cancelar-ori');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las citas.' });
  }
}

// ─── FINALIZAR ───────────────────────────────────────────────

function ejecutarFinalizar() {
  const id = citaSeleccionadaId;
  if (!id) return Swal.fire({ icon: 'warning', title: 'Sin selección', text: 'Selecciona una cita.' });
  apiPost(`/api/citas/${id}/finalizar/`)
    .then(d => {
      Swal.fire({ icon: 'success', title: '¡Finalizada!', text: d.mensaje, timer: 2000, showConfirmButton: false });
      closeModal('modal-finalizar');
      cargarCitas();
      citaSeleccionadaId = null;
    })
    .catch(e => Swal.fire({ icon: 'error', title: 'Error', text: e.message }));
}

// ─── FILTROS ─────────────────────────────────────────────────

function aplicarFiltros() {
  const estado    = document.getElementById('filtro-estado')?.value || '';
  const fecha     = document.getElementById('filtro-fecha')?.value  || '';
  const estudiante = ROL === 3
    ? (document.getElementById('filtro-estudiante')?.value || '').toLowerCase().trim()
    : '';
 
  // Parámetros que va al backend (estado y fecha — el backend los soporta)
  const params = {};
  if (estado) params.estado = estado;
  if (fecha)  params.fecha  = fecha;
 
  apiGet(`/api/citas/${Object.keys(params).length ? '?' + new URLSearchParams(params) : ''}`)
    .then(data => {
      let citas = data.citas || [];
 
      // Filtro de nombre de estudiante en el cliente (solo rol 3)
      if (estudiante) {
        citas = citas.filter(c =>
          (c.nombreEstudiante || '').toLowerCase().includes(estudiante)
        );
      }
 
      if (citas.length === 0) {
        const tbody = document.getElementById('tabla-citas-body');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="7" class="no-citas-message">
            🔍 No se encontraron citas con los filtros aplicados.
          </td></tr>`;
        }
        return;
      }
 
      renderTabla(citas);
    })
    .catch(e => {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron aplicar los filtros.' });
    });
}
 
function limpiarFiltros() {
  ['filtro-estado', 'filtro-fecha', 'filtro-estudiante'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // También limpia el input visualmente si usa flatpickr
  const fpFecha = document.getElementById('filtro-fecha')?._flatpickr;
  if (fpFecha) fpFecha.clear();
  cargarCitas();
}
 

function limpiarFiltros() {
  ['filtro-estado','filtro-fecha','filtro-estudiante'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  cargarCitas();
}

// ─── CONTADOR + ANÁLISIS EN TIEMPO REAL ─────────────────────

function initContadorMotivo() {
  const ta  = document.getElementById('motivo');
  const cnt = document.getElementById('motivo-count');
  if (!ta || !cnt) return;
  ta.addEventListener('input', () => {
    cnt.textContent = ta.value.length;
    mostrarIndicadorPrioridad(analizarPrioridad(ta.value), 'indicador-prioridad');
  });
}

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTema();
  cargarCitas();
  initContadorMotivo();
  configurarInputFecha('fecha');
  configurarInputFecha('fecha-repro');
  crearRelojEstetico('reloj-hora-crear', 'hora-hidden');
  crearRelojEstetico('reloj-hora-repro', 'hora-repro-hidden');

  const formCrear       = document.getElementById('formCrearCita');
  const formRepro       = document.getElementById('formReprogramar');
  const formCancelarOri = document.getElementById('formCancelarOri');

  if (formCrear)       formCrear.addEventListener('submit', crearCita);
  if (formRepro)       formRepro.addEventListener('submit', reprogramarCita);
  if (formCancelarOri) formCancelarOri.addEventListener('submit', cancelarOrientador);
});