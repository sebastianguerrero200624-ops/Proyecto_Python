// ============================================================================
// DASHBOARD MINDWELL
// ============================================================================

const POEMAS_DIARIOS = [
    { texto: "Respira hondo, el día es nuevo.\nCada instante es una oportunidad.", autor: "Mindfulness" },
    { texto: "La calma no está en la ausencia de tormentas,\nsino en la paz interior que cultivas.", autor: "Anónimo" },
    { texto: "Tus pensamientos son semillas.\nRiega las que quieres ver crecer.", autor: "Sabiduría popular" },
    { texto: "No es el estrés lo que nos mata,\nsino nuestra reacción ante él.", autor: "Hans Selye" },
    { texto: "Hoy elijo la paz.\nHoy elijo el bienestar.", autor: "Afirmación diaria" },
    { texto: "El autocuidado no es egoísmo,\nes autopreservación.", autor: "Audre Lorde" },
    { texto: "Pequeños pasos cada día\nconstruyen grandes cambios.", autor: "Motivación" },
    { texto: "Tu salud mental merece\nla misma atención que tu salud física.", autor: "Conciencia" },
    { texto: "No estás solo en este camino.\nPedir ayuda es valentía.", autor: "Apoyo" },
    { texto: "La ansiedad es temporal.\nTú eres eterno.", autor: "Fortaleza" },
    { texto: "Cada día sin compararte\nes un día ganado.", autor: "Autoaceptación" },
    { texto: "Tus emociones son válidas.\nNo necesitas justificarlas.", autor: "Empatía" },
    { texto: "El descanso no es debilidad,\nes necesidad.", autor: "Autocuidado" },
    { texto: "Hoy es perfecto para empezar\na cuidar de ti.", autor: "Hoy" },
    { texto: "No puedes controlar el viento,\npero sí ajustar tus velas.", autor: "Resiliencia" },
    { texto: "Tu valor no depende\nde tu productividad.", autor: "Humanidad" },
    { texto: "Está bien no estar bien.\nEstá bien pedir ayuda.", autor: "Normalización" },
    { texto: "El progreso no es lineal.\nCada paso cuenta.", autor: "Proceso" },
    { texto: "Eres más fuerte\nde lo que crees.", autor: "Fortaleza interior" },
    { texto: "La felicidad es un camino,\nno un destino.", autor: "Buddha" }
];

class DashboardManager {
    constructor() {
        // Datos inyectados desde Django directamente en el HTML
        this.rolId          = window.MINDWELL_ROL    || 0;
        this.nombreCompleto = window.MINDWELL_NOMBRE || 'Usuario';
        this.animacionMostrada = sessionStorage.getItem('welcomeShown') === 'true';
    }

    async init() {
        try {
            // 1. Animación de bienvenida (solo la primera vez por sesión)
            if (!this.animacionMostrada) {
                await this.mostrarBienvenida();
                sessionStorage.setItem('welcomeShown', 'true');
            }

            // 2. Cargar estadísticas desde la API
            await this.cargarEstadisticas();

            // 3. Poema del día
            this.mostrarPoemaDelDia();

            // 4. Tema claro/oscuro
            this.configurarTema();

            // 5. Efectos de botones
            this.configurarBotones();

            console.log('✅ Dashboard inicializado');
        } catch (error) {
            console.error('❌ Error al inicializar dashboard:', error);
        }
    }

