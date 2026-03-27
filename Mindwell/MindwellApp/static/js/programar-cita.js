console.log('Cargando programar-cita.js');

// Variable global para orientadores (debe ser inyectada desde el backend)
let orientadores = [];

// Inicializar orientadores desde el backend
function initOrientadores(data) {
    orientadores = data;
    console.log('Orientadores disponibles:', orientadores);
}

// Autocompletado de orientadores
function initAutocomplete() {
    const inputOrientador = document.getElementById('orientador_input');
    const sugerenciasList = document.getElementById('sugerencias');
    const idOrientadorInput = document.getElementById('id_orientador');

    if (!inputOrientador || !sugerenciasList) return;

    inputOrientador.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        sugerenciasList.innerHTML = '';
        sugerenciasList.style.display = 'none';

        if (value.length === 0) return;

        const filtrados = orientadores.filter(orientador => 
            orientador.nombreCompleto.toLowerCase().includes(value)
        );

        if (filtrados.length > 0) {
            filtrados.forEach(orientador => {
                const li = document.createElement('li');
                li.textContent = orientador.nombreCompleto;
                li.dataset.id = orientador.id;
                
                li.addEventListener('click', function() {
                    inputOrientador.value = this.textContent;
                    idOrientadorInput.value = this.dataset.id;
                    sugerenciasList.innerHTML = '';
                    sugerenciasList.style.display = 'none';
                    console.log('Seleccionado:', { 
                        nombre: this.textContent, 
                        id: this.dataset.id 
                    });
                });
                
                sugerenciasList.appendChild(li);
            });
            sugerenciasList.style.display = 'block';
        }
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#orientador_input') && 
            !e.target.closest('#sugerencias')) {
            sugerenciasList.style.display = 'none';
        }
    });
}

// Validación del formulario de programar
function initFormValidation() {
    const formProgramar = document.getElementById('form-programar');
    
    if (!formProgramar) return;

    formProgramar.addEventListener('submit', function(e) {
        const idOrientador = document.getElementById('id_orientador').value;
        
        if (!idOrientador || !orientadores.find(o => o.id == idOrientador)) {
            e.preventDefault();
            mostrarAlerta('error', 'Error', 'Por favor, selecciona un orientador válido de las sugerencias.');
        }
    });
}

// Manejo de modales
function abrirModal(id) {
    console.log('Abriendo modal:', id);
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(id);
    
    if (overlay && modal) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
        
        // Limpiar campos si es modal de programar
        if (id === 'modal-programar') {
            const inputOrientador = document.getElementById('orientador_input');
            const idOrientador = document.getElementById('id_orientador');
            const sugerencias = document.getElementById('sugerencias');
            
            if (inputOrientador) inputOrientador.value = '';
            if (idOrientador) idOrientador.value = '';
            if (sugerencias) {
                sugerencias.innerHTML = '';
                sugerencias.style.display = 'none';
            }
        }
    }
}

function cerrarModal() {
    console.log('Cerrando todos los modales');
    const overlay = document.getElementById('modal-overlay');
    const modales = document.querySelectorAll('.modal');
    const sugerencias = document.getElementById('sugerencias');
    
    if (overlay) overlay.style.display = 'none';
    modales.forEach(m => m.style.display = 'none');
    
    if (sugerencias) {
        sugerencias.innerHTML = '';
        sugerencias.style.display = 'none';
    }
}

// Validación de fechas
function validarFecha(input, alerta) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(input.value + 'T00:00:00');
    const currentYear = today.getFullYear();

    console.log('Validando fecha:', { input: input.value, today: today.toISOString() });

    if (selectedDate < today) {
        alerta.textContent = 'No puedes seleccionar una fecha pasada.';
        input.setCustomValidity('Fecha inválida');
    } else if (selectedDate.getFullYear() < currentYear) {
        alerta.textContent = 'La fecha debe ser en el año actual o futuro.';
        input.setCustomValidity('Fecha inválida');
    } else {
        alerta.textContent = '';
        input.setCustomValidity('');
    }
}

