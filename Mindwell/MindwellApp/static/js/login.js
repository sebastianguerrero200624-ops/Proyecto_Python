// ==================== SOLO FRONTEND - SIN BACKEND ====================

// Crear estrellas animadas
function createStars() {
  const container = document.getElementById('starsContainer');
  if (!container) return;
  
  const starCount = 25;
  container.innerHTML = ''; // Limpiar por si se llama múltiples veces

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    const type = Math.floor(Math.random() * 3) + 1;
    star.className = `star type${type}`;
    star.style.left = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 8 + 's';
    star.style.animationDuration = (6 + Math.random() * 4) + 's';
    star.style.setProperty('--drift', (Math.random() - 0.5) * 100 + 'px');
    container.appendChild(star);
  }
}

// Toggle mostrar/ocultar contraseña
function setupPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = 'Ocultar';
      } else {
        input.type = 'password';
        this.textContent = 'Mostrar';
      }
    });
  });
}

// Variables globales para cambio de formulario
let currentForm = 'login';
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Cambiar entre Login y Registro con animación
function switchForm(targetForm) {
  if (!loginForm || !registerForm) return;

  const currentFormElement = currentForm === 'login' ? loginForm : registerForm;
  const targetFormElement = targetForm === 'login' ? loginForm : registerForm;

  currentFormElement.classList.add(targetForm === 'login' ? 'slide-out-right' : 'slide-out-left');

  setTimeout(() => {
    currentFormElement.classList.remove('active', 'slide-out-right', 'slide-out-left');
    targetFormElement.classList.add('active');
    currentForm = targetForm;

    // Cambiar título y subtítulo
    const title = document.querySelector('.auth-title');
    const subtitle = document.querySelector('.auth-subtitle');
    if (title && subtitle) {
      if (targetForm === 'login') {
        title.textContent = 'Bienvenido de vuelta';
        subtitle.textContent = 'Inicia sesión en tu cuenta';
      } else {
        title.textContent = 'Crear cuenta';
        subtitle.textContent = 'Únete a nuestra comunidad';
      }
    }
  }, 300);
}

// Validación de contraseña
function validatePassword(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
}

// Actualizar barra de fuerza de contraseña
function updatePasswordStrength(password) {
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  if (!strengthFill || !strengthText) return;

  if (!password) {
    strengthFill.style.width = '0%';
    strengthText.textContent = 'Ingresa una contraseña';
    return;
  }

  const checks = validatePassword(password);
  const score = Object.values(checks).filter(Boolean).length;

  let width = (score / 5) * 100;
  let color = '#ff6b6b';
  let text = 'Muy débil';

  if (score >= 2) { color = '#ffa726'; text = 'Débil'; }
  if (score >= 3) { color = '#ffee58'; text = 'Regular'; }
  if (score >= 4) { color = '#66bb6a'; text = 'Fuerte'; }
  if (score === 5) { color = '#4caf50'; text = 'Muy fuerte'; }

  strengthFill.style.width = width + '%';
  strengthFill.style.background = color;
  strengthText.textContent = text;
}

// Funciones de errores
function showError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input || !error) return;

  const errorText = error.querySelector('.error-text');
  if (errorText) errorText.textContent = message;

  error.classList.add('show');
  input.classList.add('error');
  input.classList.remove('success');
}

function hideError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input || !error) return;

  error.classList.remove('show');
  input.classList.remove('error');
  input.classList.add('success');
}

// Validadores individuales
function validateDocumento(value, inputId, errorId) {
  const regex = /^\d{5,10}$/; // Django permite 5-10 dígitos
  if (!regex.test(value)) {
    showError(inputId, errorId, 'El documento debe tener entre 5 y 10 números.');
    return false;
  }
  hideError(inputId, errorId);
  return true;
}

function validateNombreApellido(value, inputId, errorId) {
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,30}$/;
  if (!regex.test(value)) {
    showError(inputId, errorId, 'Solo letras y espacios, entre 3 y 30 caracteres.');
    return false;
  }
  hideError(inputId, errorId);
  return true;
}

function validateEmail(value, inputId, errorId) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(value)) {
    showError(inputId, errorId, 'Correo inválido.');
    return false;
  }
  hideError(inputId, errorId);
  return true;
}

function validateContrasena(value, inputId, errorId) {
  const checks = validatePassword(value);
  if (!checks.length || !checks.uppercase || !checks.lowercase || !checks.number || !checks.special) {
    showError(inputId, errorId, 'Mínimo 8 caracteres, mayúscula, minúscula, número y especial.');
    return false;
  }
  hideError(inputId, errorId);
  return true;
}

