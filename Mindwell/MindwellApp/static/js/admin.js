// ============================================================
//  MINDWELL — Admin Usuarios JS
// ============================================================

const CSRF = window.MW_CSRF;
const ROL_LABELS = { 1: 'Administrador', 2: 'Aprendiz', 3: 'Instructor' };
const ROL_EMOJIS = { 1: '🛡️', 2: '🎓', 3: '🧘‍♀️' };

let usuariosCache = [];

// ── Tema ─────────────────────────────────────────────────────
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('closed'); }

function initTema() {
  const icon = document.getElementById('theme-icon');
  const btn  = document.getElementById('theme-toggle');
  if (!btn) return;
  if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (icon) icon.textContent = '☀️';
  }
  btn.addEventListener('click', () => {
    const dark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', dark ? '' : 'dark');
    if (icon) icon.textContent = dark ? '🌙' : '☀️';
    localStorage.setItem('theme', dark ? 'light' : 'dark');
  });
}

// ── Cargar usuarios ───────────────────────────────────────────

async function cargarUsuarios() {
  try {
    const res  = await fetch('/admin-panel/api/usuarios/', { credentials: 'same-origin' });
    const data = await res.json();
    usuariosCache = data.usuarios || [];
    renderUsuarios(usuariosCache);
    renderStats(usuariosCache);
  } catch (e) {
    console.error(e);
    document.getElementById('tbody-usuarios').innerHTML =
      '<tr><td colspan="8" class="loading-cell" style="color:red">Error al cargar usuarios.</td></tr>';
  }
}

function renderStats(lista) {
  const total  = lista.length;
  const admins = lista.filter(u => u.rol_id === 1).length;
  const apren  = lista.filter(u => u.rol_id === 2).length;
  const instr  = lista.filter(u => u.rol_id === 3).length;

  document.getElementById('stats-usuarios').innerHTML = `
    <div class="stat-card-mini"><span class="stat-icon">👥</span>
      <div><div class="stat-value">${total}</div><div class="stat-label">Total</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">🛡️</span>
      <div><div class="stat-value">${admins}</div><div class="stat-label">Admins</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">🎓</span>
      <div><div class="stat-value">${apren}</div><div class="stat-label">Aprendices</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">🧘‍♀️</span>
      <div><div class="stat-value">${instr}</div><div class="stat-label">Instructores</div></div></div>
  `;
}

