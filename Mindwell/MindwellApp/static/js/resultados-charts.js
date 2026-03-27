// Configuración global de Chart.js
Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 15;

// Paleta de colores moderna
const COLORS = {
    primary: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
    success: ['#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
    warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'],
    danger: ['#ef4444', '#f87171', '#fca5a5', '#fee2e2'],
    purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe'],
    gradient: {
        blue: 'rgba(59, 130, 246, 0.8)',
        green: 'rgba(16, 185, 129, 0.8)',
        yellow: 'rgba(245, 158, 11, 0.8)',
        red: 'rgba(239, 68, 68, 0.8)',
        purple: 'rgba(139, 92, 246, 0.8)'
    }
};

// Configuración de animaciones suaves
const ANIMATION_CONFIG = {
    duration: 1200,
    easing: 'easeInOutQuart',
    delay: (context) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
            delay = context.dataIndex * 50 + context.datasetIndex * 100;
        }
        return delay;
    }
};

// Configuración de interacciones
const INTERACTION_CONFIG = {
    mode: 'index',
    intersect: false,
    axis: 'x'
};

// Configuración de tooltips mejorada
const TOOLTIP_CONFIG = {
    enabled: true,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    titleColor: '#fff',
    bodyColor: '#e5e7eb',
    borderColor: '#4b5563',
    borderWidth: 1,
    padding: 12,
    displayColors: true,
    boxWidth: 10,
    boxHeight: 10,
    boxPadding: 6,
    usePointStyle: true,
    titleFont: {
        size: 14,
        weight: 'bold'
    },
    bodyFont: {
        size: 13
    },
    callbacks: {
        label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
                label += ': ';
            }
            label += context.parsed.y !== undefined ? context.parsed.y : context.parsed;
            return label;
        }
    }
};

// 
// CLASE PRINCIPAL DEL SISTEMA DE GRÁFICAS
// 
class ChartManager {
    constructor() {
        this.charts = {};
        this.rol = null; // 'orientador' o 'aprendiz'
        this.idUsuario = null;
        this.idOrientador = null;
    }

    // Inicializar el sistema
    async init() {
        try {
            await this.detectarRol();
            await this.cargarDatos();
            this.setupModalCrearResultado();
            this.setupFiltros();
        } catch (error) {
            console.error('Error al inicializar:', error);
            this.mostrarError('Error al cargar las estadísticas');
        }
    }

    // Detectar el rol del usuario actual
    async detectarRol() {
        const path = window.location.pathname;
        if (path.includes('/orientador/')) {
            this.rol = 'orientador';
        } else if (path.includes('/estudiante/') || path.includes('/aprendiz/')) {
            this.rol = 'aprendiz';
        }
    }

    // Cargar todos los datos desde el backend
    async cargarDatos() {
        const endpoint = this.rol === 'orientador' 
            ? '/orientador/resultados/datos'
            : '/estudiante/resultados/datos';  

        console.log('🔍 Cargando datos desde:', endpoint);

        const response = await fetch(endpoint);
        if (!response.ok) {
            console.error('❌ Error HTTP:', response.status);
            throw new Error('Error al cargar datos');
        }
        
        const datos = await response.json();
        console.log('✅ Datos recibidos:', datos);
        this.renderizarGraficas(datos);
    }

    // Renderizar todas las gráficas
    renderizarGraficas(datos) {
        console.log('🎨 Renderizando gráficas con datos:', datos);

        // 1. Gráfica de Citas por Mes (Barras)
        if (datos.citasPorMes) {
            this.crearGraficaCitasMes(datos.citasPorMes);
        }

        // 2. Gráfica de Motivos Clasificados (Pie)
        if (datos.motivosClasificados) {
            this.crearGraficaMotivos(datos.motivosClasificados);
        }

        // 3. Gráfica de Nivel de Estrés (Donut)
        if (datos.nivelesEstres) {
            this.crearGraficaNivelEstres(datos.nivelesEstres);
        }

        // 4. Gráfica de Horarios Frecuentes (Barras horizontales)
        if (datos.citasPorHora) {
            this.crearGraficaHorarios(datos.citasPorHora);
        }

        // 5. Gráfica de Días de la Semana (Barras)
        if (datos.citasPorDia) {
            this.crearGraficaDiasSemana(datos.citasPorDia);
        }

        // Mostrar estadísticas rápidas
        if (datos.estadisticas) {
            this.mostrarEstadisticasRapidas(datos.estadisticas);
        }

        // 6. Mostrar tabla de evaluaciones recientes
        if (datos.evaluacionesRecientes) {
            this.mostrarTablaEvaluaciones(datos.evaluacionesRecientes);
        }
    }


    // GRÁFICA 1: CITAS POR MES (Barras con gradiente)
 
