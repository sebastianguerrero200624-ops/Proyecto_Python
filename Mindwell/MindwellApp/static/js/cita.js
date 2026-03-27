//  LIBRERÍAS NECESARIAS 
// Añade estos CDN en tu HTML antes de este script:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
// <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
// <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/es.js"></script>
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
// <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

//  MODALES 
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
}
window.addEventListener("click", function (e) {
  const modals = document.querySelectorAll(".modal.active");
  modals.forEach(modal => {
    if (e.target === modal) modal.classList.remove("active");
  });
});

//  INICIALIZAR FLATPICKR 
function initFlatpickr(inputId, isFilter = false) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 60); // 60 días desde hoy
  
  const config = {
    locale: "es",
    dateFormat: "Y-m-d",
    disableMobile: true,
    theme: "dark"
  };
  
  // Solo para formularios de crear/reprogramar (NO para filtros)
  if (!isFilter) {
    config.minDate = today;
    config.maxDate = maxDate;
  }
  
  flatpickr(input, config);
}

let citaActual = null;

//  AUTOCOMPLETADO MEJORADO PARA MOTIVO 
function setupMotivoAutocomplete() {
  const motivoInput = document.getElementById("motivo");
  if (!motivoInput) return;
  
  const palabrasClave = [
    "ansiedad", "estrés", "depresión", "angustia", "tristeza",
    "preocupación", "miedo", "pánico", "inseguridad", "baja autoestima",
    "problemas familiares", "problemas académicos", "dificultades de aprendizaje",
    "bullying", "acoso", "violencia", "conflictos", "relaciones interpersonales",
    "duelo", "pérdida", "trauma", "burnout", "agotamiento",
    "insomnio", "problemas de sueño", "falta de concentración",
    "orientación vocacional", "proyecto de vida", "toma de decisiones",
    "adaptación", "cambios", "transición", "crisis", "emergencia",
    "apoyo emocional", "manejo de emociones", "control de ira",
    "soledad", "aislamiento", "desmotivación", "frustración"
  ];
  
  // Crear datalist si no existe
  let datalist = document.getElementById("motivo-sugerencias");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "motivo-sugerencias";
    motivoInput.setAttribute("list", "motivo-sugerencias");
    motivoInput.parentElement.appendChild(datalist);
  }
  
  // Poblar datalist
  datalist.innerHTML = "";
  palabrasClave.forEach(palabra => {
    const option = document.createElement("option");
    option.value = palabra;
    datalist.appendChild(option);
  });
}

//  CARGA DE DATOS DEL USUARIO 
async function cargarDatosUsuario() {
  try {
    const res = await fetch("http://localhost:8080/api/auth/me", {
      credentials: "include"
    });
    if (!res.ok) throw new Error("No autenticado");
    const user = await res.json();
    
    const rol = user.rol === 2 ? "estudiante" : "orientador";
    localStorage.setItem("rol", rol);
    localStorage.setItem("idUsuario", user.idUsuario);
    localStorage.setItem("nombreCompleto", user.nombreCompleto || "Usuario");
    
    const inputNombre = document.getElementById("nombre-estudiante");
    if (inputNombre) {
      inputNombre.value = user.nombreCompleto;
    }
  } catch (err) {
    console.warn("No se pudo cargar usuario:", err);
  }
}

//  POBLAR ORIENTADORES Y HORAS 
function populateOrientadores() {
  fetch("http://localhost:800/api/citas/orientadores")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("orientador");
      if (select) {
        data.forEach(o => {
          const opt = document.createElement("option");
          opt.value = o.id;
          opt.textContent = o.nombreCompleto;
          select.appendChild(opt);
        });
        
        select.addEventListener("change", function() {
          if (this.value) {
            this.classList.add("selected-valid");
          } else {
            this.classList.remove("selected-valid");
          }
        });
      }
    })
    .catch(err => console.error("Error cargando orientadores:", err));
}

