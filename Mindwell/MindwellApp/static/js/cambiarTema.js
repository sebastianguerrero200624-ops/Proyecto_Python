    // Función para alternar el sidebar (ya existente en HTML, pero aseguramos coherencia)
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('closed');
    }

    // Código para cambiar el tema (claro/oscuro)
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Verificar si hay un tema guardado en localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }

    // Evento para alternar el tema al hacer clic en el botón
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Aplicar el nuevo tema
      document.documentElement.setAttribute('data-theme', newTheme);
      
      // Cambiar el icono: luna para claro, sol para oscuro
      themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      
      // Guardar la preferencia en localStorage para persistencia
      localStorage.setItem('theme', newTheme);
    });