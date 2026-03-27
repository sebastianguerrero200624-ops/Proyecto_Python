
/* 
   1. UTILIDADES
    */
function isValidId(id) { return Number.isInteger(id) && id > 0; }

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const raw = await res.text();
    if (!res.ok) {
      try { const parsed = JSON.parse(raw); return { ok: false, status: res.status, body: parsed, raw }; }
      catch (e) { return { ok: false, status: res.status, body: raw, raw }; }
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return { ok: true, json: JSON.parse(raw) };
    return { ok: true, text: raw };
  } catch (err) {
    console.error("Fetch error:", err);
    return { ok: false, error: err };
  }
}


const actividadesMap = new Map(); 
let selectsListenerAttached = false;

/* 
   CARGAR SELECTS (Actividades y Estudiantes)
    */
async function cargarSelectsParaCrear() {
  const selAct = document.getElementById("crearAsignadaActividad");
  const selApr = document.getElementById("crearAsignadaIdEstudiante");
  if (selAct) selAct.innerHTML = `<option value="">Cargando actividades...</option>`;
  if (selApr) selApr.innerHTML = `<option value="">Cargando estudiantes...</option>`;

  // Actividades
  const resA = await safeFetch("/api/actividades");
  if (resA.ok && resA.json) {
    const data = Array.isArray(resA.json) ? resA.json : [];
    actividadesMap.clear();
    if (selAct) {
      selAct.innerHTML = `<option value="">Seleccione una actividad (opcional)</option>`;
      data.forEach(a => {
        const id = a.idActividad ?? a.id;
        const titulo = a.titulo ?? a.nombre ?? "Actividad";
         const url = a.urlActividad ?? '';
        const descripcion = a.descripcion ?? "";
        if (id != null) {
          actividadesMap.set(Number(id), { titulo, descripcion });
          selAct.innerHTML += `<option value="${id}">${esc(titulo)}</option>`;
        }
      });
      selAct.innerHTML += `<option value="__custom">— Crear actividad personalizada —</option>`;
    }
  } else {
    if (selAct) selAct.innerHTML = `<option value="">Error cargando actividades</option>`;
  }

  // Estudiantes / aprendices
  const resU = await safeFetch("/api/usuarios/rol/2/select");
  if (resU.ok && resU.json) {
    const data = Array.isArray(resU.json) ? resU.json : [];
    if (selApr) {
      selApr.innerHTML = `<option value="">Seleccione un estudiante</option>`;
      data.forEach(u => {
        const id = u.idEstudiante ?? u.idAprendiz ?? u.id;
        const nombreCompleto = `${u.nombre ?? u.firstName ?? ""} ${u.apellido ?? u.lastName ?? ""}`.trim() || (u.username ?? "Estudiante");
        if (id != null) selApr.innerHTML += `<option value="${id}">${esc(nombreCompleto)}</option>`;
      });
    }
  } else {
    if (selApr) selApr.innerHTML = `<option value="">Error cargando estudiantes</option>`;
  }

  const chosen = document.getElementById("crearAsignadaActividad");
  if (chosen && !selectsListenerAttached) {
    chosen.addEventListener("change", () => {
      const val = chosen.value;
      const customBlock = document.getElementById("crearPersonalizadoBlock");
      if (customBlock) customBlock.style.display = (val === "__custom") ? "block" : "none";

      if (val && val !== "__custom") {
        const info = actividadesMap.get(Number(val));
        if (info) {
          const t = document.getElementById("crearAsignadaTitulo");
          const d = document.getElementById("crearAsignadaDescripcion");
          if (t) t.value = info.titulo;
          if (d) d.value = info.descripcion;
        }
      }
    });
    selectsListenerAttached = true;
  }
}

/* 
    CARGAR ACTIVIDADES ASIGNADAS (Columna Izquierda)
    */
