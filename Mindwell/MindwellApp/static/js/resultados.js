// ============================================================
//  MINDWELL — Resultados JS
//  window.MW_ROL: 2=aprendiz, 3=orientador
// ============================================================

const ROL     = window.MW_ROL;
const CSRF    = window.MW_CSRF;
const USER_ID = window.MW_USER_ID;

// Chart.js defaults
Chart.defaults.font.family = "'Inter','Segoe UI',sans-serif";
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 14;

// Paleta
const C = {
  blue:   'rgba(59,130,246,0.85)',
  green:  'rgba(16,185,129,0.85)',
  yellow: 'rgba(245,158,11,0.85)',
  red:    'rgba(239,68,68,0.85)',
  purple: 'rgba(139,92,246,0.85)',
  blueL:  'rgba(59,130,246,0.25)',
};

const ANIMATION = {
  duration: 900,
  easing: 'easeInOutQuart',
};

const TOOLTIP = {
  backgroundColor: 'rgba(15,23,42,0.92)',
  titleColor: '#fff',
  bodyColor: '#cbd5e1',
  borderColor: '#334155',
  borderWidth: 1,
  padding: 12,
  usePointStyle: true,
};

// ── Estado local ─────────────────────────────────────────────
let charts         = {};
let resultadosCache = [];

// ── Fetch helpers ────────────────────────────────────────────