    // ──────────────────────────────────────────────
    //  ANIMACIÓN DE BIENVENIDA
    // ──────────────────────────────────────────────
    async mostrarBienvenida() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'welcome-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0;
                width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                display: flex; align-items: center; justify-content: center;
                z-index: 10000; opacity: 0;
                transition: opacity 0.3s ease; cursor: pointer;
            `;

            const tipoLabel = { 1: 'Administrador', 2: 'Aprendiz', 3: 'Instructor' }[this.rolId] || 'Usuario';
            const emoji     = this.rolId === 3 ? '🧘‍♀️' : this.rolId === 1 ? '🛡️' : '🎓';

            const card = document.createElement('div');
            card.style.cssText = `
                background: linear-gradient(135deg, #00966C, #00C389);
                color: white; padding: 2rem 3rem; border-radius: 15px;
                font-size: 1.8rem; font-weight: 600; text-align: center;
                box-shadow: 0 10px 40px rgba(0,150,108,0.5);
                transform: scale(0);
                transition: transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55);
                max-width: 600px;
            `;
            card.innerHTML = `
                <div style="margin-bottom:.5rem;font-size:3rem;">${emoji}</div>
                <div style="font-size:1.4rem;margin-bottom:.5rem;">¡Bienvenido ${tipoLabel}!</div>
                <div style="font-size:2rem;font-weight:700;">${this.nombreCompleto}</div>
                <div style="font-size:.9rem;margin-top:1rem;opacity:.8;">Haz clic para continuar</div>
            `;

            overlay.appendChild(card);
            document.body.appendChild(overlay);

            setTimeout(() => { overlay.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 100);

            const cerrar = () => {
                overlay.style.opacity = '0';
                card.style.transform = 'scale(0)';
                setTimeout(() => { overlay.remove(); resolve(); }, 300);
            };

            overlay.addEventListener('click', cerrar);
            setTimeout(cerrar, 3000);
        });
    }

    // ──────────────────────────────────────────────
    //  ESTADÍSTICAS
    // ──────────────────────────────────────────────
    async cargarEstadisticas() {
        try {
            const res  = await fetch('/api/dashboard/estadisticas');
            const data = await res.json();
            if (data.success) {
                this._animar('stat-usuarios',    data.totalUsuarios);
                this._animar('stat-aprendices',  data.totalAprendices);
                this._animar('stat-orientadores', data.totalOrientadores);
            }
        } catch (err) {
            console.error('❌ Error estadísticas:', err);
        }
    }

    _animar(id, hasta) {
        const el = document.getElementById(id);
        if (!el) return;
        const desde  = 0;
        const inicio = Date.now();
        const dur    = 1000;
        const tick   = () => {
            const t = Math.min((Date.now() - inicio) / dur, 1);
            el.textContent = Math.floor(desde + (hasta - desde) * (1 - Math.pow(1 - t, 4)));
            if (t < 1) requestAnimationFrame(tick);
        };
        tick();
    }

    // ──────────────────────────────────────────────
    //  POEMA DEL DÍA
    // ──────────────────────────────────────────────
    mostrarPoemaDelDia() {
        const container = document.getElementById('poema-container');
        if (!container) return;

        const hoy   = new Date();
        const ini   = new Date(hoy.getFullYear(), 0, 0);
        const dia   = Math.floor((hoy - ini) / 86400000);
        const poema = POEMAS_DIARIOS[dia % POEMAS_DIARIOS.length];

        container.innerHTML = `
            <div class="poema-card">
                <div class="poema-header">
                    <span class="poema-icon">📖</span>
                    <h3 class="poema-title">Reflexión del Día</h3>
                </div>
                <div class="poema-content">
                    <p class="poema-texto">${poema.texto.replace(/\n/g, '<br>')}</p>
                    <p class="poema-autor">— ${poema.autor}</p>
                </div>
            </div>`;
    }

    // ──────────────────────────────────────────────
    //  TEMA
    // ──────────────────────────────────────────────
    configurarTema() {
        const body   = document.body;
        const icon   = document.getElementById('theme-icon');
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        if (localStorage.getItem('theme') === 'dark') {
            body.setAttribute('data-theme', 'dark');
            if (icon) icon.textContent = '☀️';
        } else {
            if (icon) icon.textContent = '🌙';
        }

        toggle.addEventListener('click', () => {
            const dark = body.getAttribute('data-theme') === 'dark';
            body.setAttribute('data-theme', dark ? '' : 'dark');
            if (icon) icon.textContent = dark ? '🌙' : '☀️';
            localStorage.setItem('theme', dark ? 'light' : 'dark');
        });
    }

    // ──────────────────────────────────────────────
    //  BOTONES
    // ──────────────────────────────────────────────
    configurarBotones() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-3px) scale(1.02)';
            });
            btn.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }
}

// ── Sidebar toggle ──
function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('closed');
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager().init();
});