    crearGraficaCitasMes(datos) {
        const ctx = document.getElementById('chartCitasMes');
        if (!ctx) return;

        // Destruir gráfica anterior si existe
        if (this.charts.citasMes) {
            this.charts.citasMes.destroy();
        }

        // Crear gradiente
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, COLORS.gradient.blue);
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');

        this.charts.citasMes = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: datos.meses,
                datasets: [{
                    label: 'Citas Agendadas',
                    data: datos.cantidades,
                    backgroundColor: gradient,
                    borderColor: COLORS.primary[0],
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: COLORS.primary[0],
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: ANIMATION_CONFIG,
                interaction: INTERACTION_CONFIG,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: TOOLTIP_CONFIG,
                    title: {
                        display: true,
                        text: '📅 Citas por Mes (Últimos 12 meses)',
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 10, bottom: 20 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }


    // GRÁFICA 2: MOTIVOS CLASIFICADOS
  
    crearGraficaMotivos(datos) {
        const ctx = document.getElementById('chartMotivos');
        if (!ctx) return;

        if (this.charts.motivos) {
            this.charts.motivos.destroy();
        }

        this.charts.motivos = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Ansiedad', 'Estrés', 'Otro'],
                datasets: [{
                    data: [datos.ansiedad, datos.estres, datos.otro],
                    backgroundColor: [
                        COLORS.gradient.yellow,
                        COLORS.gradient.red,
                        COLORS.gradient.purple
                    ],
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverOffset: 15,
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    ...ANIMATION_CONFIG,
                    animateRotate: true,
                    animateScale: true
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: { size: 13 }
                        }
                    },
                    tooltip: {
                        ...TOOLTIP_CONFIG,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: '🎯 Motivos Clasificados',
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 10, bottom: 20 }
                    }
                }
            }
        });
    }

   
    // GRÁFICA 3: NIVEL DE ESTRÉS Y ANSIEDAD (Donut)
    
    crearGraficaNivelEstres(datos) {
        const ctx = document.getElementById('chartNivelEstres');
        if (!ctx) return;

        if (this.charts.nivelEstres) {
            this.charts.nivelEstres.destroy();
        }

        this.charts.nivelEstres = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Bajo (0-33)', 'Medio (34-66)', 'Alto (67-99)'],
                datasets: [{
                    data: [datos.bajo, datos.medio, datos.alto],
                    backgroundColor: [
                        COLORS.gradient.green,
                        COLORS.gradient.yellow,
                        COLORS.gradient.red
                    ],
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverOffset: 15,
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    ...ANIMATION_CONFIG,
                    animateRotate: true,
                    animateScale: true
                },
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: { size: 13 }
                        }
                    },
                    tooltip: {
                        ...TOOLTIP_CONFIG,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} evaluaciones (${percentage}%)`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: '📊 Nivel de Estrés y Ansiedad',
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 10, bottom: 20 }
                    }
                }
            }
        });
    }

 
    // GRÁFICA 4: HORARIOS MÁS FRECUENTES (Barras horizontales)
   
    crearGraficaHorarios(datos) {
        const ctx = document.getElementById('chartHorarios');
        if (!ctx) return;

        if (this.charts.horarios) {
            this.charts.horarios.destroy();
        }

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 400, 0);
        gradient.addColorStop(0, COLORS.gradient.purple);
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');

        this.charts.horarios = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: datos.horas,
                datasets: [{
                    label: 'Cantidad de citas',
                    data: datos.cantidades,
                    backgroundColor: gradient,
                    borderColor: COLORS.purple[0],
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: COLORS.purple[0],
                    hoverBorderWidth: 3
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: ANIMATION_CONFIG,
                interaction: INTERACTION_CONFIG,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: TOOLTIP_CONFIG,
                    title: {
                        display: true,
                        text: '⏰ Horarios Más Frecuentes',
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 10, bottom: 20 }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        ticks: {
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }


    // GRÁFICA 5: DÍAS DE LA SEMANA 
 
    crearGraficaDiasSemana(datos) {
        const ctx = document.getElementById('chartDiasSemana');
        if (!ctx) return;

        if (this.charts.diasSemana) {
            this.charts.diasSemana.destroy();
        }

        // Colores diferentes para cada día
        const coloresDias = [
            COLORS.gradient.blue,
            COLORS.gradient.green,
            COLORS.gradient.yellow,
            COLORS.gradient.purple,
            COLORS.gradient.red,
            'rgba(236, 72, 153, 0.8)',
            'rgba(14, 165, 233, 0.8)'
        ];

        this.charts.diasSemana = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
                datasets: [{
                    label: 'Citas por día',
                    data: datos.cantidades,
                    backgroundColor: coloresDias,
                    borderWidth: 2,
                    borderColor: coloresDias.map(c => c.replace('0.8', '1')),
                    borderRadius: 8,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: ANIMATION_CONFIG,
                interaction: INTERACTION_CONFIG,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: TOOLTIP_CONFIG,
                    title: {
                        display: true,
                        text: '📆 Citas por Día de la Semana',
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 10, bottom: 20 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

   
    // ESTADÍSTICAS RÁPIDAS
  
    mostrarEstadisticasRapidas(stats) {
        const container = document.getElementById('estadisticas-rapidas');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card-mini">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <div class="stat-value">${stats.totalCitas || 0}</div>
                    <div class="stat-label">Total Citas</div>
                </div>
            </div>
            <div class="stat-card-mini">
                <div class="stat-icon">📝</div>
                <div class="stat-info">
                    <div class="stat-value">${stats.totalEvaluaciones || 0}</div>
                    <div class="stat-label">Evaluaciones</div>
                </div>
            </div>
            <div class="stat-card-mini">
                <div class="stat-icon">⭐</div>
                <div class="stat-info">
                    <div class="stat-value">${stats.promedioEstres || 'N/A'}</div>
                    <div class="stat-label">Promedio Estrés</div>
                </div>
            </div>
            <div class="stat-card-mini">
                <div class="stat-icon">📈</div>
                <div class="stat-info">
                    <div class="stat-value">${stats.citasEsteMes || 0}</div>
                    <div class="stat-label">Este Mes</div>
                </div>
            </div>
        `;
    }

    