function renderUsuarios(lista) {
  const tbody = document.getElementById('tbody-usuarios');
  const cont  = document.getElementById('contador-usuarios');
  if (cont) cont.textContent = `${lista.length} usuario${lista.length !== 1 ? 's' : ''}`;

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Sin usuarios.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map((u, i) => {
    const rolClass = u.rol_id === 1 ? 'badge-admin' : u.rol_id === 2 ? 'badge-aprendiz' : 'badge-instructor';
    const opciones = [1, 2, 3].filter(r => r !== u.rol_id).map(r =>
      `<option value="${r}">${ROL_EMOJIS[r]} ${ROL_LABELS[r]}</option>`
    ).join('');

    return `<tr>
      <td>${i + 1}</td>
      <td>
        <div class="user-name">${u.nombres} ${u.apellidos}</div>
        <div class="user-doc">📄 ${u.documento || '—'}</div>
      </td>
      <td class="email-cell">${u.email}</td>
      <td>${u.documento || '—'}</td>
      <td><span class="rol-badge ${rolClass}">${ROL_EMOJIS[u.rol_id]} ${u.rol_label}</span></td>
      <td><span class="estado-badge ${u.activo ? 'activo' : 'inactivo'}">${u.activo ? '✅ Activo' : '⏳ Pendiente'}</span></td>
      <td>${u.fecha_union}</td>
      <td>
        <div class="cambio-rol-wrap">
          <select id="sel-${u.id}" class="select-rol-mini">
            ${opciones}
          </select>
          <button class="btn-cambiar-rol" onclick="iniciarCambioRol(${u.id}, '${u.nombres} ${u.apellidos}')">
            Cambiar
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── TRIPLE CONFIRMACIÓN ───────────────────────────────────────

async function iniciarCambioRol(userId, nombreUsuario) {
  const select   = document.getElementById(`sel-${userId}`);
  const nuevoRol = parseInt(select?.value);
  if (!nuevoRol) return;

  const rolLabel       = ROL_LABELS[nuevoRol];
  const rolEmoji       = ROL_EMOJIS[nuevoRol];
  const usuarioActual  = usuariosCache.find(u => u.id === userId);
  const rolActualLabel = ROL_LABELS[usuarioActual?.rol_id];

  // Paso 1
  const paso1 = await Swal.fire({
    icon: 'question',
    title: '¿Cambiar rol de usuario?',
    html: `
      <p>Estás a punto de cambiar el rol de:</p>
      <p style="font-size:18px;font-weight:700;margin:10px 0">${nombreUsuario}</p>
      <p><strong>${rolActualLabel}</strong> → <strong>${rolEmoji} ${rolLabel}</strong></p>
    `,
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#00966C',
    cancelButtonColor: '#94a3b8',
  });
  if (!paso1.isConfirmed) return;

  // Paso 2
  const paso2 = await Swal.fire({
    icon: 'warning',
    title: '⚠️ Segunda confirmación',
    html: `
      <p>Este cambio <strong>afectará los permisos</strong> del usuario.</p>
      <p style="margin:10px 0">El usuario <strong>${nombreUsuario}</strong> pasará a ser <strong>${rolEmoji} ${rolLabel}</strong>.</p>
      <p>¿Estás seguro que deseas continuar?</p>
    `,
    showCancelButton: true,
    confirmButtonText: 'Sí, estoy seguro',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#94a3b8',
    input: 'checkbox',
    inputValue: 0,
    inputPlaceholder: 'Entiendo las implicaciones de este cambio',
    inputValidator: (result) => {
      if (!result) return 'Debes confirmar que entiendes el cambio.';
    }
  });
  if (!paso2.isConfirmed) return;

  // Paso 3
  const paso3 = await Swal.fire({
    icon: 'error',
    title: '🔴 Confirmación DEFINITIVA',
    html: `
      <p style="font-size:15px">Esta es la <strong>última oportunidad</strong> para cancelar.</p>
      <p style="margin:12px 0;font-size:17px;font-weight:700;color:#dc2626">
        ¿CONFIRMAS DEFINITIVAMENTE el cambio de rol?
      </p>
      <p><strong>${nombreUsuario}</strong></p>
      <p style="font-size:13px;color:#64748b">${rolActualLabel} → ${rolEmoji} ${rolLabel}</p>
    `,
    showCancelButton: true,
    confirmButtonText: '✅ SÍ, CAMBIAR DEFINITIVAMENTE',
    cancelButtonText: '❌ Cancelar',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#94a3b8',
    reverseButtons: true,
  });
  if (!paso3.isConfirmed) return;

  // Ejecutar
  try {
    const res  = await fetch(`/admin-panel/api/usuarios/${userId}/rol/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF },
      body: JSON.stringify({ rol_nuevo: nuevoRol }),
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      Swal.fire({
        icon: 'success', title: '✅ Rol actualizado',
        text: data.mensaje, timer: 2500, showConfirmButton: false,
      });
      cargarUsuarios();
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo cambiar el rol.' });
    }
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error de red', text: err.message });
  }
}

// ── Filtros ───────────────────────────────────────────────────

function initFiltros() {
  const buscador  = document.getElementById('buscador');
  const filtroRol = document.getElementById('filtro-rol');

  const filtrar = () => {
    const q   = (buscador?.value || '').toLowerCase();
    const rol = filtroRol?.value || '';
    const filtrados = usuariosCache.filter(u => {
      const coincideTexto = !q || `${u.nombres} ${u.apellidos} ${u.email} ${u.documento}`.toLowerCase().includes(q);
      const coincideRol   = !rol || String(u.rol_id) === rol;
      return coincideTexto && coincideRol;
    });
    renderUsuarios(filtrados);
  };

  buscador?.addEventListener('input', filtrar);
  filtroRol?.addEventListener('change', filtrar);
}

// ============================================================
//  MINDWELL — Admin Reportes JS
// ============================================================

Chart.defaults.font.family = "'Inter','Segoe UI',sans-serif";

const COLORS = {
  blue:   'rgba(59,130,246,0.85)',
  green:  'rgba(16,185,129,0.85)',
  purple: 'rgba(139,92,246,0.85)',
  yellow: 'rgba(245,158,11,0.85)',
  red:    'rgba(239,68,68,0.85)',
};

let charts = {};

// ── Cargar reporte ────────────────────────────────────────────

async function cargarReporte() {
  const mes = document.getElementById('selector-mes')?.value || '';
  const url = `/admin-panel/api/reportes/datos/${mes ? '?mes=' + mes : ''}`;

  try {
    const res  = await fetch(url, { credentials: 'same-origin' });
    const data = await res.json();
    renderStats(data.totales, data.periodo);
    chartActividad(data.actividadDiaria);
    chartRoles(data.roles);
    chartCitas12(data.citasPor12Meses);
    renderTopAprendices(data.topAprendices, data.periodo);
  } catch (e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el reporte.' });
  }
}

// ── Stats ─────────────────────────────────────────────────────

