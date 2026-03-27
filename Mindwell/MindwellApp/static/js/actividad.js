/*  utilidades   */
const esc = s => s == null ? "" : String(s)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts), raw = await res.text();
    if (!res.ok) {
      try { return { ok:false, status:res.status, body: JSON.parse(raw) }; }
      catch { return { ok:false, status:res.status, body: raw }; }
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return { ok:true, json: JSON.parse(raw) };
    return { ok:true, text: raw };
  } catch (error) {
    console.error("Fetch error:", error);
    return { ok:false, error };
  }
}

/*  estado local (aprendiz)  */
let asignadasCache = [];  
let opcionalesCache = []; 
let idPendienteCompletar = null;

/*  renderizar tarjetas  */
function renderAsignadas(list) {
  const cont = document.getElementById("contenedorAsignadas");
  if (!cont) return;
  cont.innerHTML = `<h2>📘 Tus Actividades Asignadas</h2>`;
  if (!list.length) { cont.innerHTML += `<p style="opacity:.8">No tienes actividades asignadas.</p>`; return; }

  const wrap = document.createElement("div"); wrap.className = "assigned-list";
  list.forEach(a => {
    const id = a.idAsignada ?? a.id;
    const titulo = esc(a.titulo ?? "Sin título");
    const desc = esc(a.descripcion ?? "");
    const estado = a.estado ?? "Pendiente";
    const url = esc(a.urlActividad ?? "");
    const card = document.createElement("div");
    card.className = `assigned-card ${estado === "Completada" ? "completada" : ""}`;
    card.innerHTML = `
      <h3>${titulo}</h3>
      <p>${desc}</p>
      <p><b>Estado:</b> ${esc(estado)}</p>
      <div class="assigned-actions">
        <button data-action="ver" data-id="${id}" data-title="${titulo}" data-desc="${desc}" data-url="${url}">Ver</button>
        ${estado !== "Completada" ? `<button data-action="completar" data-id="${id}">Marcar como completada</button>` : 
        `<span class="done-label">✔ COMPLETADA</span>`}
      </div>`;
    wrap.appendChild(card);
  });
  cont.appendChild(wrap);
}
function renderOpcionales(list) {
  const cont = document.getElementById("contenedorOpcionales");
  if (!cont) return;
  cont.innerHTML = `<h2>🧘 Actividades de Autoayuda (Opcionales)</h2>`;

  if (!list.length) {
    cont.innerHTML += `<p style="opacity:.8">No hay actividades opcionales.</p>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "optional-list";

  list.forEach(a => {
    const id = a.idActividad ?? a.id;
    const titulo = esc(a.titulo);
    const desc = esc(a.descripcion);
    const url = esc(a.urlActividad ?? a.url ?? "");

    const card = document.createElement("div");
    card.className = "activity-card";

    card.innerHTML = `

      <h3>${titulo}</h3>
      <p>${desc}</p>
      Recurso="${url}"
      <div class="activity-actions">
        <button 
          data-action="ver" 
          data-id="${id}" 
          data-title="${titulo}" 
          data-desc="${desc}" 
          data-url="${url}"
        >Ver</button>
      </div>`;
    wrap.appendChild(card);
  });

  cont.appendChild(wrap);
}



/*  carga desde API */
async function cargarAsignadas() {
  const cont = document.getElementById("contenedorAsignadas");
  if (!cont) return;

  const idEst = Number(localStorage.getItem("id_estudiante"));
  if (!idEst) { cont.innerHTML = 
    `<h2>📘 Tus Actividades Asignadas</h2><p style="color:red">⚠ No hay ID de sesión. Inicia sesión primero.</p>`; return; }

  const res = await safeFetch("/api/actividad-asignada/listar");
  if (!res.ok) { cont.innerHTML = `<h2>📘 Tus Actividades Asignadas</h2><p>Error cargando actividades.</p>`; return; }
  const data = Array.isArray(res.json) ? res.json : [];
  asignadasCache = data.filter(a => Number(a.idEstudiante ?? a.id_estudiante ?? a.idEst) === idEst);
  renderAsignadas(asignadasCache);
}

async function cargarActividadesDerecha() {
  const cont = document.getElementById("contenedorOpcionales");
  if (!cont) return;
  const res = await safeFetch("/api/actividades");
  if (!res.ok) { cont.innerHTML = `<h2>🧘 Actividades de Autoayuda (Opcionales)</h2><p>Error al cargar actividades</p>`; return; }
  opcionalesCache = Array.isArray(res.json) ? res.json : [];
  const link = document.getElementById("");
  renderOpcionales(opcionalesCache);
}

/*  ver modal asignada/opcional  */
function openAsignadaModal(t = "", d = "", url = "", estado = "") {
  const m = document.getElementById("modalAsignadaInfo"); if (!m) return;
  document.getElementById("asignadaTitle").innerText = t || "";
  document.getElementById("asignadaDesc").innerText = d || "";
  const link = document.getElementById("asignadaUrl");
  if (link) {
    if (url && url.trim()) { link.style.display = "inline"; link.href = url; }
    else { link.style.display = "none"; link.removeAttribute("href"); }
  }
  m.classList.add("active");
}
function closeAsignadaModal() { document.getElementById("modalAsignadaInfo")?.classList.remove("active"); }

/*  confirmar completada  */
function openConfirmAsignada(id) {
  idPendienteCompletar = id;
  const m = document.getElementById("modalConfirmAsignada"); if (!m) return;
  document.getElementById("confirmAsignadaText").innerText = "¿Deseas marcar esta actividad como completada?";
  m.classList.add("active");
}
function closeConfirmAsignada() { idPendienteCompletar = null; document.getElementById("modalConfirmAsignada")?.classList.remove("active"); }

/*  obtener actividad completa y marcar completada  */
async function getAsignadaFull(id) {
  const r = await safeFetch(`/api/actividad-asignada/${id}`);
  if (!r.ok) return null;
  return r.json ?? r.body ?? null;
}

async function completarAsignada() {
  if (!idPendienteCompletar) { alert("ID no definido"); return; }
  const id = idPendienteCompletar;
  const full = await getAsignadaFull(id);
  if (!full) { alert("No se pudo recuperar la actividad (ver consola)"); return; }
  full.estado = "Completada";
  full.fechaCompletado = new Date().toISOString();
  const res = await safeFetch(`/api/actividad-asignada/editar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(full)
  });
  if (res.ok) {
    alert("Actividad marcada como completada");
    closeConfirmAsignada();
    await cargarAsignadas();
  } else {
    console.error(res);
    alert("Error marcando como completada (ver consola)");
  }
}