function populateHoras(selectId, fecha = null) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">Hora</option>';
  
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const minutoActual = ahora.getMinutes();
  
  // Verificar si la fecha seleccionada es hoy
  const esHoy = fecha && fecha === ahora.toISOString().split('T')[0];
  
  // Calcular hora mínima (si es hoy, +2 horas desde ahora)
  let horaMinima = 6;
  if (esHoy) {
    horaMinima = Math.max(horaActual + 2, 6);
  }
  
  for (let h = horaMinima; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      // Si es hoy y la hora es igual a horaMinima, validar minutos
      if (esHoy && h === horaMinima && m <= minutoActual) {
        continue;
      }
      
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const opt = document.createElement("option");
      opt.value = time;
      opt.textContent = time;
      select.appendChild(opt);
    }
  }
}



//  VALIDACIÓN DE FECHA Y HORA 
async function validarFechaHora(fecha, hora) {
  const fechaSeleccionada = new Date(fecha + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  // Si es el mismo día
  if (fechaSeleccionada.getTime() === hoy.getTime()) {
    const ahora = new Date();
    const [horaSeleccionada, minutoSeleccionado] = hora.split(':').map(Number);
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();
    
    const minutosSeleccionados = horaSeleccionada * 60 + minutoSeleccionado;
    const minutosActuales = horaActual * 60 + minutoActual;
    
    if (minutosSeleccionados <= minutosActuales) {
      await Swal.fire({
        icon: 'error',
        title: 'Hora no válida',
        text: 'La hora seleccionada ya pasó. Por favor, selecciona una hora futura.',
        confirmButtonColor: '#007bff'
      });
      return false;
    }
    
    // Alerta de confirmación para el mismo día
    const result = await Swal.fire({
      icon: 'warning',
      title: '⚠️ Cita para hoy',
      html: 'Estás solicitando una cita para <strong>hoy</strong>.<br><br>No te podemos garantizar que el orientador esté disponible.<br><br>¿Deseas continuar?',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'No, cambiar fecha',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d'
    });
    
    return result.isConfirmed;
  }
  
  return true;
}

//  CARGAR CITAS 
let currentCitaId = null;
function setCitaId(id) {
  currentCitaId = id;
}

function loadCitas() {
  const rol = localStorage.getItem("rol");
  const idUsuario = localStorage.getItem("idUsuario");
  
  if (!rol || !idUsuario) {
    console.error("Falta rol o idUsuario en localStorage");
    return;
  }
  
  const endpoint = rol === "estudiante"
    ? `/api/citas/estudiante/${idUsuario}`
    : `/api/citas/orientador/${idUsuario}`;
  
  fetch(`http://localhost:8080${endpoint}`, { credentials: "include" })
    .then(res => {
      if (!res.ok) throw new Error("Error en endpoint de citas");
      return res.json();
    })
    .then(citas => {
      const tbody = document.querySelector(".styled-table tbody");
      if (!tbody) return;
      tbody.innerHTML = "";
      
      if (citas.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="${rol === 'orientador' ? '6' : '5'}" class="no-citas-message">No hay citas registradas en este momento</td>`;
        tbody.appendChild(row);
        return;
      }
      
      citas.forEach(cita => {
        const row = document.createElement("tr");
        const estudianteCell = rol === "orientador"
          ? `<td>${cita.nombreEstudiante || "Sin nombre"}</td>`
          : "";
        
        let acciones = `<button class="btn-ver" onclick="verDetalle(${cita.idCita})">Ver</button>`;
        
        if (cita.estado !== "CANCELADA" && cita.estado !== "FINALIZADA") {
          acciones += `<button class="btn-reprogramar" onclick="abrirReprogramar(${cita.idCita})">Reprogramar</button>`;
          
          if (rol === "orientador" && cita.estado === "APROBADA") {
            acciones += `<button class="btn-finalizar" onclick="setCitaId(${cita.idCita}); openModal('modal-finalizar')">Finalizar</button>`;
          }
          
          acciones += `<button class="btn-cancelar" onclick="setCitaId(${cita.idCita}); openModal('${rol === 'estudiante' ? 'modal-cancelar' : 'modal-cancelar-orientador'}')">Cancelar</button>`;
        }
        
        row.innerHTML = `
          ${estudianteCell}
          <td>${cita.fechaCita}</td>
          <td>${cita.horaCita}</td>
          <td>${cita.motivoOriginal}</td>
          <td><span class="estado estado-${cita.estado.toLowerCase()}">${cita.estado}</span></td>
          <td class="acciones">${acciones}</td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(err => {
      console.error("Error cargando citas:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las citas. Intenta nuevamente.',
        confirmButtonColor: '#007bff'
      });
    });
}

//  DETALLE DE CITA 
function verDetalle(idCita) {
  fetch(`http://localhost:8080/api/citas/${idCita}`, { credentials: "include" })
    .then(res => res.json())
    .then(detalle => {
      const content = document.getElementById("detalle-cita-content");
      if (content) {
        content.innerHTML = `
          <div style="text-align: left; padding: 1rem;">
            <p style="margin-bottom: 1rem;"><strong>📅 Fecha:</strong> ${detalle.fechaCita}</p>
            <p style="margin-bottom: 1rem;"><strong>🕐 Hora:</strong> ${detalle.horaCita}</p>
            <p style="margin-bottom: 1rem;"><strong>📝 Motivo:</strong> ${detalle.motivoOriginal}</p>
            <p style="margin-bottom: 1rem;"><strong>📊 Estado:</strong> <span class="estado estado-${detalle.estado.toLowerCase()}">${detalle.estado}</span></p>
            <p style="margin-bottom: 1rem;"><strong>📆 Creada:</strong> ${new Date(detalle.createdAt).toLocaleString()}</p>
          </div>
        `;
        openModal("modal-ver");
      }
    });
}

//  CREAR CITA (ESTUDIANTE) 
async function guardarCita(e) {
  e.preventDefault();
  
  if (localStorage.getItem("rol") !== "estudiante") return;
  
  const idEstudiante = localStorage.getItem("idUsuario");
  const idOrientador = document.getElementById("orientador").value;
  const fecha = document.getElementById("fecha").value;
  const hora = document.getElementById("hora").value;
  const motivo = document.getElementById("motivo").value.trim();
  
  if (!idOrientador || !fecha || !hora || !motivo) {
    await Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor, completa todos los campos obligatorios',
      confirmButtonColor: '#007bff'
    });
    return;
  }
  
  const validacionFechaHora = await validarFechaHora(fecha, hora);
  if (!validacionFechaHora) {
    return;
  }
  
  fetch("http://localhost:8080/api/citas/crear", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idEstudiante, idOrientador, fecha, hora, motivo })
  })
    .then(res => res.ok ? res.json() : Promise.reject("Error al crear"))
    .then(() => {
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'Cita solicitada con éxito',
        confirmButtonColor: '#28a745',
        timer: 2000
      });
      closeModal("modal-crear");
      document.getElementById("formCrearCita").reset();
      document.getElementById("orientador").classList.remove("selected-valid");
      loadCitas();
    })
    .catch(err => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'No se pudo crear la cita',
        text: err.message || 'Esta fecha ya esta ocupada o intentalo nuevamente',
        confirmButtonColor: '#dc3545'
      });
    });
}

