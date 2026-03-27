// ============================================================================
// DASHBOARD MINDWELL - SISTEMA COMPLETO
// ============================================================================

// Poemas inspiradores (20 poemas)
const POEMAS_DIARIOS = [
    {
        texto: "Respira hondo, el día es nuevo.\nCada instante es una oportunidad.",
        autor: "Mindfulness"
    },
    {
        texto: "La calma no está en la ausencia de tormentas,\nsino en la paz interior que cultivas.",
        autor: "Anónimo"
    },
    {
        texto: "Tus pensamientos son semillas.\nRiega las que quieres ver crecer.",
        autor: "Sabiduría popular"
    },
    {
        texto: "No es el estrés lo que nos mata,\nsino nuestra reacción ante él.",
        autor: "Hans Selye"
    },
    {
        texto: "Hoy elijo la paz.\nHoy elijo el bienestar.",
        autor: "Afirmación diaria"
    },
    {
        texto: "El autocuidado no es egoísmo,\nes autopreservación.",
        autor: "Audre Lorde"
    },
    {
        texto: "Pequeños pasos cada día\nconstruyen grandes cambios.",
        autor: "Motivación"
    },
    {
        texto: "Tu salud mental merece\nla misma atención que tu salud física.",
        autor: "Conciencia"
    },
    {
        texto: "No estás solo en este camino.\nPedir ayuda es valentía.",
        autor: "Apoyo"
    },
    {
        texto: "La ansiedad es temporal.\nTú eres eterno.",
        autor: "Fortaleza"
    },
    {
        texto: "Cada día sin compararte\nes un día ganado.",
        autor: "Autoaceptación"
    },
    {
        texto: "Tus emociones son válidas.\nNo necesitas justificarlas.",
        autor: "Empatía"
    },
    {
        texto: "El descanso no es debilidad,\nes necesidad.",
        autor: "Autocuidado"
    },
    {
        texto: "Hoy es perfecto para empezar\na cuidar de ti.",
        autor: "Hoy"
    },
    {
        texto: "No puedes controlar el viento,\npero sí ajustar tus velas.",
        autor: "Resiliencia"
    },
    {
        texto: "Tu valor no depende\nde tu productividad.",
        autor: "Humanidad"
    },
    {
        texto: "Está bien no estar bien.\nEstá bien pedir ayuda.",
        autor: "Normalización"
    },
    {
        texto: "El progreso no es lineal.\nCada paso cuenta.",
        autor: "Proceso"
    },
    {
        texto: "Eres más fuerte\nde lo que crees.",
        autor: "Fortaleza interior"
    },
    {
        texto: "La felicidad es un camino,\nno un destino.",
        autor: "Buddha"
    }
];

class DashboardManager {
    constructor() {
        this.usuarioActual = null;
        this.animacionMostrada = sessionStorage.getItem('welcomeShown') === 'true';
    }

    async init() {
        try {
            // 1. Cargar información del usuario
            await this.cargarUsuarioActual();
            
            // 2. Mostrar animación de bienvenida (solo primera vez por sesión)
            if (!this.animacionMostrada) {
                await this.mostrarBienvenida();
                sessionStorage.setItem('welcomeShown', 'true');
            }
            
            // 3. Cargar estadísticas
            await this.cargarEstadisticas();
            
            // 4. Mostrar poema del día
            this.mostrarPoemaDelDia();
            
            // 5. Configurar tema
            this.configurarTema();
            
            // 6. Configurar botones
            this.configurarBotones();
            
            console.log('✅ Dashboard inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar dashboard:', error);
        }
    }

    // ========================================================================
    // CARGAR USUARIO ACTUAL
    // ========================================================================
    async cargarUsuarioActual() {
        try {
            const response = await fetch('/api/dashboard/usuario-actual');
            const data = await response.json();
            
            if (data.success) {
                this.usuarioActual = data;
                console.log('👤 Usuario cargado:', data);
            } else {
                throw new Error(data.error || 'Error al cargar usuario');
            }
        } catch (error) {
            console.error('❌ Error al cargar usuario:', error);
            this.usuarioActual = {
                nombreCompleto: 'Usuario',
                tipoUsuario: 'Usuario',
                rolId: 0
            };
        }
    }