function renderStats(totales, periodo) {
  const el = document.getElementById('stats-mes');
  if (!el || !totales) return;
  el.innerHTML = `
    <div class="stat-card-mini"><span class="stat-icon">👥</span>
      <div><div class="stat-value">${totales.usuarios}</div><div class="stat-label">Usuarios activos</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">🎓</span>
      <div><div class="stat-value">${totales.aprendices}</div><div class="stat-label">Aprendices</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">🧘‍♀️</span>
      <div><div class="stat-value">${totales.instructores}</div><div class="stat-label">Instructores</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">📅</span>
      <div><div class="stat-value">${totales.citas}</div><div class="stat-label">Citas del mes</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">🎓</span>
      <div><div class="stat-value">${totales.actividades}</div><div class="stat-label">Actividades</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">📊</span>
      <div><div class="stat-value">${totales.resultados}</div><div class="stat-label">Resultados</div></div></div>
  `;
}

// ── Gráfica: actividad diaria ─────────────────────────────────

function chartActividad(datos) {
  const ctx = document.getElementById('chartActividad');
  if (!ctx || !datos) return;
  if (charts.actividad) { charts.actividad.destroy(); }

  charts.actividad = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.labels,
      datasets: [
        { label: 'Citas',       data: datos.citas,       borderColor: COLORS.blue,   backgroundColor: 'rgba(59,130,246,.12)',  tension: .4, fill: true, pointRadius: 3 },
        { label: 'Actividades', data: datos.actividades, borderColor: COLORS.green,  backgroundColor: 'rgba(16,185,129,.12)', tension: .4, fill: true, pointRadius: 3 },
        { label: 'Resultados',  data: datos.resultados,  borderColor: COLORS.purple, backgroundColor: 'rgba(139,92,246,.12)', tension: .4, fill: true, pointRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: '📈 Actividad Diaria del Mes', font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── Gráfica: roles (donut) ────────────────────────────────────

function chartRoles(datos) {
  const ctx = document.getElementById('chartRoles');
  if (!ctx || !datos) return;
  if (charts.roles) { charts.roles.destroy(); }

  charts.roles = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Administradores', 'Aprendices', 'Instructores'],
      datasets: [{
        data: [datos.administradores, datos.aprendices, datos.instructores],
        backgroundColor: [COLORS.purple, COLORS.green, COLORS.blue],
        borderWidth: 3, borderColor: '#fff', hoverOffset: 12,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: '👥 Distribución de Roles', font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      }
    }
  });
}

// ── Gráfica: citas 12 meses ───────────────────────────────────

function chartCitas12(datos) {
  const ctx = document.getElementById('chartCitas12');
  if (!ctx || !datos) return;
  if (charts.citas12) { charts.citas12.destroy(); }

  const grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, COLORS.blue);
  grad.addColorStop(1, 'rgba(59,130,246,0.2)');

  charts.citas12 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.labels,
      datasets: [{ label: 'Citas', data: datos.cantidades,
        backgroundColor: grad, borderColor: COLORS.blue, borderWidth: 2, borderRadius: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: '📅 Citas — Últimos 12 Meses', font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── Top aprendices ────────────────────────────────────────────

function renderTopAprendices(lista, periodo) {
  const tbody = document.getElementById('tbody-top');
  const label = document.getElementById('periodo-label');
  if (label && periodo) label.textContent = `${periodo.inicio} → ${periodo.fin}`;
  if (!tbody) return;

  if (!lista || !lista.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Sin actividad en este período.</td></tr>';
    return;
  }

  const maximo = lista[0]?.total || 1;
  tbody.innerHTML = lista.map((a, i) => {
    const pct = Math.round((a.total / maximo) * 100);
    return `<tr>
      <td><strong>${i + 1}</strong></td>
      <td>${a.nombre}</td>
      <td><strong>${a.total}</strong> cita${a.total !== 1 ? 's' : ''}</td>
      <td>
        <div class="bar-row">
          <div class="bar-bg"><div class="bar-fill-green" style="width:${pct}%"></div></div>
          <span>${pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Descargar PDF ─────────────────────────────────────────────

function descargarPDF() {
  const mes = document.getElementById('selector-mes')?.value || '';
  const url = `/admin-panel/reportes/pdf/${mes ? '?mes=' + mes : ''}`;
  window.open(url, '_blank');
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTema();

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const sel = document.getElementById('selector-mes');
  if (sel) sel.value = mesActual;

  // Reportes
  if (document.getElementById('chartActividad')) {
    cargarReporte();
  }

  // Usuarios
  if (document.getElementById('tbody-usuarios')) {
    cargarUsuarios();
    initFiltros();
  }
});