async function cargarAsignadas() {
  const cont = document.getElementById("contenedorAsignadas");
  if (!cont) return;
  cont.innerHTML = `<h2>📘 Actividades Asignadas a tus aprendices</h2>`;

  const res = await safeFetch("/api/actividad-asignada/listar");
  if (!res.ok) {
    cont.innerHTML += `<p>Error cargando asignadas (ver consola)</p>`;
    return;
  }
  const data = Array.isArray(res.json) ? res.json : [];
  if (!data.length) { cont.innerHTML += `<p style="opacity:.8">No hay actividades asignadas.</p>`; return; }

  const list = document.createElement('div');
  list.className = 'assigned-list';

  data.forEach(a => {
    const id = a.idAsignada ?? a.id ?? a.id_asignada;
    const titulo = a.titulo ?? a.nombre ?? "Sin título";
    const descripcion = a.descripcion ?? a.descrip ?? "";
    const url = a.urlActividad ?? a.url_actividad ?? "";
    const estado = a.estado ?? "Pendiente";
    const idEstudiante = a.idEstudiante ?? a.id_estudiante ?? a.idEst;

    const card = document.createElement('div');
    card.className = `assigned-card ${estado === 'Completada' ? 'completada' : ''}`;
    card.dataset.id = id;

    card.innerHTML = `
      <h3>${esc(titulo)}</h3>
      <p class="small">Estudiante ID: <strong>${esc(String(idEstudiante ?? '—'))}</strong></p>
      <p>${esc(descripcion)}</p>
      <p><strong>Estado:</strong> ${esc(estado)}</p>
      <div class="assigned-actions">
        <button class="btn-ver" data-action="ver" data-id="${id}" data-title="${esc(titulo)}" data-desc="${esc(descripcion)}" data-url="${esc(url)}">Ver</button>
        <button class="btn-edit" data-action="editar" data-id="${id}">Editar</button>
        <button class="btn-delete" data-action="borrar" data-id="${id}">Eliminar</button>
        ${ estado !== "Completada"
          ? `<button class="btn-complete" data-action="completar" data-id="${id}">Marcar como completada</button>`
          : `<span class="done-label">✔ Completa</span>`}
      </div>
    `;

    list.appendChild(card);
  });

  cont.appendChild(list);
}

/* 
    MODALES
    */
function openModal(title, text) {
  const m = document.getElementById("modalInfo"); if (!m) return;
  document.getElementById("modalTitle").innerText = title || "";
  document.getElementById("modalText").innerText = text || "";
  m.classList.add("active");
}
function closeModal() { document.getElementById("modalInfo")?.classList.remove("active"); }

function openAsignadaModal(t, d, url, estado) {
  const m = document.getElementById("modalAsignadaInfo"); if (!m) return;
  document.getElementById("asignadaTitle").innerText = t || "";
  document.getElementById("asignadaDesc").innerText = d || "";
  document.getElementById("asignadaEstado").innerText = estado || "";
  const link = document.getElementById("asignadaUrl");
  if (link) {
    if (url && url.trim() !== "") { link.style.display = "inline"; link.href = url; }
    else { link.style.display = "none"; link.removeAttribute("href"); }
  }
  m.classList.add("active");
}
function closeAsignadaModal() { document.getElementById("modalAsignadaInfo")?.classList.remove("active"); }

function openCrearModal() { document.getElementById("crearModal")?.classList.add("active"); }
function closeCrearModal() { document.getElementById("crearModal")?.classList.remove("active"); }

function openCrearAsignada() {
  cargarSelectsParaCrear();
  document.getElementById("modalCrearAsignada")?.classList.add("active");
}
function closeCrearAsignada() { document.getElementById("modalCrearAsignada")?.classList.remove("active"); }

function openEditAsignada(id) {
  editAsignadaId = id;

  getAsignadaFull(id).then(full => {
    if (!full) { alert('No se pudo recuperar la actividad (ver consola)'); return; }
    document.getElementById('editarAsignadaId')?.setAttribute('value', id);
    document.getElementById('editarAsignadaTitulo').value = full.titulo ?? full.nombre ?? '';
    document.getElementById('editarAsignadaDescripcion').value = full.descripcion ?? full.descrip ?? '';
    document.getElementById('editarAsignadaUrl').value = full.urlActividad ?? full.url_actividad ?? '';
    document.getElementById('modalEditarAsignada')?.classList.add('active');
  }).catch(e => { console.error(e); alert('Error recuperando asignada'); });
}
function closeEditAsignada() { document.getElementById("modalEditarAsignada")?.classList.remove("active"); editAsignadaId = null; }