/*  delegación de clicks (ver / completar)  */
document.addEventListener("DOMContentLoaded", () => {
document.getElementById("filtroTexto")?.addEventListener("input", () => {
  filtrarAsignadas();
  filtrarOpcionales();
});

document.getElementById("filtroEstado")?.addEventListener("change", () => {
  filtrarAsignadas();
});

  // delegación para ambas columnas
  ["contenedorAsignadas","contenedorOpcionales"].forEach(id => {
    const cont = document.getElementById(id);
    if (!cont) return;
    cont.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const idAct = btn.dataset.id;
      if (action === "ver") {
        // si es asignada, podemos mostrar estado (buscamos en cache)
        const a = (asignadasCache.find(x => String(x.idAsignada ?? x.id) === String(idAct)) || {});
        openAsignadaModal(btn.dataset.title || a.titulo, btn.dataset.desc || a.descripcion, btn.dataset.url 
          || a.urlActividad || "", a.estado || "");
      } else if (action === "completar") {
        openConfirmAsignada(idAct);
      }
    });
  });

  // botón confirmar completada en modal
  document.getElementById("btnConfirmAsignada")?.addEventListener("click", completarAsignada);

  // cerrar modal al click fuera
  window.addEventListener("click", e => {
    if (e.target && e.target.classList && e.target.classList.contains("modal")) e.target.classList.remove("active");
  });
  
//filtrar opcionales

  function filtrarOpcionales() {
  let texto = document.getElementById("filtroTexto")?.value.toLowerCase() || "";

  let filtradas = opcionalesCache.filter(a => {
    let coincideTexto =
      a.titulo?.toLowerCase().includes(texto) ||
      a.descripcion?.toLowerCase().includes(texto);
    return coincideTexto;
  });

  renderOpcionales(filtradas);
}

  //filtros de asignadas
function filtrarAsignadas() {
  let texto = document.getElementById("filtroTexto")?.value.toLowerCase() || "";
  let estado = document.getElementById("filtroEstado")?.value || "";

  let filtradas = asignadasCache.filter(a => {
    let coincideTexto =
      a.titulo?.toLowerCase().includes(texto) ||
      a.descripcion?.toLowerCase().includes(texto);

    let coincideEstado = !estado || (a.estado === estado);

    return coincideTexto && coincideEstado;
  });

  renderAsignadas(filtradas);
}

  // inicializar listas
  cargarAsignadas();
  cargarActividadesDerecha();
});

/* Exponer solo lo necesario para el HTML */
window.openAsignadaModal = openAsignadaModal;
window.closeAsignadaModal = closeAsignadaModal;
window.openConfirmAsignada = openConfirmAsignada;
window.closeConfirmAsignada = closeConfirmAsignada;
window.cargarAsignadas = cargarAsignadas;
window.cargarActividadesDerecha = cargarActividadesDerecha;