// Variable global para guardar la cita actual


/**
 * Abre el modal de reprogramar según el rol
 */
function abrirReprogramar(idCita) {
  setCitaId(idCita);
  const rol = localStorage.getItem("rol");
  
  // Cargar datos de la cita actual
  fetch(`http://localhost:8080/api/citas/${idCita}`, { credentials: "include" })
    .then(res => res.json())
    .then(cita => {
      // Guardar cita completa con información del orientador
      citaActual = {
        idCita: cita.idCita,
        fechaCita: cita.fechaCita,
        horaCita: cita.horaCita,
        idOrientador: cita.idOrientador || cita.orientadorId,
        estado: cita.estado
      };
      
      console.log("Cita actual cargada:", citaActual);
      
      if (rol === "estudiante") {
        // Pre-cargar fecha y hora actuales
        document.getElementById("fecha_reprogramar").value = cita.fechaCita;
        
        // Cargar horas disponibles para esa fecha
        populateHoras("hora_reprogramar", cita.fechaCita);
        
        // Esperar a que se carguen las horas y luego seleccionar la actual
        setTimeout(() => {
          document.getElementById("hora_reprogramar").value = cita.horaCita;
        }, 100);
        
        openModal("modal-reprogramar");
      } else {
        // Orientador: cargar lista de citas y seleccionar la actual
        loadCitasIntoSelectReprogramar("cita-reprogramar-select", idCita);
        populateHoras("hora_reprogramar_o");
        openModal("modal-reprogramar-orientador");
      }
    })
    .catch(err => {
      console.error("Error cargando cita:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la información de la cita',
        confirmButtonColor: '#dc3545'
      });
    });
}