// Configurar validaciones en tiempo real
function setupRealTimeValidation() {
  // Login
  const loginDoc = document.getElementById('loginDocumento');
  const loginPass = document.getElementById('loginContrasena');
  
  if (loginDoc) loginDoc.addEventListener('input', (e) => validateDocumento(e.target.value, 'loginDocumento', 'loginDocumentoError'));
  if (loginPass) loginPass.addEventListener('input', (e) => validateContrasena(e.target.value, 'loginContrasena', 'loginContrasenaError'));

  // Registro
  const regNombres = document.getElementById('registerNombres');
  const regApellidos = document.getElementById('registerApellidos');
  const regDocumento = document.getElementById('registerDocumento');
  const regEmail = document.getElementById('registerEmail');
  const regContrasena = document.getElementById('registerContrasena');
  const confirmContrasena = document.getElementById('confirmContrasena');

  if (regNombres) regNombres.addEventListener('input', (e) => validateNombreApellido(e.target.value, 'registerNombres', 'registerNombresError'));
  if (regApellidos) regApellidos.addEventListener('input', (e) => validateNombreApellido(e.target.value, 'registerApellidos', 'registerApellidosError'));
  if (regDocumento) regDocumento.addEventListener('input', (e) => validateDocumento(e.target.value, 'registerDocumento', 'registerDocumentoError'));
  if (regEmail) regEmail.addEventListener('input', (e) => validateEmail(e.target.value, 'registerEmail', 'registerEmailError'));
  
  if (regContrasena) {
    regContrasena.addEventListener('input', (e) => {
      validateContrasena(e.target.value, 'registerContrasena', 'registerContrasenaError');
      updatePasswordStrength(e.target.value);
    });
  }

  if (confirmContrasena) {
    confirmContrasena.addEventListener('input', () => {
      const pass1 = document.getElementById('registerContrasena')?.value || '';
      const pass2 = confirmContrasena.value;
      if (pass1 !== pass2) {
        showError('confirmContrasena', 'confirmContrasenaError', 'Las contraseñas no coinciden');
      } else {
        hideError('confirmContrasena', 'confirmContrasenaError');
      }
    });
  }
}

// Alertas personalizadas bonitas
function showCustomAlert(title, message, type = 'success') {
  const overlay = document.getElementById('customAlertOverlay');
  const alertBox = document.getElementById('customAlert');
  if (!overlay || !alertBox) return;

  const icon = document.getElementById('alertIcon');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;

  alertBox.classList.remove('error');
  if (icon) icon.textContent = '✓';

  if (type === 'error') {
    alertBox.classList.add('error');
    if (icon) icon.textContent = '✕';
  }

  overlay.classList.add('show');

  const close = () => overlay.classList.remove('show');
  const closeBtn = document.getElementById('alertCloseBtn');
  if (closeBtn) closeBtn.onclick = close;

  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
}

// Animaciones suaves en inputs
function setupInputAnimations() {
  document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', () => {
      const parent = input.parentElement;
      if (parent) parent.style.transform = 'scale(1.02)';
      input.style.borderColor = '#cc96f9';
    });

    input.addEventListener('blur', () => {
      const parent = input.parentElement;
      if (parent) parent.style.transform = 'scale(1)';
      if (!input.value) input.style.borderColor = '#e1e5e9';
    });
  });
}

// Prevenir pegar en confirmar contraseña (seguridad)
function preventPasteOnConfirm() {
  const confirmField = document.getElementById('confirmContrasena');
  if (confirmField) {
    confirmField.addEventListener('paste', (e) => e.preventDefault());
  }
}

// Inicialización principal
document.addEventListener("DOMContentLoaded", () => {
  createStars();
  setupPasswordToggles();
  setupRealTimeValidation();
  setupInputAnimations();
  preventPasteOnConfirm();

  // Eventos de cambio de formulario
  const showRegisterBtn = document.getElementById('showRegister');
  const showLoginBtn = document.getElementById('showLogin');

  if (showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('register');
  });

  if (showLoginBtn) showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('login');
  });

  // Limpiar formulario de registro cuando se redirige desde Django
  if (window.location.search.includes('success') || document.getElementById('registerForm').classList.contains('active')) {
    document.getElementById('registerForm')?.reset();
  }

  // Enfocar documento al cargar (si no hay errores de registro)
  setTimeout(() => {
    const loginDoc = document.getElementById('loginDocumento');
    if (loginDoc && !document.getElementById('registerForm').classList.contains('active')) {
      loginDoc.focus();
    }
  }, 800);

  

  // Si Django indica que hay errores de registro, el HTML ya maneja mostrar el formulario
});