function initDateValidation() {
    const fechaInput = document.getElementById('fecha');
    const alertaFecha = document.getElementById('alerta-fecha');
    const reprogramarFechaInput = document.getElementById('reprogramar-fecha');
    const alertaReprogramarFecha = document.getElementById('alerta-reprogramar-fecha');

    if (fechaInput && alertaFecha) {
        fechaInput.addEventListener('change', function() {
            console.log('Cambio en fecha input:', this.value);
            validarFecha(this, alertaFecha);
        });
    }

    if (reprogramarFechaInput && alertaReprogramarFecha) {
        reprogramarFechaInput.addEventListener('change', function() {
            console.log('Cambio en reprogramar-fecha input:', this.value);
            validarFecha(this, alertaReprogramarFecha);
        });
    }
}

// Formulario de reprogramar
function mostrarFormularioReprogramar(citaId) {
    console.log('Mostrando formulario de reprogramar para cita ID:', citaId);
    const li = document.querySelector(`#lista-reprogramar li[data-id='${citaId}']`);
    
    if (!li) {
        console.error('Cita no encontrada:', citaId);
        mostrarAlerta('error', 'Error', 'Cita no encontrada');
        return;
    }

    const fecha = li.dataset.fecha;
    const hora = li.dataset.hora;
    const observaciones = li.dataset.observaciones;

    console.log('Datos de cita para reprogramar:', { citaId, fecha, hora, observaciones });

    document.getElementById('reprogramar-id').value = citaId;
    document.getElementById('reprogramar-fecha').value = fecha;
    document.getElementById('reprogramar-hora').value = hora;
    document.getElementById('reprogramar-observaciones').value = observaciones || '';

    const formReprogramar = document.getElementById('form-reprogramar');
    formReprogramar.action = `/estudiante/programar-cita/actualizar/${citaId}`;

    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('modal-reprogramar-form').style.display = 'block';
}

// Confirmación de acciones
function confirmarAccion(event, mensaje) {
    console.log('Confirmando acción:', mensaje);
    event.preventDefault();
    
    // Usando confirmación nativa o librería de alertas (SweetAlert2, etc.)
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '¿Estás seguro?',
            text: mensaje,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'No, cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                console.log('Acción confirmada, enviando formulario');
                event.target.submit();
            } else {
                console.log('Acción cancelada');
            }
        });
    } else {
        // Fallback a confirm nativo
        if (confirm(mensaje)) {
            event.target.submit();
        }
    }
    
    return false;
}

// Filtro de fechas en histórico
function initFiltroFecha() {
    const filtroFecha = document.getElementById('filtro-fecha');
    
    if (!filtroFecha) return;

    filtroFecha.addEventListener('change', function() {
        console.log('Filtrando citas por fecha:', this.value);
        const filtro = this.value;
        const citas = document.querySelectorAll('#lista-historico-citas li:not(.no-citas)');
        
        citas.forEach(li => {
            const strongElement = li.querySelector('strong');
            if (!strongElement) return;
            
            const fechaTexto = strongElement.nextSibling.textContent.trim();
            
            if (!filtro || fechaTexto === filtro) {
                li.style.display = '';
            } else {
                li.style.display = 'none';
            }
        });
    });
}

// Tema oscuro/claro
function toggleTheme() {
    console.log('Cambiando tema');
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

function loadTheme() {
    console.log('Cargando tema guardado');
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.getElementById('theme-icon');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        if (themeIcon) themeIcon.textContent = '🌙';
    }
}

// Sidebar toggle
function toggleSidebar() {
    console.log('Cambiando estado de la sidebar');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('closed');
    }
}

// Función auxiliar para mostrar alertas
function mostrarAlerta(icon, title, text) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: icon,
            title: title,
            text: text,
            confirmButtonColor: '#4f46e5'
        });
    } else {
        alert(text);
    }
}

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM completamente cargado');
    
    // Cargar tema
    loadTheme();
    
    // Configurar fecha mínima en inputs de fecha
    const today = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('fecha');
    const reprogramarFechaInput = document.getElementById('reprogramar-fecha');
    
    if (fechaInput) {
        fechaInput.setAttribute('min', today);
    }
    if (reprogramarFechaInput) {
        reprogramarFechaInput.setAttribute('min', today);
    }
    
    // Inicializar componentes
    initAutocomplete();
    initFormValidation();
    initDateValidation();
    initFiltroFecha();
});

// Exportar funciones si se usa módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initOrientadores,
        abrirModal,
        cerrarModal,
        mostrarFormularioReprogramar,
        confirmarAccion,
        toggleTheme,
        toggleSidebar
    };
}