/**
 * Cargar citas en select para orientador (con pre-selección)
 */
function loadCitasIntoSelectReprogramar(selectId, idCitaSeleccionada = null) {
  const idUsuario = localStorage.getItem("idUsuario");
  
  fetch(`http://localhost:8080/api/citas/orientador/${idUsuario}`, { credentials: "include" })
    .then(res => res.json())
    .then(citas => {
      const select = document.getElementById(selectId);
      if (!select) return;
      select.innerHTML = '<option value="">Selecciona una cita</option>';
      
      // Filtrar citas reprogramables
      const citasFiltradas = citas.filter(cita => 
        cita.estado !== "CANCELADA" && cita.estado !== "FINALIZADA"
      );
      
      if (citasFiltradas.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No hay citas disponibles para reprogramar";
        select.appendChild(opt);
        return;
      }
      
      citasFiltradas.forEach(cita => {
        const opt = document.createElement("option");
        opt.value = cita.idCita;
        opt.textContent = `${cita.nombreEstudiante} - ${cita.fechaCita} ${cita.horaCita} (${cita.estado})`;
        
        // Pre-seleccionar si es la cita que se está editando
        if (idCitaSeleccionada && cita.idCita == idCitaSeleccionada) {
          opt.selected = true;
          
          // Cargar fecha y hora actuales
          setTimeout(() => {
            document.getElementById("fecha_reprogramar_o").value = cita.fechaCita;
            populateHoras("hora_reprogramar_o", cita.fechaCita);
            setTimeout(() => {
              document.getElementById("hora_reprogramar_o").value = cita.horaCita;
            }, 100);
          }, 100);
        }
        
        select.appendChild(opt);
      });
      
      // Listener para cuando el orientador cambie de cita
      select.addEventListener("change", function() {
        const citaId = this.value;
        if (citaId) {
          const citaSeleccionada = citasFiltradas.find(c => c.idCita == citaId);
          if (citaSeleccionada) {
            setCitaId(citaId);
            document.getElementById("fecha_reprogramar_o").value = citaSeleccionada.fechaCita;
            populateHoras("hora_reprogramar_o", citaSeleccionada.fechaCita);
            setTimeout(() => {
              document.getElementById("hora_reprogramar_o").value = citaSeleccionada.horaCita;
            }, 100);
          }
        }
      });
    });
}

/**
 * Ejecutar reprogramación (ambos roles)
 */
