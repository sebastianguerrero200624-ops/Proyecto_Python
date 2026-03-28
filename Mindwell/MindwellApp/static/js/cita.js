// ============================================================
//  MINDWELL — Gestión de Citas (JS unificado aprendiz + instructor)
//  Lógica controlada por window.MW_ROL (2=aprendiz, 3=instructor)
// ============================================================

const ROL      = window.MW_ROL;
const CSRF     = window.MW_CSRF;
const BASE     = window.MW_BASE_URL || '';

let citaSeleccionadaId = null;

// ─── Helpers de fetch ───────────────────────────────────────

async function apiGet(url) {
  const res = await fetch(BASE + url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiPost(url, body = {}) {
  const res = await fetch(BASE + url, {
    method:      'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type':  'application/json',
      'X-CSRFToken':   CSRF,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ─── Modales ────────────────────────────────────────────────

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
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
  const minima = new Date(hoy);
  minima.setDate(hoy.getDate() + 1);               // mañana
  const maxima = new Date(hoy);
  maxima.setDate(hoy.getDate() + 60);              // 2 meses

  const fmt = d => d.toISOString().split('T')[0];
  return { min: fmt(minima), max: fmt(maxima) };
}

function configurarInputFecha(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const { min, max } = getFechasMinMax();
  input.setAttribute('min', min);
  input.setAttribute('max', max);

  // Flatpickr si está disponible
  if (typeof flatpickr !== 'undefined') {
    flatpickr(input, {
      locale:        'es',
      dateFormat:    'Y-m-d',
      minDate:       min,
      maxDate:       max,
      disableMobile: true,
    });
  }
}

// ─── Horas disponibles (06:00 – 18:00 cada 30 min) ──────────

function popularHoras(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">Selecciona una hora</option>';
  for (let h = 6; h <= 18; h++) {
    for (const m of [0, 30]) {
      if (h === 18 && m === 30) continue;
      const val  = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const opt  = document.createElement('option');
      opt.value  = val;
      opt.textContent = val;
      select.appendChild(opt);
    }
  }
}

// ─── Renderizar tabla de citas ───────────────────────────────

function renderTabla(citas) {
  const tbody = document.getElementById('tabla-citas-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const cols = ROL === 3 ? 6 : 6;

  if (!citas || citas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${cols}" class="no-citas-message">No hay citas registradas.</td></tr>`;
    return;
  }

  citas.forEach(c => {
    const row = document.createElement('tr');

    // Columna de persona según rol
    const personaCell = ROL === 3
      ? `<td>${c.nombreEstudiante || '—'}</td>`
      : `<td>${c.nombreOrientador || '—'}</td>`;

    // Acciones según estado y rol
    let acciones = `<button class="btn-ver" onclick="verDetalle(${c.id})">👁 Ver</button>`;

    if (c.estado !== 'CANCELADA' && c.estado !== 'FINALIZADA') {
      if (ROL === 2 && c.estado === 'PENDIENTE') {
        // Estudiante solo puede cancelar si está PENDIENTE
        acciones += `<button class="btn-cancelar" onclick="seleccionarCita(${c.id}); openModal('modal-cancelar-est')">❌ Cancelar</button>`;
      }
      if (ROL === 3) {
        if (c.estado === 'PENDIENTE') {
          acciones += `<button class="btn-aprobar" onclick="aprobarDirecto(${c.id})">✓ Aprobar</button>`;
        }
        if (c.estado === 'APROBADA') {
          acciones += `<button class="btn-reprogramar" onclick="seleccionarCita(${c.id}); openModal('modal-reprogramar-ori')">📅 Reprogramar</button>`;
          acciones += `<button class="btn-finalizar" onclick="seleccionarCita(${c.id}); openModal('modal-finalizar')">✅ Finalizar</button>`;
        }
        if (['PENDIENTE','APROBADA','REPROGRAMADA'].includes(c.estado)) {
          acciones += `<button class="btn-cancelar" onclick="seleccionarCita(${c.id}); openModal('modal-cancelar-ori')">❌ Cancelar</button>`;
        }
      }
    }

    row.innerHTML = `
      ${personaCell}
      <td>${c.fechaEfectiva}</td>
      <td>${c.horaEfectiva}</td>
      <td>${c.motivo}</td>
      <td><span class="estado estado-${c.estado.toLowerCase()}">${c.estado}</span></td>
      <td class="acciones">${acciones}</td>
    `;
    tbody.appendChild(row);
  });
}

// ─── Cargar citas ────────────────────────────────────────────

async function cargarCitas(params = {}) {
  try {
    const qs  = new URLSearchParams(params).toString();
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
    const c = await apiGet(`/api/citas/${id}/`);
    const persona = ROL === 3
      ? `<p><strong>👤 Estudiante:</strong> ${c.nombreEstudiante || '—'}</p>`
      : `<p><strong>👤 Orientador:</strong> ${c.nombreOrientador || '—'}</p>`;

    document.getElementById('detalle-cita-content').innerHTML = `
      <div style="text-align:left;padding:1rem;">
        ${persona}
        <p><strong>📅 Fecha efectiva:</strong> ${c.fechaEfectiva}</p>
        <p><strong>🕐 Hora efectiva:</strong> ${c.horaEfectiva}</p>
        <p><strong>📝 Motivo:</strong> ${c.motivo}</p>
        <p><strong>📊 Estado:</strong> <span class="estado estado-${c.estado.toLowerCase()}">${c.estado}</span></p>
        <p><strong>📆 Creada:</strong> ${c.creadoEn}</p>
      </div>`;
    openModal('modal-ver');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e.message });
  }
}

// ─── Seleccionar cita activa ─────────────────────────────────

function seleccionarCita(id) {
  citaSeleccionadaId = id;
}

// ─── CREAR CITA (aprendiz) ───────────────────────────────────

async function crearCita(e) {
  e.preventDefault();
  const orientador_id = document.getElementById('orientador')?.value;
  const fecha         = document.getElementById('fecha')?.value;
  const hora          = document.getElementById('hora')?.value;
  const motivo        = document.getElementById('motivo')?.value.trim();

  if (!orientador_id || !fecha || !hora || !motivo) {
    return Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Completa todos los campos obligatorios.' });
  }

  try {
    const data = await apiPost('/api/citas/crear/', { orientador_id, fecha, hora, motivo });
    Swal.fire({ icon: 'success', title: '¡Cita solicitada!', text: data.mensaje, timer: 2000, showConfirmButton: false });
    closeModal('modal-crear');
    document.getElementById('formCrearCita').reset();
    cargarCitas();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ─── APROBAR CITA (orientador) ───────────────────────────────

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

// ─── Modal: Aprobar (orientador) ─────────────────────────────

async function cargarPendientes() {
  try {
    const data = await apiGet('/api/citas/pendientes/');
    const tbody = document.getElementById('tabla-pendientes-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data.citas.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-citas-message">✅ Sin citas pendientes.</td></tr>';
      return;
    }
    data.citas.forEach(c => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${c.nombreEstudiante}</td>
        <td>${c.fecha}</td>
        <td>${c.hora}</td>
        <td>${c.motivo}</td>
        <td><button class="btn-aprobar" onclick="aprobarDirecto(${c.id})">Aprobar</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (e) {
    console.error(e);
  }
}

function abrirModalAprobar() {
  cargarPendientes();
  openModal('modal-aprobar');
}

// ─── Modal: Reprogramar (orientador) ─────────────────────────

async function abrirModalReprogramar() {
  try {
    const data  = await apiGet('/api/citas/?estado=APROBADA');
    const select = document.getElementById('cita-reprogramar-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona una cita</option>';
    data.citas.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nombreEstudiante} — ${c.fechaEfectiva} ${c.horaEfectiva}`;
      select.appendChild(opt);
    });
    popularHoras('hora-repro');
    openModal('modal-reprogramar-ori');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las citas.' });
  }
}

async function reprogramarCita(e) {
  e.preventDefault();
  const id     = document.getElementById('cita-reprogramar-select')?.value;
  const fecha  = document.getElementById('fecha-repro')?.value;
  const hora   = document.getElementById('hora-repro')?.value;
  const motivo = document.getElementById('motivo-repro')?.value.trim();

  if (!id || !fecha || !hora) {
    return Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Selecciona cita, fecha y hora.' });
  }

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

// ─── Modal: Cancelar (orientador) ────────────────────────────

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

// ─── CANCELAR CITA ───────────────────────────────────────────

function ejecutarCancelar() {
  const id = citaSeleccionadaId;
  if (!id) return Swal.fire({ icon: 'warning', title: 'Sin selección', text: 'Selecciona una cita.' });
  apiPost(`/api/citas/${id}/cancelar/`)
    .then(d => {
      Swal.fire({ icon: 'success', title: '¡Cancelada!', text: d.mensaje, timer: 2000, showConfirmButton: false });
      closeModal(ROL === 2 ? 'modal-cancelar-est' : 'modal-cancelar-ori');
      cargarCitas();
      citaSeleccionadaId = null;
    })
    .catch(e => Swal.fire({ icon: 'error', title: 'Error', text: e.message }));
}

async function cancelarOrientador(e) {
  e.preventDefault();
  const id = document.getElementById('cita-cancelar-select')?.value;
  if (!id) return Swal.fire({ icon: 'warning', title: 'Sin selección', text: 'Selecciona una cita.' });

  try {
    const data = await apiPost(`/api/citas/${id}/cancelar/`);
    Swal.fire({ icon: 'success', title: '¡Cancelada!', text: data.mensaje, timer: 2000, showConfirmButton: false });
    closeModal('modal-cancelar-ori');
    document.getElementById('formCancelarOri').reset();
    cargarCitas();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ─── FINALIZAR CITA (orientador) ─────────────────────────────

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
  const params = {};
  const estado = document.getElementById('filtro-estado')?.value;
  const fecha  = document.getElementById('filtro-fecha')?.value;
  if (estado) params.estado = estado;
  if (fecha)  params.fecha  = fecha;
  cargarCitas(params);
}

function limpiarFiltros() {
  ['filtro-estado','filtro-fecha','filtro-estudiante'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  cargarCitas();
}

// ─── CONTADOR DE MOTIVO ──────────────────────────────────────

function initContadorMotivo() {
  const ta  = document.getElementById('motivo');
  const cnt = document.getElementById('motivo-count');
  if (!ta || !cnt) return;
  ta.addEventListener('input', () => { cnt.textContent = ta.value.length; });
}

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTema();
  cargarCitas();
  initContadorMotivo();

  // Configurar fechas con min/max
  configurarInputFecha('fecha');
  configurarInputFecha('fecha-repro');

  // Horas iniciales
  popularHoras('hora');
  popularHoras('hora-repro');

  // Actualizar horas cuando cambia fecha (crear)
  document.getElementById('fecha')?.addEventListener('change', () => popularHoras('hora'));
  document.getElementById('fecha-repro')?.addEventListener('change', () => popularHoras('hora-repro'));

  // Form listeners
  const formCrear      = document.getElementById('formCrearCita');
  const formRepro      = document.getElementById('formReprogramar');
  const formCancelarOri = document.getElementById('formCancelarOri');

  if (formCrear)       formCrear.addEventListener('submit', crearCita);
  if (formRepro)       formRepro.addEventListener('submit', reprogramarCita);
  if (formCancelarOri) formCancelarOri.addEventListener('submit', cancelarOrientador);
});