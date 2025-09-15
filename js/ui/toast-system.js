// ===============================================
// 🍞 TOAST SYSTEM - Sistema de Notificaciones Modernas
// ===============================================

/**
 * Sistema de notificaciones toast modernas y elegantes
 * Reemplaza los alert() tradicionales con notificaciones sutiles
 */

class ToastSystem {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    /**
     * Inicializa el sistema de toasts
     */
    init() {
        // Crear contenedor de toasts si no existe
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 99999 !important;
                pointer-events: none !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-end !important;
            `;
            document.body.appendChild(this.container);
            // Contenedor de toasts creado
        } else {
            this.container = document.querySelector('.toast-container');
            // Contenedor de toasts encontrado
        }
    }

    /**
     * Muestra una notificación toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación (success, error, warning, info)
     * @param {string} title - Título opcional
     * @param {number} duration - Duración en ms (0 = no auto-hide)
     */
    show(message, type = 'info', title = null, duration = 4000) {
        // Asegurar que el contenedor existe y está bien posicionado
        this.ensureContainer();
        
        const toast = this.createToast(message, type, title);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Animar entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-ocultar si se especifica duración
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Asegura que el contenedor existe y está bien posicionado
     */
    ensureContainer() {
        if (!this.container || !document.body.contains(this.container)) {
            this.init();
        }
        
        // Forzar estilos importantes
        this.container.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 99999 !important;
            pointer-events: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
        `;
    }

    /**
     * Crea un elemento toast
     */
    createToast(message, type, title) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Iconos para cada tipo
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        // Títulos por defecto si no se proporciona
        const defaultTitles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };

        const finalTitle = title || defaultTitles[type] || 'Notificación';

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${finalTitle}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="toastSystem.hide(this.parentElement)">×</button>
        `;

        return toast;
    }

    /**
     * Oculta un toast específico
     */
    hide(toast) {
        if (!toast) return;

        toast.classList.add('hide');
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            
            // Remover de la lista
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Oculta todos los toasts
     */
    hideAll() {
        this.toasts.forEach(toast => this.hide(toast));
    }

    // Métodos de conveniencia para cada tipo
    success(message, title = null, duration = 4000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = null, duration = 6000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = null, duration = 5000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = null, duration = 4000) {
        return this.show(message, 'info', title, duration);
    }
}

// Crear instancia global
const toastSystem = new ToastSystem();

// Función de conveniencia global
function showToast(message, type = 'info', title = null, duration = 4000) {
    return toastSystem.show(message, type, title, duration);
}

// Funciones de conveniencia globales
function showSuccess(message, title = null, duration = 4000) {
    return toastSystem.success(message, title, duration);
}

function showError(message, title = null, duration = 6000) {
    return toastSystem.error(message, title, duration);
}

function showWarning(message, title = null, duration = 5000) {
    return toastSystem.warning(message, title, duration);
}

function showInfo(message, title = null, duration = 4000) {
    return toastSystem.info(message, title, duration);
}

// Función para reemplazar alert() tradicionales
function showAlert(message, type = 'info') {
    const title = type === 'error' ? 'Error' : 
                  type === 'warning' ? 'Advertencia' : 
                  type === 'success' ? 'Éxito' : 'Información';
    
    return toastSystem.show(message, type, title);
}

// Exponer funciones globalmente
window.toastSystem = toastSystem;
window.showToast = showToast;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showAlert = showAlert;

// Sistema de toasts inicializado