async function reprogramarCita(e) {
  e.preventDefault();
  
  if (!currentCitaId) {
    await Swal.fire({
      icon: 'warning',
      title: 'Sin selección',
      text: 'No hay cita seleccionada',
      confirmButtonColor: '#007bff'
    });
    return;
  }
  
  const rol = localStorage.getItem("rol");
  const fechaInput = rol === "estudiante" ? "fecha_reprogramar" : "fecha_reprogramar_o";
  const horaInput = rol === "estudiante" ? "hora_reprogramar" : "hora_reprogramar_o";
  
  const fecha = document.getElementById(fechaInput).value;
  const hora = document.getElementById(horaInput).value;
  
  if (!fecha || !hora) {
    await Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Selecciona fecha y hora',
      confirmButtonColor: '#007bff'
    });
    return;
  }
  
  // Validar que no sea la misma fecha y hora
  if (citaActual && fecha === citaActual.fechaCita && hora === citaActual.horaCita) {
    await Swal.fire({
      icon: 'info',
      title: 'Sin cambios',
      text: 'La fecha y hora son las mismas. No hay cambios para guardar.',
      confirmButtonColor: '#007bff'
    });
    return;
  }
  
  // Validación de fecha/hora para estudiantes
  if (rol === "estudiante") {
    const validacionFechaHora = await validarFechaHora(fecha, hora);
    if (!validacionFechaHora) {
      return;
    }
  }
  
  // Verificar disponibilidad antes de enviar
  if (citaActual && citaActual.idOrientador) {
    try {
      const disponible = await verificarDisponibilidadParaReprogramar(
        citaActual.idCita, 
        citaActual.idOrientador,
        fecha, 
        hora
      );
      
      if (!disponible) {
        await Swal.fire({
          icon: 'error',
          title: 'Horario no disponible',
          text: 'El orientador ya tiene una cita en ese horario. Por favor, selecciona otro horario.',
          confirmButtonColor: '#dc3545'
        });
        return;
      }
    } catch (err) {
      console.error("Error verificando disponibilidad:", err);
    }
  }
  
  // Enviar solicitud de reprogramación
  fetch(`http://localhost:8080/api/citas/${currentCitaId}/reprogramar`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fecha, hora })
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => Promise.reject(err));
      }
      return res.json();
    })
    .then(() => {
      Swal.fire({
        icon: 'success',
        title: '¡Reprogramada!',
        text: 'Cita reprogramada exitosamente',
        confirmButtonColor: '#28a745',
        timer: 2000
      });
      
      // Limpiar formulario
      document.getElementById(fechaInput).value = "";
      document.getElementById(horaInput).value = "";
      citaActual = null;
      
      closeModal(rol === "estudiante" ? "modal-reprogramar" : "modal-reprogramar-orientador");
      loadCitas();
    })
    .catch(err => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error || 'No se pudo reprogramar la cita',
        confirmButtonColor: '#dc3545'
      });
    });
}

/**
 * Verificar disponibilidad excluyendo la cita actual
 */
async function verificarDisponibilidadParaReprogramar(idCitaActual, idOrientador, fecha, hora) {
  try {
    // Validar que idOrientador no sea undefined
    if (!idOrientador) {
      console.error("idOrientador es undefined");
      return false;
    }
    
    console.log("Verificando disponibilidad:", { idOrientador, fecha, hora });
    
    const res = await fetch(
      `http://localhost:8080/api/citas/disponibilidad?orientador_id=${idOrientador}&fecha=${fecha}&hora=${hora}`,
      { credentials: "include" }
    );
    
    if (!res.ok) return false;
    
    const disponible = await res.json();
    
    // Si está disponible, ok
    if (disponible) return true;
    
    // Si no está disponible, verificar si es porque está ocupado por la misma cita
    const resDetalle = await fetch(
      `http://localhost:8080/api/citas/${idCitaActual}`,
      { credentials: "include" }
    );
    
    if (!resDetalle.ok) return false;
    
    const citaActualDetalle = await resDetalle.json();
    
    // Si la fecha y hora coinciden con la cita actual, está disponible
    return citaActualDetalle.fechaCita === fecha && citaActualDetalle.horaCita === hora;
    
  } catch (err) {
    console.error("Error verificando disponibilidad:", err);
    return false;
  }
}

/**
 * Para orientador: abrir modal de reprogramar desde el menú principal
 */
function abrirModalReprogramarOrientador() {
  currentCitaId = null;
  citaActual = null;
  loadCitasIntoSelectReprogramar("cita-reprogramar-select");
  document.getElementById("fecha_reprogramar_o").value = "";
  document.getElementById("hora_reprogramar_o").innerHTML = '<option value="">Hora</option>';
  openModal("modal-reprogramar-orientador");
}