let deleteAsignadaId = null;
function openDeleteAsignada(id) { deleteAsignadaId = id; document.getElementById("modalDeleteAsignada")?.classList.add("active"); }
function closeDeleteAsignada() { deleteAsignadaId = null; document.getElementById("modalDeleteAsignada")?.classList.remove("active"); }

let idAsignadaPendiente = null;
function openConfirmAsignada(id) { idAsignadaPendiente = id; const m = document.getElementById("modalConfirmAsignada"); if (!m) return; document.getElementById("confirmAsignadaText").innerText = "¿Deseas marcar esta actividad como completada?"; m.classList.add("active"); }
function closeConfirmAsignada() { idAsignadaPendiente = null; document.getElementById("modalConfirmAsignada")?.classList.remove("active"); }

window.addEventListener("click", (e) => {
  if (e.target && e.target.classList && e.target.classList.contains("modal")) {
    e.target.classList.remove("active");
  }
});

/* 
   CRUD ASIGNADAS
    */
let editAsignadaId = null;

async function getAsignadaFull(id) {
  const r = await safeFetch(`/api/actividad-asignada/${id}`);
  if (!r.ok) return null;
  return r.json ?? r.body ?? null;
}

async function eliminarAsignada(id) {
  if (!isValidId(Number(id))) return { ok: false, error: 'ID no válido' };

  let res = await safeFetch(`/api/actividad-asignada/eliminar/${id}`, { method: 'DELETE' });
  if (res.ok) return res;
  res = await safeFetch(`/api/actividad-asignada/${id}`, { method: 'DELETE' });
  return res;
}

