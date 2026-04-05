// ============================================================
//  MINDWELL — Actividades JS v2.0
//  Mejoras: validaciones, preview YouTube/PDF/imagen/link,
//  soft-delete (ocultar/reactivar), toasts, skeletons
//  window.MW_ROL: 2 = aprendiz, 3 = instructor/orientador
// ============================================================

const ROL  = window.MW_ROL;
const CSRF = window.MW_CSRF;

// ── Estado local ────────────────────────────────────────────
let asignadasCache         = [];
let recursosCache          = [];
let idPendienteCompletar   = null;
let idPendienteEliminar    = null;
let idPendienteToggle      = null;
let tipoEliminar           = null;   // 'recurso' | 'asignada'

// ── Utilidades ───────────────────────────────────────────────

const esc = s => s == null ? '' : String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

async function apiGet(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

async function apiPost(url, body = {}) {
  const res = await fetch(url, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function apiPut(url, body = {}) {
  const res = await fetch(url, {
    method: 'PUT', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function apiDelete(url) {
  const res = await fetch(url, {
    method: 'DELETE', credentials: 'same-origin',
    headers: { 'X-CSRFToken': CSRF },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ── Toast Notifications ──────────────────────────────────────

function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${esc(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ── Detección de tipo de URL ─────────────────────────────────

function detectUrlType(url) {
  if (!url || !url.trim()) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (['youtube.com', 'youtu.be'].includes(host)) return 'youtube';
    const ext = u.pathname.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
    return 'link';
  } catch {
    return 'link';
  }
}

function getYoutubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    return u.searchParams.get('v');
  } catch { return null; }
}

function getYoutubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ── Render de preview de recurso ─────────────────────────────

function buildResourcePreview(url, titulo = '') {
  if (!url) return '';
  const type = detectUrlType(url);

  if (type === 'youtube') {
    const vid = getYoutubeId(url);
    if (!vid) return '';
    const thumb = getYoutubeThumbnail(vid);
    return `
      <div class="resource-preview">
        <a href="${esc(url)}" target="_blank" rel="noopener" class="yt-thumb-wrap">
          <img src="${esc(thumb)}" alt="YouTube thumbnail" loading="lazy"
               onerror="this.src='https://img.youtube.com/vi/${esc(vid)}/mqdefault.jpg'">
          <div class="yt-play-btn">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <div class="yt-label">${esc(titulo || 'Ver en YouTube')}</div>
        </a>
      </div>`;
  }

  if (type === 'pdf') {
    const filename = url.split('/').pop().split('?')[0] || 'documento.pdf';
    return `
      <div class="resource-preview">
        <a href="${esc(url)}" target="_blank" rel="noopener" class="pdf-preview-wrap">
          <span class="pdf-icon">📄</span>
          <span>DOCUMENTO PDF</span>
          <span class="pdf-filename">${esc(filename)}</span>
        </a>
      </div>`;
  }

  if (type === 'image') {
    return `
      <div class="resource-preview">
        <a href="${esc(url)}" target="_blank" rel="noopener" class="img-preview-wrap">
          <img src="${esc(url)}" alt="${esc(titulo)}" loading="lazy"
               onerror="this.closest('.resource-preview').style.display='none'">
        </a>
      </div>`;
  }

  if (type === 'link') {
    let domain = url;
    try { domain = new URL(url).hostname.replace('www.', ''); } catch {}
    return `
      <div class="resource-preview">
        <a href="${esc(url)}" target="_blank" rel="noopener" class="link-preview-wrap">
          <span class="link-icon">🔗</span>
          <div class="link-info">
            <div class="link-domain">${esc(domain)}</div>
            <div class="link-hint">${esc(url.length > 60 ? url.slice(0,60)+'…' : url)}</div>
          </div>
        </a>
      </div>`;
  }

  return '';
}

function getTypeBadge(url) {
  const type = detectUrlType(url);
  const map = {
    youtube: ['badge-yt',   '▶ YouTube'],
    pdf:     ['badge-pdf',  '📄 PDF'],
    image:   ['badge-img',  '🖼 Imagen'],
    link:    ['badge-link', '🔗 Enlace'],
  };
  if (!type || !map[type]) return '';
  const [cls, label] = map[type];
  return `<span class="resource-type-badge ${cls}">${label}</span>`;
}

// ── Skeleton loaders ─────────────────────────────────────────

function showSkeleton(containerId, count = 3) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  let html = '<div class="assigned-list">';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-card">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-line" style="width:70%;margin-top:12px"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line xshort"></div>
    </div>`;
  }
  html += '</div>';
  cont.innerHTML = html;
}

// ── Modales ──────────────────────────────────────────────────

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('active'); m.scrollTop = 0; }
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

window.addEventListener('click', e => {
  document.querySelectorAll('.modal.active').forEach(m => {
    if (e.target === m) m.classList.remove('active');
  });
});

// ── Escape para cerrar modales ────────────────────────────────

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  }
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

// ── Actualizar contador de columnas ──────────────────────────

function updateCount(spanId, count) {
  const el = document.getElementById(spanId);
  if (el) el.textContent = count;
}

// ── RENDER: Actividades Asignadas ────────────────────────────

function renderAsignadas(list) {
  const cont = document.getElementById('contenedorAsignadas');
  if (!cont) return;
  updateCount('countAsignadas', list.length);

  if (!list.length) {
    cont.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <p>${ROL === 2 ? 'No tienes actividades asignadas aún.' : 'No has asignado actividades aún.'}</p>
    </div>`;
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'assigned-list';

  list.forEach(a => {
    const completada = a.estado === 'Completada';
    const persona = ROL === 3
      ? `<p>👤 Aprendiz: <strong>${esc(a.nombreEstudiante || '—')}</strong></p>`
      : `<p>👤 Orientador: <strong>${esc(a.nombreOrientador || '—')}</strong></p>`;

    const estadoBadge = `<span class="estado-badge ${completada ? 'completada' : 'pendiente'}">
      ${completada ? '✅ Completada' : '⏳ Pendiente'}
    </span>`;

    const preview = buildResourcePreview(a.urlActividad, a.titulo);

    const botonesAprendiz = ROL === 2 ? `
      <button class="btn-ver" data-action="ver" data-id="${a.id}"
        data-title="${esc(a.titulo)}" data-desc="${esc(a.descripcion)}"
        data-url="${esc(a.urlActividad)}">👁 Ver</button>
      ${!completada
        ? `<button class="btn-completar" data-action="completar" data-id="${a.id}">✅ Completar</button>`
        : ''}` : '';

    const botonesOrientador = ROL === 3 ? `
      <button class="btn-ver" data-action="ver" data-id="${a.id}"
        data-title="${esc(a.titulo)}" data-desc="${esc(a.descripcion)}"
        data-url="${esc(a.urlActividad)}">👁 Ver</button>
      <button class="btn-edit" data-action="editar-asignada" data-id="${a.id}">✏️ Editar</button>
      <button class="btn-delete" data-action="borrar-asignada" data-id="${a.id}">🗑 Eliminar</button>` : '';

    const card = document.createElement('div');
    card.className = `assigned-card ${completada ? 'completada' : ''}`;
    card.innerHTML = `
      ${preview}
      <div style="padding: ${preview ? '10px' : '0'} 0 0">
        <h3>${esc(a.titulo)}</h3>
        ${persona}
        ${estadoBadge}
        ${a.descripcion ? `<p style="margin-top:4px">${esc(a.descripcion)}</p>` : ''}
        ${a.observacion ? `<p>📝 <em>${esc(a.observacion)}</em></p>` : ''}
      </div>
      <div class="assigned-actions">${botonesAprendiz}${botonesOrientador}</div>`;
    wrap.appendChild(card);
  });

  cont.innerHTML = '';
  cont.appendChild(wrap);
}

// ── RENDER: Recursos ─────────────────────────────────────────

function renderRecursos(list) {
  const cont = document.getElementById('contenedorRecursos');
  if (!cont) return;
  updateCount('countRecursos', list.length);

  if (!list.length) {
    cont.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🧘</div>
      <p>No hay recursos disponibles.</p>
    </div>`;
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'optional-list';

  list.forEach(r => {
    const preview  = buildResourcePreview(r.urlRecurso, r.titulo);
    const badge    = getTypeBadge(r.urlRecurso);
    const inactivo = r.activo === false;

    const botonesOrientador = ROL === 3 ? `
      <button class="btn-ver" data-action="ver" data-id="${r.id}"
        data-title="${esc(r.titulo)}" data-desc="${esc(r.descripcion)}"
        data-url="${esc(r.urlRecurso)}">👁 Ver</button>
      <button class="btn-edit" data-action="editar-recurso" data-id="${r.id}"
        data-title="${esc(r.titulo)}" data-desc="${esc(r.descripcion)}"
        data-url="${esc(r.urlRecurso)}">✏️ Editar</button>
      <button class="${inactivo ? 'btn-activate' : 'btn-toggle'}"
        data-action="toggle-recurso" data-id="${r.id}"
        data-activo="${r.activo}">
        ${inactivo ? '✅ Activar' : '🚫 Desactivar'}
      </button>` : `
      <button class="btn-ver" data-action="ver" data-id="${r.id}"
        data-title="${esc(r.titulo)}" data-desc="${esc(r.descripcion)}"
        data-url="${esc(r.urlRecurso)}">👁 Ver</button>`;

    const card = document.createElement('div');
    card.className = `activity-card ${inactivo ? 'inactivo' : ''}`;
    card.innerHTML = `
      ${preview}
      <div class="card-body">
        ${badge}
        ${inactivo ? `<span class="badge-inactivo">⏸ Inactivo</span>` : ''}
        <h3>${esc(r.titulo)}</h3>
        ${r.descripcion ? `<p>${esc(r.descripcion)}</p>` : ''}
        <div class="activity-actions">${botonesOrientador}</div>
      </div>`;
    wrap.appendChild(card);
  });

  cont.innerHTML = '';
  cont.appendChild(wrap);
}

// ── CARGAR datos ─────────────────────────────────────────────

async function cargarAsignadas(filtros = {}) {
  showSkeleton('contenedorAsignadas', 3);
  try {
    const qs   = new URLSearchParams(filtros).toString();
    const data = await apiGet(`/api/actividades/${qs ? '?' + qs : ''}`);
    asignadasCache = data.actividades || [];
    renderAsignadas(asignadasCache);
  } catch (e) {
    console.error(e);
    document.getElementById('contenedorAsignadas').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al cargar actividades: ${esc(e.message)}</p></div>`;
  }
}

async function cargarRecursos() {
  showSkeleton('contenedorRecursos', 3);
  try {
    const data = await apiGet('/api/recursos/');
    // Si el orientador ve todos (activos e inactivos), el backend devuelve ambos.
    // El aprendiz solo recibe activos.
    recursosCache = data.recursos || [];
    renderRecursos(recursosCache);
    poblarSelectRecursos();
  } catch (e) {
    console.error(e);
    document.getElementById('contenedorRecursos').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al cargar recursos.</p></div>`;
  }
}

function poblarSelectRecursos() {
  const sel = document.getElementById('asignar-recurso');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Actividad personalizada —</option>';
  // Solo mostrar recursos activos para asignar
  recursosCache.filter(r => r.activo !== false).forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.titulo;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    const r = recursosCache.find(x => x.id == sel.value);
    if (r) {
      document.getElementById('asignar-titulo').value      = r.titulo;
      document.getElementById('asignar-descripcion').value = r.descripcion;
      document.getElementById('asignar-url').value         = r.urlRecurso || '';
      actualizarPreviewModal('asignar-url', 'asignar-url-preview', r.titulo);
    }
  });
}

// ── Preview en modal al cambiar URL ──────────────────────────

function actualizarPreviewModal(inputId, previewId, titulo = '') {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  const url = input.value.trim();
  if (!url) {
    preview.innerHTML = '';
    preview.classList.remove('visible');
    return;
  }

  const type = detectUrlType(url);
  if (!type) {
    preview.innerHTML = '';
    preview.classList.remove('visible');
    return;
  }

  preview.innerHTML = buildResourcePreview(url, titulo);
  preview.classList.add('visible');
}

function setupUrlPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => actualizarPreviewModal(inputId, previewId), 600);
  });
}

// ── Ver detalle ───────────────────────────────────────────────

function verDetalle(titulo, desc, url) {
  document.getElementById('verTitulo').textContent = titulo || '';
  document.getElementById('verDesc').textContent   = desc   || '';

  const previewWrap = document.getElementById('verPreviewWrap');
  const verLink     = document.getElementById('verUrl');

  if (url && url.trim()) {
    const type = detectUrlType(url);
    if (previewWrap) {
      if (type === 'youtube') {
        const vid = getYoutubeId(url);
        if (vid) {
          // Mostrar iframe embed
          previewWrap.innerHTML = `
            <div style="position:relative;padding-top:56.25%;background:#000">
              <iframe
                src="https://www.youtube.com/embed/${esc(vid)}"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen loading="lazy"></iframe>
            </div>`;
          previewWrap.style.display = 'block';
        }
      } else if (type === 'pdf') {
        previewWrap.innerHTML = `
          <iframe src="${esc(url)}" style="width:100%;height:320px;border:none"
            title="Vista previa PDF"></iframe>`;
        previewWrap.style.display = 'block';
      } else if (type === 'image') {
        previewWrap.innerHTML = `
          <img src="${esc(url)}" alt="${esc(titulo)}"
            style="width:100%;max-height:320px;object-fit:contain;background:var(--bg-primary)"
            onerror="this.closest('#verPreviewWrap').style.display='none'">`;
        previewWrap.style.display = 'block';
      } else {
        previewWrap.style.display = 'none';
      }
    }

    verLink.style.display = 'inline-flex';
    verLink.href = url;
    verLink.textContent = '🔗 Abrir enlace';
  } else {
    if (previewWrap) previewWrap.style.display = 'none';
    verLink.style.display = 'none';
  }

  openModal('modal-ver');
}

// ── COMPLETAR actividad (aprendiz) ────────────────────────────

function ejecutarCompletar() {
  if (!idPendienteCompletar) return;
  apiPost(`/api/actividades/${idPendienteCompletar}/completar/`)
    .then(d => {
      showToast(d.mensaje || '¡Actividad completada!', 'success');
      closeModal('modal-confirmar-completar');
      idPendienteCompletar = null;
      cargarAsignadas();
    })
    .catch(e => showToast(e.message, 'error'));
}

// ── Validación de formularios ─────────────────────────────────

function validarCampo(inputId, errorId, mensaje) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input) return true;
  const val = input.value.trim();
  if (!val) {
    input.classList.add('error');
    if (error) { error.textContent = mensaje; error.classList.add('visible'); }
    return false;
  }
  input.classList.remove('error');
  if (error) error.classList.remove('visible');
  return true;
}

function validarUrl(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input || !input.value.trim()) return true; // URL es opcional
  try {
    new URL(input.value.trim());
    input.classList.remove('error');
    if (error) error.classList.remove('visible');
    return true;
  } catch {
    input.classList.add('error');
    if (error) { error.textContent = 'Ingresa una URL válida (https://...)'; error.classList.add('visible'); }
    return false;
  }
}

function limpiarValidacion(form) {
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  form.querySelectorAll('.field-error.visible').forEach(el => el.classList.remove('visible'));
}

// ── Deshabilitar botón submit durante carga ───────────────────

function setSubmitLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn._originalText = btn._originalText || btn.textContent;
  btn.textContent = loading ? 'Guardando…' : btn._originalText;
}

// ── CREAR RECURSO (orientador) ────────────────────────────────

async function crearRecurso(e) {
  e.preventDefault();
  const form  = document.getElementById('formCrearRecurso');
  limpiarValidacion(form);

  const ok1 = validarCampo('recurso-titulo', 'err-recurso-titulo', 'El título es obligatorio.');
  const ok2 = validarUrl('recurso-url', 'err-recurso-url');
  if (!ok1 || !ok2) return;

  const titulo      = document.getElementById('recurso-titulo')?.value.trim();
  const descripcion = document.getElementById('recurso-descripcion')?.value.trim();
  const url         = document.getElementById('recurso-url')?.value.trim();
  const btn         = form.querySelector('button[type="submit"]');

  setSubmitLoading(btn, true);
  try {
    const data = await apiPost('/api/recursos/crear/', { titulo, descripcion, url_recurso: url });
    showToast(data.mensaje || '¡Recurso creado!', 'success');
    closeModal('modal-crear-recurso');
    form.reset();
    document.getElementById('recurso-url-preview')?.classList.remove('visible');
    cargarRecursos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setSubmitLoading(btn, false);
  }
}

// ── EDITAR RECURSO (orientador) ───────────────────────────────

function abrirEditarRecurso(id, titulo, desc, url) {
  document.getElementById('editar-recurso-id').value          = id;
  document.getElementById('editar-recurso-titulo').value      = titulo;
  document.getElementById('editar-recurso-descripcion').value = desc;
  document.getElementById('editar-recurso-url').value         = url;
  actualizarPreviewModal('editar-recurso-url', 'editar-recurso-url-preview', titulo);
  limpiarValidacion(document.getElementById('formEditarRecurso'));
  openModal('modal-editar-recurso');
}

async function editarRecurso(e) {
  e.preventDefault();
  const form = document.getElementById('formEditarRecurso');
  limpiarValidacion(form);

  const ok1 = validarCampo('editar-recurso-titulo', 'err-editar-recurso-titulo', 'El título es obligatorio.');
  const ok2 = validarUrl('editar-recurso-url', 'err-editar-recurso-url');
  if (!ok1 || !ok2) return;

  const id          = document.getElementById('editar-recurso-id').value;
  const titulo      = document.getElementById('editar-recurso-titulo')?.value.trim();
  const descripcion = document.getElementById('editar-recurso-descripcion')?.value.trim();
  const url         = document.getElementById('editar-recurso-url')?.value.trim();
  const btn         = form.querySelector('button[type="submit"]');

  setSubmitLoading(btn, true);
  try {
    const data = await apiPut(`/api/recursos/${id}/`, { titulo, descripcion, url_recurso: url });
    showToast(data.mensaje || 'Recurso actualizado.', 'success');
    closeModal('modal-editar-recurso');
    cargarRecursos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setSubmitLoading(btn, false);
  }
}

// ── TOGGLE RECURSO activo/inactivo (soft delete) ─────────────

function abrirToggleRecurso(id, activo) {
  idPendienteToggle = id;
  const titulo = document.getElementById('toggle-titulo-modal');
  const texto  = document.getElementById('toggle-texto-modal');
  const btn    = document.getElementById('btn-confirmar-toggle');
  if (!titulo || !texto || !btn) return;

  if (activo === 'true' || activo === true) {
    titulo.textContent = '🚫 Desactivar Recurso';
    texto.textContent  = 'El recurso dejará de ser visible pero no se eliminará. Puedes reactivarlo cuando quieras.';
    btn.textContent    = 'Sí, desactivar';
    btn.className      = 'btn-cancelar';
  } else {
    titulo.textContent = '✅ Reactivar Recurso';
    texto.textContent  = 'El recurso volverá a ser visible para los aprendices.';
    btn.textContent    = 'Sí, reactivar';
    btn.className      = 'btn-confirm';
  }
  openModal('modal-confirmar-toggle');
}

async function ejecutarToggleRecurso() {
  if (!idPendienteToggle) return;
  try {
    const data = await apiPost(`/api/recursos/${idPendienteToggle}/toggle/`);
    showToast(data.mensaje || 'Estado actualizado.', 'success');
    closeModal('modal-confirmar-toggle');
    idPendienteToggle = null;
    cargarRecursos();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── ASIGNAR ACTIVIDAD (orientador) ────────────────────────────

async function asignarActividad(e) {
  e.preventDefault();
  const form = document.getElementById('formAsignar');
  limpiarValidacion(form);

  const ok1 = validarCampo('asignar-estudiante', 'err-asignar-estudiante', 'Debes seleccionar un aprendiz.');
  const ok2 = validarCampo('asignar-titulo',     'err-asignar-titulo',     'El título es obligatorio.');
  const ok3 = validarUrl('asignar-url', 'err-asignar-url');
  if (!ok1 || !ok2 || !ok3) return;

  const estudiante_id = document.getElementById('asignar-estudiante')?.value;
  const titulo        = document.getElementById('asignar-titulo')?.value.trim();
  const descripcion   = document.getElementById('asignar-descripcion')?.value.trim();
  const url           = document.getElementById('asignar-url')?.value.trim();
  const recurso_id    = document.getElementById('asignar-recurso')?.value || null;
  const observacion   = document.getElementById('asignar-observacion')?.value.trim();
  const btn           = form.querySelector('button[type="submit"]');

  setSubmitLoading(btn, true);
  try {
    const data = await apiPost('/api/actividades/crear/', {
      estudiante_id, titulo, descripcion, url_actividad: url,
      recurso_id: recurso_id || null, observacion,
    });
    showToast(data.mensaje || '¡Actividad asignada!', 'success');
    closeModal('modal-asignar');
    form.reset();
    document.getElementById('asignar-url-preview')?.classList.remove('visible');
    cargarAsignadas();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setSubmitLoading(btn, false);
  }
}

// ── EDITAR ACTIVIDAD ASIGNADA (orientador) ────────────────────

async function abrirEditarAsignada(id) {
  try {
    const a = await apiGet(`/api/actividades/${id}/`);
    document.getElementById('editar-asignada-id').value          = id;
    document.getElementById('editar-asignada-titulo').value      = a.titulo;
    document.getElementById('editar-asignada-descripcion').value = a.descripcion;
    document.getElementById('editar-asignada-url').value         = a.urlActividad || '';
    document.getElementById('editar-asignada-observacion').value = a.observacion || '';
    actualizarPreviewModal('editar-asignada-url', 'editar-asignada-url-preview', a.titulo);
    limpiarValidacion(document.getElementById('formEditarAsignada'));
    openModal('modal-editar-asignada');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function editarAsignada(e) {
  e.preventDefault();
  const form = document.getElementById('formEditarAsignada');
  limpiarValidacion(form);

  const ok1 = validarCampo('editar-asignada-titulo', 'err-editar-asignada-titulo', 'El título es obligatorio.');
  const ok2 = validarUrl('editar-asignada-url', 'err-editar-asignada-url');
  if (!ok1 || !ok2) return;

  const id          = document.getElementById('editar-asignada-id').value;
  const titulo      = document.getElementById('editar-asignada-titulo')?.value.trim();
  const descripcion = document.getElementById('editar-asignada-descripcion')?.value.trim();
  const url         = document.getElementById('editar-asignada-url')?.value.trim();
  const observacion = document.getElementById('editar-asignada-observacion')?.value.trim();
  const btn         = form.querySelector('button[type="submit"]');

  setSubmitLoading(btn, true);
  try {
    const data = await apiPut(`/api/actividades/${id}/editar/`, { titulo, descripcion, url_actividad: url, observacion });
    showToast(data.mensaje || 'Actividad actualizada.', 'success');
    closeModal('modal-editar-asignada');
    cargarAsignadas();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setSubmitLoading(btn, false);
  }
}

// ── ELIMINAR (orientador) ─────────────────────────────────────

function abrirEliminar(id, tipo) {
  idPendienteEliminar = id;
  tipoEliminar        = tipo;
  document.getElementById('eliminar-titulo-modal').textContent =
    tipo === 'recurso' ? '🗑️ Eliminar Recurso' : '🗑️ Eliminar Actividad Asignada';
  document.getElementById('eliminar-desc-modal').textContent =
    tipo === 'asignada'
      ? '¿Seguro que deseas eliminar esta actividad asignada? Esta acción no se puede deshacer.'
      : '¿Seguro que deseas eliminar este recurso permanentemente?';
  openModal('modal-confirmar-eliminar');
}

async function ejecutarEliminar() {
  if (!idPendienteEliminar || !tipoEliminar) return;
  const tipo = tipoEliminar;
  const url  = tipo === 'recurso'
    ? `/api/recursos/${idPendienteEliminar}/eliminar/`
    : `/api/actividades/${idPendienteEliminar}/eliminar/`;
  try {
    const data = await apiDelete(url);
    showToast(data.mensaje || '¡Eliminado!', 'success');
    closeModal('modal-confirmar-eliminar');
    idPendienteEliminar = null;
    tipoEliminar        = null;
    // Recargar el que corresponde
    if (tipo === 'recurso') cargarRecursos();
    else                    cargarAsignadas();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── FILTROS (aprendiz) ────────────────────────────────────────

function aplicarFiltros() {
  const texto  = (document.getElementById('filtroTexto')?.value  || '').toLowerCase().trim();
  const estado = (document.getElementById('filtroEstado')?.value || '');

  const filtradas = asignadasCache.filter(a => {
    const coincideTexto  = !texto  || a.titulo?.toLowerCase().includes(texto) || a.descripcion?.toLowerCase().includes(texto);
    const coincideEstado = !estado || a.estado === estado;
    return coincideTexto && coincideEstado;
  });
  renderAsignadas(filtradas);

  const filtradosR = texto
    ? recursosCache.filter(r =>
        r.titulo?.toLowerCase().includes(texto) || r.descripcion?.toLowerCase().includes(texto)
      )
    : recursosCache;
  renderRecursos(filtradosR);
}

// ── DELEGACIÓN DE CLICKS ──────────────────────────────────────

function setupDelegacion() {
  ['contenedorAsignadas', 'contenedorRecursos'].forEach(contId => {
    document.getElementById(contId)?.addEventListener('click', e => {
      const btn    = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id     = btn.dataset.id;

      switch (action) {
        case 'ver':
          verDetalle(btn.dataset.title, btn.dataset.desc, btn.dataset.url);
          break;
        case 'completar':
          idPendienteCompletar = id;
          openModal('modal-confirmar-completar');
          break;
        case 'editar-recurso':
          abrirEditarRecurso(id, btn.dataset.title, btn.dataset.desc, btn.dataset.url);
          break;
        case 'toggle-recurso':
          abrirToggleRecurso(id, btn.dataset.activo);
          break;
        case 'borrar-recurso':
          abrirEliminar(id, 'recurso');
          break;
        case 'editar-asignada':
          abrirEditarAsignada(id);
          break;
        case 'borrar-asignada':
          abrirEliminar(id, 'asignada');
          break;
      }
    });
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

// ── INIT ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTema();
  cargarAsignadas();
  cargarRecursos();
  setupDelegacion();
  configurarCerrarSesion();

  // Filtros en tiempo real (solo aprendiz)
  if (ROL === 2) {
    document.getElementById('filtroTexto')?.addEventListener('input', aplicarFiltros);
    document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltros);
  }

  // Preview de URL en modales
  setupUrlPreview('recurso-url',            'recurso-url-preview');
  setupUrlPreview('editar-recurso-url',     'editar-recurso-url-preview');
  setupUrlPreview('asignar-url',            'asignar-url-preview');
  setupUrlPreview('editar-asignada-url',    'editar-asignada-url-preview');

  // Limpiar errores al escribir en inputs
  document.querySelectorAll('.form-group input, .form-group textarea, .form-group select').forEach(el => {
    el.addEventListener('input', () => {
      el.classList.remove('error');
      const errId = 'err-' + el.id;
      document.getElementById(errId)?.classList.remove('visible');
    });
  });

  // Forms orientador
  document.getElementById('formCrearRecurso')?.addEventListener('submit', crearRecurso);
  document.getElementById('formEditarRecurso')?.addEventListener('submit', editarRecurso);
  document.getElementById('formAsignar')?.addEventListener('submit', asignarActividad);
  document.getElementById('formEditarAsignada')?.addEventListener('submit', editarAsignada);
});