//  FINALIZAR CITA (ORIENTADOR) 
function finalizarCita() {
  if (!currentCitaId) {
    Swal.fire({
      icon: 'warning',
      title: 'Sin selección',
      text: 'No hay cita seleccionada',
      confirmButtonColor: '#007bff'
    });
    return;
  }
  
  fetch(`http://localhost:8080/api/citas/${currentCitaId}/finalizar`, {
    method: "PUT",
    credentials: "include"
  })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(() => {
      Swal.fire({
        icon: 'success',
        title: '¡Finalizada!',
        text: 'Cita finalizada exitosamente',
        confirmButtonColor: '#28a745',
        timer: 2000
      });
      closeModal("modal-finalizar");
      loadCitas();
    })
    .catch(() => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo finalizar la cita',
        confirmButtonColor: '#dc3545'
      });
    });
}

//  CANCELAR (AMBOS ROLES) 
function cancelarCita(e) {
  if (e) e.preventDefault();
  
  if (!currentCitaId) {
    Swal.fire({
      icon: 'warning',
      title: 'Sin selección',
      text: 'Selecciona una cita',
      confirmButtonColor: '#007bff'
    });
    return;
  }
  
  const rol = localStorage.getItem("rol");
  const motivo = rol === "orientador" ? document.getElementById("motivo-cancelacion")?.value : "";
  
  fetch(`http://localhost:8080/api/citas/${currentCitaId}/cancelar`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo })
  })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(() => {
      Swal.fire({
        icon: 'success',
        title: '¡Cancelada!',
        text: 'Cita cancelada exitosamente',
        confirmButtonColor: '#28a745',
        timer: 2000
      });
      closeModal(rol === "estudiante" ? "modal-cancelar" : "modal-cancelar-orientador");
      if (rol === "orientador") {
        document.getElementById("motivo-cancelacion").value = "";
      }
      loadCitas();
    })
    .catch(() => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cancelar la cita',
        confirmButtonColor: '#dc3545'
      });
    });
}

function ejecutarCancelar() {
  cancelarCita();
}

//  APROBAR CITAS (ORIENTADOR) 
function aprobarCita(idCita) {
  fetch(`http://localhost:8080/api/citas/${idCita}/aprobar`, {
    method: "PUT",
    credentials: "include"
  })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(() => {
      Swal.fire({
        icon: 'success',
        title: '¡Aprobada!',
        text: 'Cita aprobada exitosamente',
        confirmButtonColor: '#28a745',
        timer: 2000
      });
      loadCitasPendientes();
      loadCitas();
    })
    .catch(() => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo aprobar la cita',
        confirmButtonColor: '#dc3545'
      });
    });
}