async function apiGet(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function apiPut(url, body) {
  const res = await fetch(url, {
    method: 'PUT', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ── Modales ──────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}
window.addEventListener('click', e => {
  document.querySelectorAll('.modal.active').forEach(m => {
    if (e.target === m) m.classList.remove('active');
  });
});

// ── Sidebar / Tema ───────────────────────────────────────────

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


// ── Nivel calculado en tiempo real ───────────────────────────

function calcNivel(estres, ansiedad) {
  const avg = (estres + ansiedad) / 2;
  if (avg <= 33) return 'BAJO';
  if (avg <= 66) return 'MEDIO';
  return 'ALTO';
}

function updateNivelPreview(prefix = 'crear') {
  const e = parseInt(document.getElementById(`${prefix}-estres`)?.value  || 0);
  const a = parseInt(document.getElementById(`${prefix}-ansiedad`)?.value || 0);
  const nivel = calcNivel(e, a);
  const preview = document.getElementById('nivel-preview');
  const texto   = document.getElementById('nivel-texto');
  if (!preview || !texto) return;
  texto.textContent = nivel;
  preview.className = `nivel-preview nivel-${nivel.toLowerCase()}`;
}

// ── Gráficas ─────────────────────────────────────────────────

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function chartCitasMes(datos) {
  const ctx = document.getElementById('chartCitasMes');
  if (!ctx) return;
  destroyChart('citasMes');
  const grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, C.blue);
  grad.addColorStop(1, C.blueL);

  charts.citasMes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.meses,
      datasets: [{ label: 'Citas', data: datos.cantidades,
        backgroundColor: grad, borderColor: C.blue,
        borderWidth: 2, borderRadius: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: ANIMATION,
      plugins: {
        legend: { display: false },
        tooltip: TOOLTIP,
        title: { display: true, text: '📅 Citas por Mes (últimos 12 meses)',
          font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function chartNivelEstres(datos) {
  const ctx = document.getElementById('chartNivelEstres');
  if (!ctx) return;
  destroyChart('nivelEstres');
  charts.nivelEstres = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Bajo (0–33)', 'Medio (34–66)', 'Alto (67–100)'],
      datasets: [{ data: [datos.bajo, datos.medio, datos.alto],
        backgroundColor: [C.green, C.yellow, C.red],
        borderWidth: 3, borderColor: '#fff', hoverOffset: 12 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      animation: { ...ANIMATION, animateRotate: true },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { ...TOOLTIP, callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
            const pct   = total ? ((ctx.parsed/total)*100).toFixed(1) : 0;
            return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
          }
        }},
        title: { display: true, text: '📊 Niveles de Estrés',
          font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      }
    }
  });
}

function chartMotivos(datos) {
  const ctx = document.getElementById('chartMotivos');
  if (!ctx) return;
  destroyChart('motivos');
  charts.motivos = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Ansiedad', 'Estrés', 'Otro'],
      datasets: [{ data: [datos.ansiedad, datos.estres, datos.otro],
        backgroundColor: [C.yellow, C.red, C.purple],
        borderWidth: 3, borderColor: '#fff', hoverOffset: 14 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { ...ANIMATION, animateRotate: true },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: TOOLTIP,
        title: { display: true, text: '🎯 Motivos de Consulta',
          font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      }
    }
  });
}

function chartHorarios(datos) {
  const ctx = document.getElementById('chartHorarios');
  if (!ctx) return;
  destroyChart('horarios');
  const grad = ctx.getContext('2d').createLinearGradient(360, 0, 0, 0);
  grad.addColorStop(0, C.purple);
  grad.addColorStop(1, 'rgba(139,92,246,0.25)');
  charts.horarios = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.horas,
      datasets: [{ label: 'Citas', data: datos.cantidades,
        backgroundColor: grad, borderColor: C.purple,
        borderWidth: 2, borderRadius: 8 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      animation: ANIMATION,
      plugins: {
        legend: { display: false }, tooltip: TOOLTIP,
        title: { display: true, text: '⏰ Horarios Frecuentes',
          font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { display: false } }
      }
    }
  });
}



function chartDias(datos) {
  const ctx = document.getElementById('chartDiasSemana');
  if (!ctx) return;
  destroyChart('dias');
  const colores = [C.blue,C.green,C.yellow,C.purple,C.red,'rgba(236,72,153,0.8)','rgba(14,165,233,0.8)'];
  charts.dias = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
      datasets: [{ label: 'Citas', data: datos.cantidades,
        backgroundColor: colores, borderWidth: 2, borderRadius: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: ANIMATION,
      plugins: {
        legend: { display: false }, tooltip: TOOLTIP,
        title: { display: true, text: '📆 Citas por Día',
          font: { size: 15, weight: '700' }, padding: { bottom: 16 } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}



function renderStats(stats) {
  const el = document.getElementById('estadisticas-rapidas');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card-mini"><span class="stat-icon">📊</span>
      <div><div class="stat-value">${stats.totalCitas||0}</div><div class="stat-label">Total Citas</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">📝</span>
      <div><div class="stat-value">${stats.totalEvaluaciones||0}</div><div class="stat-label">Evaluaciones</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">⭐</span>
      <div><div class="stat-value">${stats.promedioEstres||'—'}</div><div class="stat-label">Prom. Estrés</div></div></div>
    <div class="stat-card-mini"><span class="stat-icon">📈</span>
      <div><div class="stat-value">${stats.citasEsteMes||0}</div><div class="stat-label">Este Mes</div></div></div>
  `;
}

// ── Tabla de evaluaciones ────────────────────────────────────

function renderTabla(evaluaciones) {
  const tbody = document.getElementById('tbody-evaluaciones');
  if (!tbody) return;

  if (!evaluaciones.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">📭 Sin evaluaciones registradas.</td></tr>`;
    return;
  }

  resultadosCache = evaluaciones;

  tbody.innerHTML = evaluaciones.map(r => {
    const nivelBadge = `<span class="nivel-badge nivel-${r.nivelDetectado?.toLowerCase()}">${r.nivelDetectado||'—'}</span>`;
    const personaCell = ROL === 3
      ? `<td>${r.nombreEstudiante||'—'}</td>`
      : `<td>${r.nombreOrientador||'—'}</td>`;
    const acciones = ROL === 3
      ? `<td>
           <button class="btn-table-edit" onclick="abrirEditar(${r.id})">✏️</button>
           <a href="/resultados/pdf/${r.idEstudiante}/" target="_blank" class="btn-table-pdf" title="PDF proceso">📄</a>
         </td>`
      : '';

    return `<tr>
      <td>${r.fechaEvaluacion||'—'}</td>
      ${personaCell}
      <td>${r.fechaCita||'—'}</td>
      <td><div class="bar-cell"><div class="mini-bar" style="width:${r.puntuacionEstres||0}%;background:${r.puntuacionEstres>66?'#ef4444':r.puntuacionEstres>33?'#eab308':'#22c55e'}"></div><span>${r.puntuacionEstres||0}</span></div></td>
      <td><div class="bar-cell"><div class="mini-bar" style="width:${r.puntuacionAnsiedad||0}%;background:${r.puntuacionAnsiedad>66?'#ef4444':r.puntuacionAnsiedad>33?'#eab308':'#22c55e'}"></div><span>${r.puntuacionAnsiedad||0}</span></div></td>
      <td>${nivelBadge}</td>
      <td class="avance-cell" title="${r.avanceObservado||''}">${(r.avanceObservado||'—').substring(0,60)}${(r.avanceObservado||'').length>60?'…':''}</td>
      ${acciones}
    </tr>`;
  }).join('');
}

// ── Cargar datos para gráficas ───────────────────────────────

async function cargarGraficas(idEstudiante = '') {
  try {
    const url = `/api/resultados/graficas/${idEstudiante ? '?idEstudiante=' + idEstudiante : ''}`;
    const d   = await apiGet(url);
    if (d.citasPorMes)         chartCitasMes(d.citasPorMes);
    if (d.nivelesEstres)       chartNivelEstres(d.nivelesEstres);
    if (d.motivosClasificados) chartMotivos(d.motivosClasificados);
    if (d.citasPorHora)        chartHorarios(d.citasPorHora);
    if (d.citasPorDia)         chartDias(d.citasPorDia);
    if (d.estadisticas)        renderStats(d.estadisticas);
    if (d.evaluacionesRecientes) renderTabla(d.evaluacionesRecientes);
  } catch (e) {
    console.error(e);
  }
}

// ── Cargar aprendices en el filtro (orientador) ──────────────

async function cargarFiltroAprendices() {
  try {
    const d   = await apiGet('/api/resultados/aprendices/');
    const sel = document.getElementById('filtro-aprendiz');
    if (!sel) return;
    d.aprendices.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id; opt.textContent = a.nombre;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => cargarGraficas(sel.value));
  } catch (e) { console.error(e); }
}

// ── Modal: Crear resultado ───────────────────────────────────

async function abrirModalCrear() {
  try {
    const d   = await apiGet('/api/resultados/citas-sin-resultado/');
    const sel = document.getElementById('crear-cita');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona una cita...</option>';
    if (!d.citas.length) {
      sel.innerHTML = '<option value="" disabled>Sin citas disponibles — todas tienen resultado</option>';
    } else {
      d.citas.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.estudiante} — ${c.fecha} ${c.hora} | ${c.motivo.substring(0,50)}`;
        sel.appendChild(opt);
      });
    }
    openModal('modal-crear');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e.message });
  }
}

async function crearResultado(e) {
  e.preventDefault();
  const cita_id           = document.getElementById('crear-cita')?.value;
  const puntuacion_estres = parseInt(document.getElementById('crear-estres')?.value   || 0);
  const puntuacion_ansiedad = parseInt(document.getElementById('crear-ansiedad')?.value || 0);
  const avance_observado  = document.getElementById('crear-avance')?.value.trim();
  const recomendaciones   = document.getElementById('crear-reco')?.value.trim();
  const observaciones     = document.getElementById('crear-obs')?.value.trim();
  const asistio           = document.getElementById('crear-asistio')?.checked ?? true;
  const requiere_seguimiento = document.getElementById('crear-seguimiento')?.checked ?? false;

  if (!cita_id) return Swal.fire({ icon: 'warning', title: 'Selecciona una cita', text: 'El campo cita es obligatorio.' });

  try {
    const data = await apiPost('/api/resultados/crear/', {
      cita_id, puntuacion_estres, puntuacion_ansiedad,
      avance_observado, recomendaciones, observaciones,
      asistio, requiere_seguimiento,
    });
    Swal.fire({ icon: 'success', title: '¡Guardado!', text: data.mensaje, timer: 2000, showConfirmButton: false });
    closeModal('modal-crear');
    document.getElementById('formCrear').reset();
    document.getElementById('val-estres').textContent   = '0';
    document.getElementById('val-ansiedad').textContent = '0';
    cargarGraficas();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ── Modal: Editar resultado ───────────────────────────────────

async function abrirEditar(id) {
  const r = resultadosCache.find(x => x.id === id);
  if (!r) return;

  document.getElementById('editar-id').value            = id;
  document.getElementById('editar-estres').value        = r.puntuacionEstres   || 0;
  document.getElementById('val-estres-e').textContent   = r.puntuacionEstres   || 0;
  document.getElementById('editar-ansiedad').value      = r.puntuacionAnsiedad || 0;
  document.getElementById('val-ansiedad-e').textContent = r.puntuacionAnsiedad || 0;
  document.getElementById('editar-avance').value        = r.avanceObservado   || '';
  document.getElementById('editar-reco').value          = r.recomendaciones   || '';
  document.getElementById('editar-obs').value           = r.observaciones     || '';
  document.getElementById('editar-asistio').checked     = r.asistio ?? true;
  document.getElementById('editar-seguimiento').checked = r.requiereSeguimiento ?? false;
  openModal('modal-editar');
}

async function editarResultado(e) {
  e.preventDefault();
  const id = document.getElementById('editar-id')?.value;
  const puntuacion_estres   = parseInt(document.getElementById('editar-estres')?.value   || 0);
  const puntuacion_ansiedad = parseInt(document.getElementById('editar-ansiedad')?.value || 0);
  const avance_observado    = document.getElementById('editar-avance')?.value.trim();
  const recomendaciones     = document.getElementById('editar-reco')?.value.trim();
  const observaciones       = document.getElementById('editar-obs')?.value.trim();
  const asistio             = document.getElementById('editar-asistio')?.checked ?? true;
  const requiere_seguimiento = document.getElementById('editar-seguimiento')?.checked ?? false;

  try {
    const data = await apiPut(`/api/resultados/${id}/editar/`, {
      puntuacion_estres, puntuacion_ansiedad,
      avance_observado, recomendaciones, observaciones,
      asistio, requiere_seguimiento,
    });
    Swal.fire({ icon: 'success', title: '¡Actualizado!', text: data.mensaje, timer: 2000, showConfirmButton: false });
    closeModal('modal-editar');
    cargarGraficas();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ── Buscar en tabla ──────────────────────────────────────────

function initBuscar() {
  const inp = document.getElementById('buscar-evaluacion');
  if (!inp) return;
  inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase();
    const filtradas = resultadosCache.filter(r =>
      (r.nombreEstudiante||'').toLowerCase().includes(q) ||
      (r.avanceObservado||'').toLowerCase().includes(q)
    );
    renderTabla(filtradas);
  });
}

function configurarCerrarSesion() {
  const btn = document.getElementById('btn-sesion');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();

    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Vas a salir de tu cuenta',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00966C',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = btn.href;
      }
    });
  });
}



// ── INIT ─────────────────────────────────────────────────────




document.addEventListener('DOMContentLoaded', () => {
  initTema();
  cargarGraficas();
  initBuscar();
  configurarCerrarSesion();

  if (ROL === 3) {
    cargarFiltroAprendices();
  }

  // Nivel preview en tiempo real
  document.getElementById('crear-estres')?.addEventListener('input',   () => updateNivelPreview('crear'));
  document.getElementById('crear-ansiedad')?.addEventListener('input', () => updateNivelPreview('crear'));

  // Forms
  document.getElementById('formCrear')?.addEventListener('submit', crearResultado);
  document.getElementById('formEditar')?.addEventListener('submit', editarResultado);
  
});

