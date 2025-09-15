// ===============================================
// DASHBOARD-THEME.JS - Sistema de tema para Dashboard
// ===============================================

/**
 * Función para inicializar el sistema de tema del dashboard
 */
function initDashboardThemeSystem() {
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');

    if (!themeToggle || !themeLabel) {
        console.warn('⚠️ Elementos de tema del dashboard no encontrados');
        return;
    }

    // Cargar el tema guardado en localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
        themeLabel.textContent = 'Modo Oscuro';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.checked = false;
        themeLabel.textContent = 'Modo Claro';
    }

    // Event listener para cambio de tema
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
            themeLabel.textContent = 'Modo Oscuro';
            localStorage.setItem('theme', 'dark');
            console.log('🌙 Modo oscuro activado en dashboard');
        } else {
            document.body.classList.remove('dark-mode');
            themeLabel.textContent = 'Modo Claro';
            localStorage.setItem('theme', 'light');
            console.log('☀️ Modo claro activado en dashboard');
        }

        // Trigger evento personalizado para otros módulos
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: themeToggle.checked ? 'dark' : 'light' }
        }));
    });

    // Sistema de tema del dashboard inicializado
}

/**
 * Función para cambiar tema programáticamente
 * @param {string} theme - 'light' o 'dark'
 */
function setDashboardTheme(theme) {
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    
    if (!themeToggle || !themeLabel) return;
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
        themeLabel.textContent = 'Modo Oscuro';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.checked = false;
        themeLabel.textContent = 'Modo Claro';
        localStorage.setItem('theme', 'light');
    }
    
    console.log(`🎨 Tema del dashboard cambiado a: ${theme}`);
}

// Inicializar el sistema de tema cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    initDashboardThemeSystem();
});