// TABLA DE EVALUACIONES RECIENTES (CORREGIDO)

mostrarTablaEvaluaciones(evaluaciones) {
    const tbody = document.querySelector('#tabla-evaluaciones tbody');
    if (!tbody) {
        console.warn('⚠️ No se encontró el tbody de la tabla de evaluaciones');
        return;
    }
    
    // 🔍 DEBUG: Ver estructura exacta de los datos
    console.log('📋 Mostrando evaluaciones:', evaluaciones);
    if (evaluaciones && evaluaciones.length > 0) {
        console.log('🔍 Primera evaluación (estructura):', evaluaciones[0]);
        console.log('🔍 Propiedades disponibles:', Object.keys(evaluaciones[0]));
    }
    
    if (!evaluaciones || evaluaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
                    📭 No hay evaluaciones registradas todavía
                </td>
            </tr>
        `;
        return;
    }
    
    // ✅ CAMBIO: 'eval' → 'evaluacion'
    tbody.innerHTML = evaluaciones.map(evaluacion => {
        // 🔧 Mapeo flexible de propiedades (ajustar según backend)
        const fecha = evaluacion.fecha || evaluacion.fechaEvaluacion || evaluacion.fecha_evaluacion;
        const estudiante = evaluacion.estudiante || evaluacion.nombreEstudiante || evaluacion.nombre_estudiante || evaluacion.aprendiz;
        const puntuacion = evaluacion.puntuacion || evaluacion.puntaje || evaluacion.score || 0;
        const nivel = evaluacion.nivel || evaluacion.nivelEstres || evaluacion.nivel_estres || 'BAJO';
        const observaciones = evaluacion.observaciones || evaluacion.observacion || evaluacion.comentarios || 'Sin observaciones';
        const fechaCita = evaluacion.fechaCita || evaluacion.fecha_cita;
        
        // Determinar la clase del badge según el nivel
        let badgeClass = 'nivel-bajo';
        const nivelUpper = nivel.toString().toUpperCase();
        if (nivelUpper === 'MEDIO' || nivelUpper === 'MODERADO') badgeClass = 'nivel-medio';
        if (nivelUpper === 'ALTO' || nivelUpper === 'SEVERO') badgeClass = 'nivel-alto';
        
        // Formatear observaciones (limitar longitud)
        let obsFormateadas = observaciones;
        if (obsFormateadas.length > 100) {
            obsFormateadas = obsFormateadas.substring(0, 100) + '...';
        }
        
        // Construir la fila según el rol
        if (this.rol === 'orientador') {
            return `
                <tr>
                    <td>${this.formatearFecha(fecha)}</td>
                    <td>${estudiante || 'N/A'}</td>
                    <td><strong>${puntuacion}</strong></td>
                    <td><span class="nivel-badge ${badgeClass}">${nivel}</span></td>
                    <td style="max-width: 300px;">${obsFormateadas}</td>
                </tr>
            `;
        } else {
            // Para aprendiz
            return `
                <tr>
                    <td>${this.formatearFecha(fecha)}</td>
                    <td>${this.formatearFecha(fechaCita)}</td>
                    <td><strong>${puntuacion}</strong></td>
                    <td><span class="nivel-badge ${badgeClass}">${nivel}</span></td>
                    <td style="max-width: 300px;">${obsFormateadas}</td>
                </tr>
            `;
        }
    }).join('');
}

    // Formatear fecha en formato más legible
    formatearFecha(fechaString) {
        if (!fechaString) return 'N/A';
        
        const fecha = new Date(fechaString + 'T00:00:00');
        const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
        return fecha.toLocaleDateString('es-ES', opciones);
    }


    // MODAL PARA CREAR RESULTADO (Solo Orientador)

    setupModalCrearResultado() {
        if (this.rol !== 'orientador') return;

        const btnAbrir = document.getElementById('btn-crear-resultado');
        const modal = document.getElementById('modal-crear-resultado');
        const btnCerrar = document.getElementById('btn-cerrar-modal');
        const form = document.getElementById('form-crear-resultado');

        if (!btnAbrir || !modal) return;

        btnAbrir.addEventListener('click', () => {
            this.abrirModalCrearResultado();
        });

        btnCerrar?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarEvaluacion();
        });
    }

    async abrirModalCrearResultado() {
        const modal = document.getElementById('modal-crear-resultado');
        const selectCita = document.getElementById('select-cita');

        // Cargar citas disponibles (solo las que no tienen evaluación)
        try {
            const response = await fetch('/orientador/citas-sin-evaluar');
            const citas = await response.json();

            selectCita.innerHTML = '<option value="">Seleccione una cita...</option>';
            citas.forEach(cita => {
                const option = document.createElement('option');
                option.value = cita.idCita;
                option.textContent = `${cita.aprendizNombre} - ${cita.fechaCita} ${cita.horaCita}`;
                selectCita.appendChild(option);
            });

            modal.style.display = 'flex';
        } catch (error) {
            console.error('Error al cargar citas:', error);
            this.mostrarError('Error al cargar las citas disponibles');
        }
    }

    async guardarEvaluacion() {
        const idCita = document.getElementById('select-cita').value;
        const puntuacion = document.getElementById('input-puntuacion').value;
        const observaciones = document.getElementById('input-observaciones').value;

        if (!idCita || !puntuacion) {
            this.mostrarError('Complete todos los campos obligatorios');
            return;
        }

        try {
            const response = await fetch('/orientador/evaluacion/guardar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    idCita,
                    puntuacion,
                    observaciones
                })
            });

            if (response.ok) {
                this.mostrarExito('Evaluación guardada correctamente');
                document.getElementById('modal-crear-resultado').style.display = 'none';
                document.getElementById('form-crear-resultado').reset();
                // Recargar datos
                await this.cargarDatos();
            } else {
                const error = await response.text();
                this.mostrarError(error || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error al guardar la evaluación');
        }
    }

  
    // FILTROS (PARA ORIENTADOR)
     
    setupFiltros() {
        if (this.rol !== 'orientador') return;

        const filtroEstudiante = document.getElementById('filtro-estudiante');
        if (filtroEstudiante) {
            // Cargar lista de estudiantes
            this.cargarEstudiantes();

            // Evento change
            filtroEstudiante.addEventListener('change', () => {
                this.aplicarFiltros();
            });
        }
    }

    async cargarEstudiantes() {
        try {
            const response = await fetch('/orientador/estudiantes');
            const estudiantes = await response.json();

            const filtroEstudiante = document.getElementById('filtro-estudiante');
            if (!filtroEstudiante) return;

            // Mantener la opción "Todos"
            filtroEstudiante.innerHTML = '<option value="">Todos los estudiantes</option>';

            estudiantes.forEach(estudiante => {
                const option = document.createElement('option');
                option.value = estudiante.id;
                option.textContent = estudiante.nombre;
                filtroEstudiante.appendChild(option);
            });

            console.log('✅ Estudiantes cargados en el filtro:', estudiantes.length);
        } catch (error) {
            console.error('❌ Error al cargar estudiantes:', error);
        }
    }

    async aplicarFiltros() {
        const idEstudiante = document.getElementById('filtro-estudiante')?.value;
        const endpoint = idEstudiante 
            ? `/orientador/resultados/datos?idEstudiante=${idEstudiante}`
            : '/orientador/resultados/datos';

        const response = await fetch(endpoint);
        const datos = await response.json();
        this.renderizarGraficas(datos);
    }

 
    // UTILIDADES
  
    mostrarError(mensaje) {
        // Implementar notificación toast o alert
        alert(mensaje);
    }

    mostrarExito(mensaje) {
        // Implementar notificación toast
        alert(mensaje);
    }
}


// INICIALIZACIÓN 

document.addEventListener('DOMContentLoaded', () => {
    window.chartManager = new ChartManager();
    window.chartManager.init();
});