async function completarAsignada(id) {
  const full = await getAsignadaFull(id);
  if (!full) return { ok: false };
  full.estado = 'Completada';
  full.fechaCompletado = new Date().toISOString();
  const res = await safeFetch(`/api/actividad-asignada/editar/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(full)
  });
  return res;
}

/* 
    ACTIVIDADES OPCIONALES (columna derecha)
    */
async function cargarActividadesDerecha() {
  const cont = document.getElementById('contenedorOpcionales');
  if (!cont) return;
  cont.innerHTML = `<h2>🧘 Actividades de Autoayuda (Opcionales)</h2>`;

  const res = await safeFetch('/api/actividades');
  if (!res.ok) { cont.innerHTML += `<p>Error al cargar actividades</p>`; return; }
  const data = Array.isArray(res.json) ? res.json : [];
  if (!data.length) { cont.innerHTML += `<p style="opacity:.8">No hay actividades opcionales.</p>`; return; }
const list = document.createElement('div'); 
list.className = 'optional-list';

data.forEach(a => {
  const id = a.idActividad ?? a.id;
  const titulo = a.titulo ?? a.nombre ?? 'Actividad';
  const desc = a.descripcion ?? '';
  const url = a.urlActividad ?? a.url_actividad ?? "";

  const card = document.createElement('div');
  card.className = 'activity-card';
  card.dataset.id = id;
  card.innerHTML = `
    <h3>${esc(titulo)}</h3>
    <p>${esc(desc)}</p>
    ${url ? `<p><a href="${esc(url)}" target="_blank">Ver recurso</a></p>` : ""}
    <div class="activity-actions">
      <button class="btn-ver" data-action="ver" data-id="${id}" data-title="${esc(titulo)}" data-desc="${esc(desc)}" data-url="${esc(url)}">Ver</button>
      <button class="btn-edit" data-action="editar" data-id="${id}" data-title="${esc(titulo)}" data-desc="${esc(desc)}" data-url="${esc(url)}">Editar</button>
      <button class="btn-delete" data-action="borrar" data-id="${id}">Borrar</button>
    </div>
  `;
  list.appendChild(card);
});

cont.appendChild(list);

}

async function borrarActividadOpcional(id) {
  if (!confirm('¿Seguro que deseas eliminar esta actividad?')) return;
  const res = await safeFetch(`/api/actividades/${id}`, { method: 'DELETE' });
  if (res.ok) { alert('Actividad eliminada'); await cargarActividadesDerecha(); }
  else alert('Error eliminando actividad (ver consola)');
}


document.addEventListener('DOMContentLoaded', async () => {

  const btnCrear = document.getElementById('abrirModalCrearBtn');
  const btnAsignar = document.getElementById('abrirModalCrearAsignadaBtn');
  if (btnCrear) btnCrear.addEventListener('click', openCrearModal);
  if (btnAsignar) btnAsignar.addEventListener('click', openCrearAsignada);

  
  const contAsign = document.getElementById('contenedorAsignadas');
  if (contAsign) {
    contAsign.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!action) return;
      if (action === 'ver') {
        openAsignadaModal(btn.dataset.title, btn.dataset.desc, btn.dataset.url, btn.closest('.assigned-card')?.querySelector('p strong')?.innerText ?? '');
      } else if (action === 'editar') {
        openEditAsignada(Number(id));
      } else if (action === 'borrar') {
        openDeleteAsignada(Number(id));
      } else if (action === 'completar') {
        openConfirmAsignada(Number(id));
      }
    });
  }


  const contOpc = document.getElementById('contenedorOpcionales');
  if (contOpc) {
    contOpc.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!action) return;
      if (action === 'ver') {
        openModal(btn.dataset.title, btn.dataset.desc);
      } else if (action === 'editar') {
        // abrir modal y precargar
        const t = document.getElementById('editar_titulo');
        const d = document.getElementById('editar_descripcion');
        const hid = document.getElementById('editar_id');
        if (hid) hid.value = id;
        if (t) t.value = btn.dataset.title || '';
        if (d) d.value = btn.dataset.desc || '';
        document.getElementById('modalEditar')?.classList.add('active');
      } else if (action === 'borrar') {
        borrarActividadOpcional(Number(id));
      }
    });
  }

  // FORM: crear asignada
  const formCrearAsignada = document.getElementById('formCrearAsignada');
  if (formCrearAsignada) {
    formCrearAsignada.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selActVal = document.getElementById('crearAsignadaActividad')?.value;
      const selEstVal = document.getElementById('crearAsignadaIdEstudiante')?.value;
      const idEstudiante = parseInt(selEstVal);
      if (!isValidId(idEstudiante)) { alert('Selecciona un estudiante válido.'); return; }

      let titulo = '';
      let descripcion = '';
      if (selActVal && selActVal !== '__custom') {
        const info = actividadesMap.get(Number(selActVal));
        if (info) { titulo = info.titulo; descripcion = info.descripcion; }
      } else {
        titulo = document.getElementById('crearAsignadaTitulo')?.value || '';
        descripcion = document.getElementById('crearAsignadaDescripcion')?.value || '';
      }
      if (!titulo) { alert('La actividad necesita un título.'); return; }
      const rawUrl = document.getElementById('crearAsignadaUrl')?.value || '';
      const url = rawUrl.trim() === '' ? null : rawUrl.trim();

      const payload = {
        idEstudiante: idEstudiante,
        titulo: titulo,
        descripcion: descripcion,
        urlActividad: url,
        fechaAsignacion: new Date().toISOString().split('T')[0],
        estado: 'Pendiente',
        observacion: null
      };

      const res = await safeFetch('/api/actividad-asignada/crear', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Actividad asignada correctamente ✅');
        formCrearAsignada.reset(); closeCrearAsignada(); await cargarAsignadas();
      } else {
        const body = res.body || res.raw || 'Error de servidor';
        alert('Error asignando actividad: ' + (typeof body === 'string' ? body : JSON.stringify(body)));
        console.error('Error backend:', res);
      }
    });
  }

  // FORM: editar asignada (usa campos título, descripción y url)
  const formEditarAsignada = document.getElementById('formEditarAsignada');
  if (formEditarAsignada) {
    formEditarAsignada.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editAsignadaId || document.getElementById('editarAsignadaId')?.value;
      if (!isValidId(Number(id))) { alert('ID no definido'); return; }
      const nuevaUrl = document.getElementById('editarAsignadaUrl')?.value || null;
      const nuevoTitulo = document.getElementById('editarAsignadaTitulo')?.value || '';
      const nuevaDesc = document.getElementById('editarAsignadaDescripcion')?.value || '';

      const full = await getAsignadaFull(id);
      if (!full) { alert('No se pudo obtener la asignada actual (ver consola)'); return; }
      full.urlActividad = nuevaUrl;
      full.titulo = nuevoTitulo;
      full.descripcion = nuevaDesc;

      const res = await safeFetch(`/api/actividad-asignada/editar/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(full)
      });

      if (res.ok) { alert('Actividad asignada actualizada'); closeEditAsignada(); await cargarAsignadas(); }
      else { alert('Error actualizando (ver consola)'); console.error('PUT editar error:', res); }
    });
  }

  // FORM: crear actividad opcional (lado derecho)
  const formCrear = document.getElementById('formCrearRecurso');
  if (formCrear) {
    formCrear.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nuevaActividad = {
        titulo: document.getElementById('nombre_recurso')?.value || '',
        descripcion: document.getElementById('descripcion_recurso')?.value || '',
        urlActividad: document.getElementById('tipo_recurso')?.value || '',
        fechaCreacion: document.getElementById('fecha_creacion_recurso')?.value || ''
      };
      const res = await safeFetch('/api/actividades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevaActividad) });
      if (res.ok) { alert('Actividad creada exitosamente'); formCrear.reset(); closeCrearModal(); await cargarActividadesDerecha(); }
      else { alert('Error al crear actividad (ver consola)'); console.error(res); }
    });
  }

  // FORM: editar actividad opcional
  const formEditarActividad = document.getElementById('formEditarActividad');
  function closeEditModal() { document.getElementById('modalEditar')?.classList.remove('active'); }
  window.closeEditModal = closeEditModal; // export to global because HTML has inline onclick

  if (formEditarActividad) {
    formEditarActividad.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editar_id')?.value;
      const titulo = document.getElementById('editar_titulo')?.value;
      const descripcion = document.getElementById('editar_descripcion')?.value;
      if (!id) { alert('ID actividad no definido'); return; }
      const res = await safeFetch(`/api/actividades/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo, descripcion })
      });
      if (res.ok) { alert('Actividad actualizada'); closeEditModal(); await cargarActividadesDerecha(); }
      else { alert('Error actualizando actividad (ver consola)'); console.error(res); }
    });
  }

  // Conecta botones de confirmación en modales (eliminar asignada, confirmar completada)
  const btnConfirmDeleteAsignada = document.getElementById('btnConfirmDeleteAsignada');
  if (btnConfirmDeleteAsignada) {
    btnConfirmDeleteAsignada.addEventListener('click', async () => {
      if (!deleteAsignadaId) { alert('ID no definido'); return; }
      const res = await eliminarAsignada(deleteAsignadaId);
      if (res.ok) { alert('Asignada eliminada'); closeDeleteAsignada(); await cargarAsignadas(); }
      else { alert('Error eliminando asignada (ver consola)'); console.error(res); }
    });
  }

  const btnConfirmAsignada = document.getElementById('btnConfirmAsignada');
  if (btnConfirmAsignada) {
    btnConfirmAsignada.addEventListener('click', async () => {
      if (!idAsignadaPendiente) { alert('ID no definido'); return; }
      const res = await completarAsignada(idAsignadaPendiente);
      if (res.ok) { alert('Actividad marcada como completada'); closeConfirmAsignada(); await cargarAsignadas(); }
      else { alert('Error marcando como completada (ver consola)'); console.error(res); }
    });
  }

  // Inicialización
  await cargarSelectsParaCrear();
  await cargarAsignadas();
  await cargarActividadesDerecha();
});

window.openModal = openModal;
window.closeModal = closeModal;
window.openCrearModal = openCrearModal;
window.closeCrearModal = closeCrearModal;
window.openCrearAsignada = openCrearAsignada;
window.closeCrearAsignada = closeCrearAsignada;
window.openAsignadaModal = openAsignadaModal;
window.closeAsignadaModal = closeAsignadaModal;
window.openEditAsignada = openEditAsignada; 
window.openDeleteAsignada = openDeleteAsignada;
window.openConfirmAsignada = openConfirmAsignada;
window.cargarAsignadas = cargarAsignadas;
window.cargarActividadesDerecha = cargarActividadesDerecha;