    // ========================================================================
    // ANIMACIÓN DE BIENVENIDA
    // ========================================================================
    async mostrarBienvenida() {
        return new Promise((resolve) => {
            // Crear overlay
            const overlay = document.createElement('div');
            overlay.id = 'welcome-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                cursor: pointer;
            `;

            // Crear línea de bienvenida
            const welcomeLine = document.createElement('div');
            welcomeLine.style.cssText = `
                background: linear-gradient(135deg, #00966C, #00C389);
                color: white;
                padding: 2rem 3rem;
                border-radius: 15px;
                font-size: 1.8rem;
                font-weight: 600;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0, 150, 108, 0.5);
                transform: scale(0);
                transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                max-width: 600px;
            `;
            
            const tipoUsuarioEmoji = this.usuarioActual.rolId === 3 ? '🧘‍♀️' : '🎓';
            welcomeLine.innerHTML = `
                <div style="margin-bottom: 0.5rem; font-size: 3rem;">
                    ${tipoUsuarioEmoji}
                </div>
                <div style="font-size: 1.4rem; margin-bottom: 0.5rem;">
                    ¡Bienvenido ${this.usuarioActual.tipoUsuario}!
                </div>
                <div style="font-size: 2rem; font-weight: 700;">
                    ${this.usuarioActual.nombreCompleto}
                </div>
                <div style="font-size: 0.9rem; margin-top: 1rem; opacity: 0.8;">
                    Haz clic para continuar
                </div>
            `;

            overlay.appendChild(welcomeLine);
            document.body.appendChild(overlay);

            // Animar entrada
            setTimeout(() => {
                overlay.style.opacity = '1';
                welcomeLine.style.transform = 'scale(1)';
            }, 100);

            // Cerrar al hacer clic o después de 3 segundos
            const cerrar = () => {
                overlay.style.opacity = '0';
                welcomeLine.style.transform = 'scale(0)';
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 300);
            };

            overlay.addEventListener('click', cerrar);
            setTimeout(cerrar, 3000);
        });
    }

    // ========================================================================
    // CARGAR ESTADÍSTICAS
    // ========================================================================
    async cargarEstadisticas() {
        try {
            const response = await fetch('/api/dashboard/estadisticas');
            const data = await response.json();
            
            if (data.success) {
                // Actualizar tarjetas de estadísticas
                this.actualizarEstadistica('stat-usuarios', data.totalUsuarios);
                this.actualizarEstadistica('stat-aprendices', data.totalAprendices);
                this.actualizarEstadistica('stat-orientadores', data.totalOrientadores);
                
                console.log('📊 Estadísticas cargadas:', data);
            } else {
                throw new Error(data.error || 'Error al cargar estadísticas');
            }
        } catch (error) {
            console.error('❌ Error al cargar estadísticas:', error);
            this.actualizarEstadistica('stat-usuarios', 0);
            this.actualizarEstadistica('stat-aprendices', 0);
            this.actualizarEstadistica('stat-orientadores', 0);
        }
    }

    actualizarEstadistica(elementId, valor) {
        const elemento = document.getElementById(elementId);
        if (elemento) {
            // Animación de conteo
            const valorActual = parseInt(elemento.textContent) || 0;
            this.animarContador(elemento, valorActual, valor, 1000);
        }
    }

    animarContador(elemento, desde, hasta, duracion) {
        const inicio = Date.now();
        const diferencia = hasta - desde;
        
        const animar = () => {
            const transcurrido = Date.now() - inicio;
            const progreso = Math.min(transcurrido / duracion, 1);
            
            // Easing suave
            const valorActual = Math.floor(desde + (diferencia * this.easeOutQuart(progreso)));
            elemento.textContent = valorActual;
            
            if (progreso < 1) {
                requestAnimationFrame(animar);
            }
        };
        
        animar();
    }

    easeOutQuart(x) {
        return 1 - Math.pow(1 - x, 4);
    }

    // ========================================================================
    // POEMA DEL DÍA
    // ========================================================================
    mostrarPoemaDelDia() {
        const container = document.getElementById('poema-container');
        if (!container) return;

        // Seleccionar poema basado en el día del año
        const hoy = new Date();
        const inicioAño = new Date(hoy.getFullYear(), 0, 0);
        const diff = hoy - inicioAño;
        const unDia = 1000 * 60 * 60 * 24;
        const diaDelAño = Math.floor(diff / unDia);
        const indicePoema = diaDelAño % POEMAS_DIARIOS.length;
        
        const poema = POEMAS_DIARIOS[indicePoema];
        
        container.innerHTML = `
            <div class="poema-card">
                <div class="poema-header">
                    <span class="poema-icon">📖</span>
                    <h3 class="poema-title">Reflexión del Día</h3>
                </div>
                <div class="poema-content">
                    <p class="poema-texto">${poema.texto}</p>
                    <p class="poema-autor">— ${poema.autor}</p>
                </div>
            </div>
        `;
    }

    // ========================================================================
    // CONFIGURAR TEMA
    // ========================================================================
    configurarTema() {
        const body = document.body;
        const themeIcon = document.getElementById('theme-icon');
        const themeToggle = document.getElementById('theme-toggle');

        if (!themeToggle) return;

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            themeIcon.textContent = '☀️';
        } else {
            themeIcon.textContent = '🌙';
        }

        themeToggle.addEventListener('click', () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                themeIcon.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                themeIcon.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // ========================================================================
    // CONFIGURAR BOTONES
    // ========================================================================
    configurarBotones() {
        // Los botones ya tienen sus enlaces en el HTML
        // Solo agregamos efectos visuales
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-3px) scale(1.02)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }
}

// ============================================================================
// TOGGLE SIDEBAR
// ============================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('closed');
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const dashboardManager = new DashboardManager();
    dashboardManager.init();
});