function loadCitasPendientes() {
  const idUsuario = localStorage.getItem("idUsuario");
  
  fetch(`http://localhost:8080/api/citas/orientador/${idUsuario}/pendientes`, { credentials: "include" })
    .then(res => res.json())
    .then(citas => {
      const tbody = document.getElementById("tabla-pendientes-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      
      if (citas.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = '<td colspan="5" class="no-citas-message">✅ No hay citas pendientes para aprobar en este momento</td>';
        tbody.appendChild(row);
        return;
      }
      
      citas.forEach(cita => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${cita.nombreEstudiante}</td>
          <td>${cita.fechaCita}</td>
          <td>${cita.horaCita}</td>
          <td>${cita.motivoOriginal}</td>
          <td><button class="btn-aprobar" onclick="aprobarCita(${cita.idCita})">Aprobar</button></td>
        `;
        tbody.appendChild(row);
      });
    });
}

function abrirModalAprobar() {
  loadCitasPendientes();
  openModal("modal-aprobar-orientador");
}

//  REPROGRAMAR/CANCELAR ORIENTADOR CON SELECT 
function loadCitasIntoSelect(selectId, filtroEstado = null) {
  const idUsuario = localStorage.getItem("idUsuario");
  
  fetch(`http://localhost:8080/api/citas/orientador/${idUsuario}`, { credentials: "include" })
    .then(res => res.json())
    .then(citas => {
      const select = document.getElementById(selectId);
      if (!select) return;
      select.innerHTML = '<option value="">Selecciona una cita</option>';
      
      let citasFiltradas = citas;
      
      if (filtroEstado) {
        citasFiltradas = citas.filter(cita => cita.estado === filtroEstado);
      } else {
        citasFiltradas = citas.filter(cita => 
          cita.estado !== "CANCELADA" && cita.estado !== "FINALIZADA"
        );
      }
      
      if (citasFiltradas.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = filtroEstado 
          ? `No hay citas ${filtroEstado.toLowerCase()}s disponibles`
          : "No hay citas disponibles";
        select.appendChild(opt);
        return;
      }
      
      citasFiltradas.forEach(cita => {
        const opt = document.createElement("option");
        opt.value = cita.idCita;
        opt.textContent = `${cita.nombreEstudiante} - ${cita.fechaCita} ${cita.horaCita} (${cita.estado})`;
        select.appendChild(opt);
      });
    });
}

function abrirModalReprogramarOrientador() {
  loadCitasIntoSelect("cita-reprogramar-select", "APROBADA");
  populateHoras("hora_reprogramar_o");
  openModal("modal-reprogramar-orientador");
}

function abrirModalCancelarOrientador() {
  loadCitasIntoSelect("cita-cancelar-select");
  openModal("modal-cancelar-orientador");
}

//  FILTROS 
function aplicarFiltros() {
  const rol = localStorage.getItem("rol");
  const idUsuario = localStorage.getItem("idUsuario");
  
  const filtroEstudiante = document.getElementById("filtro-estudiante")?.value.toLowerCase() || "";
  const filtroFecha = document.getElementById("filtro-fecha")?.value || "";
  const filtroHora = document.getElementById("filtro-hora")?.value || "";
  const filtroEstado = document.getElementById("filtro-estado")?.value || "";
  
  const endpoint = rol === "estudiante"
    ? `/api/citas/estudiante/${idUsuario}`
    : `/api/citas/orientador/${idUsuario}`;
  
  fetch(`http://localhost:8080${endpoint}`, { credentials: "include" })
    .then(res => res.json())
    .then(citas => {
      let citasFiltradas = citas;
      
      if (filtroEstudiante && rol === "orientador") {
        citasFiltradas = citasFiltradas.filter(cita => 
          (cita.nombreEstudiante || "").toLowerCase().includes(filtroEstudiante)
        );
      }
      
      if (filtroFecha) {
        citasFiltradas = citasFiltradas.filter(cita => cita.fechaCita === filtroFecha);
      }
      
      if (filtroHora) {
        citasFiltradas = citasFiltradas.filter(cita => cita.horaCita === filtroHora);
      }
      
      if (filtroEstado) {
        citasFiltradas = citasFiltradas.filter(cita => cita.estado === filtroEstado);
      }
      
      const tbody = document.querySelector(".styled-table tbody");
      if (!tbody) return;
      tbody.innerHTML = "";
      
      if (citasFiltradas.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="${rol === 'orientador' ? '6' : '5'}" class="no-citas-message">No se encontraron citas con los filtros aplicados</td>`;
        tbody.appendChild(row);
        return;
      }
      
      citasFiltradas.forEach(cita => {
        const row = document.createElement("tr");
        const estudianteCell = rol === "orientador"
          ? `<td>${cita.nombreEstudiante || "Sin nombre"}</td>`
          : "";
        
        let acciones = `<button class="btn-ver" onclick="verDetalle(${cita.idCita})">Ver</button>`;
        
        if (cita.estado !== "CANCELADA" && cita.estado !== "FINALIZADA") {
          acciones += `<button class="btn-reprogramar" onclick="abrirReprogramar(${cita.idCita})">Reprogramar</button>`;
          
          if (rol === "orientador" && cita.estado === "APROBADA") {
            acciones += `<button class="btn-finalizar" onclick="setCitaId(${cita.idCita}); openModal('modal-finalizar')">Finalizar</button>`;
          }
          
          acciones += `<button class="btn-cancelar" onclick="setCitaId(${cita.idCita}); openModal('${rol === 'estudiante' ? 'modal-cancelar' : 'modal-cancelar-orientador'}')">Cancelar</button>`;
        }
        
        row.innerHTML = `
          ${estudianteCell}
          <td>${cita.fechaCita}</td>
          <td>${cita.horaCita}</td>
          <td>${cita.motivoOriginal}</td>
          <td><span class="estado estado-${cita.estado.toLowerCase()}">${cita.estado}</span></td>
          <td class="acciones">${acciones}</td>
        `;
        tbody.appendChild(row);
      });
    });
}

function limpiarFiltros() {
  document.querySelectorAll('.filters-container input, .filters-container select').forEach(el => el.value = '');
  loadCitas();
}

//  SIDEBAR TOGGLE 
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.classList.toggle("closed");
  }
}

//  LISTENERS PARA ACTUALIZAR HORAS AL CAMBIAR FECHA 
function setupFechaChangeListeners() {
  // Para crear cita (estudiante)
  const fechaCrear = document.getElementById("fecha");
  const horaCrear = document.getElementById("hora");
  if (fechaCrear && horaCrear) {
    fechaCrear.addEventListener("change", function() {
      populateHoras("hora", this.value);
    });
  }
  
  // Para reprogramar estudiante
  const fechaReprogramar = document.getElementById("fecha_reprogramar");
  const horaReprogramar = document.getElementById("hora_reprogramar");
  if (fechaReprogramar && horaReprogramar) {
    fechaReprogramar.addEventListener("change", function() {
      populateHoras("hora_reprogramar", this.value);
    });
  }
  
  // Para reprogramar orientador
  const fechaReprogramarO = document.getElementById("fecha_reprogramar_o");
  const horaReprogramarO = document.getElementById("hora_reprogramar_o");
  if (fechaReprogramarO && horaReprogramarO) {
    fechaReprogramarO.addEventListener("change", function() {
      populateHoras("hora_reprogramar_o", this.value);
    });
  }
}

//  ON LOAD 
document.addEventListener("DOMContentLoaded", () => {
  cargarDatosUsuario();
  populateOrientadores();
  
  // Inicializar Flatpickr para todos los campos de fecha
  initFlatpickr("fecha", false); // Crear cita - con restricciones
  initFlatpickr("fecha_reprogramar", false); // Reprogramar estudiante - con restricciones
  initFlatpickr("fecha_reprogramar_o", false); // Reprogramar orientador - con restricciones
  initFlatpickr("filtro-fecha", true); // Filtro - sin restricciones
  
  // Inicializar autocompletado de motivo
  setupMotivoAutocomplete();
  
  // Poblar horas inicialmente
  populateHoras("hora");
  populateHoras("hora_reprogramar");
  populateHoras("hora_reprogramar_o");
  populateHoras("filtro-hora"); // Para filtros
  
  // Configurar listeners para actualizar horas según fecha
  setupFechaChangeListeners();
  
  // Cargar citas
  loadCitas();
  
  // Listeners para selects de orientador (cancelar/reprogramar)
  const citaReprogramarSelect = document.getElementById("cita-reprogramar-select");
  const citaCancelarSelect = document.getElementById("cita-cancelar-select");
  
  if (citaReprogramarSelect) {
    citaReprogramarSelect.addEventListener("change", e => setCitaId(e.target.value));
  }
  
  if (citaCancelarSelect) {
    citaCancelarSelect.addEventListener("change", e => setCitaId(e.target.value));
  }
  
  // Forms
  const formCrear = document.getElementById("formCrearCita");
  const formReprogramar = document.getElementById("formReprogramarCita");
  const formReprogramarO = document.getElementById("formReprogramarOrientador");
  const formCancelarO = document.getElementById("formCancelarOrientador");
  
  if (formCrear) formCrear.addEventListener("submit", guardarCita);
  if (formReprogramar) formReprogramar.addEventListener("submit", reprogramarCita);
  if (formReprogramarO) formReprogramarO.addEventListener("submit", reprogramarCita);
  if (formCancelarO) formCancelarO.addEventListener("submit", cancelarCita);
});