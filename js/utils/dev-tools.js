// ===============================================
// DEV TOOLS - HERRAMIENTAS DE DESARROLLO
// ===============================================

/**
 * 🔧 GESTIÓN DE BOTONES DE DESARROLLO
 * Muestra/oculta botones según el entorno (desarrollo/producción)
 */

// Función para mostrar/ocultar botones de desarrollo
function toggleDevButtons() {
    const isDev = window.isDevelopment;
    console.log('🔧 Configurando botones de desarrollo. Entorno:', isDev ? 'DESARROLLO' : 'PRODUCCIÓN');
    
    // Botones a controlar
    const devButtons = [
        'btnForceUpdate',
        'btnCheckUpdates'
    ];
    
    devButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            if (isDev) {
                button.style.display = 'inline-block';
                console.log('✅ Botón mostrado:', buttonId);
            } else {
                button.style.display = 'none';
                console.log('🚫 Botón ocultado:', buttonId);
            }
        } else {
            console.warn('⚠️ Botón no encontrado:', buttonId);
        }
    });
}

// Función mejorada para forzar actualización (más confiable)
function forceUpdateAppImproved() {
    console.log('🔄 Forzando actualización mejorada...');
    
    try {
        // Método 1: Limpiar cache del navegador
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                    console.log('🗑️ Cache eliminado:', name);
                });
            });
        }
        
        // Método 2: Limpiar localStorage de versiones
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('version') || key.includes('cache') || key.includes('update'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ localStorage limpiado:', key);
        });
        
        // Método 3: Recargar con cache busting
        const timestamp = Date.now();
        const url = new URL(window.location);
        url.searchParams.set('_t', timestamp);
        
        console.log('🔄 Recargando página con cache busting...');
        window.location.href = url.toString();
        
    } catch (error) {
        console.error('❌ Error en actualización mejorada:', error);
        // Fallback: recarga simple
        window.location.reload(true);
    }
}

// Función mejorada para verificar actualizaciones
function checkUpdatesFallbackImproved() {
    console.log('🔍 Verificando actualizaciones mejorado...');
    
    try {
        // Método 1: Usar UpdateManager si está disponible
        if (typeof updateManager !== 'undefined' && updateManager.forceCheck) {
            console.log('✅ Usando UpdateManager');
            updateManager.forceCheck();
            return;
        }
        
        // Método 2: Verificación manual
        console.log('🔍 Verificación manual de actualizaciones...');
        
        // Limpiar cache
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
                console.log('🗑️ Cache limpiado para verificación');
            });
        }
        
        // Recargar página
        const timestamp = Date.now();
        const url = new URL(window.location);
        url.searchParams.set('_check', timestamp);
        
        console.log('🔄 Recargando para verificar actualizaciones...');
        window.location.href = url.toString();
        
    } catch (error) {
        console.error('❌ Error en verificación de actualizaciones:', error);
        window.location.reload(true);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Inicializando herramientas de desarrollo...');
    
    // Mostrar/ocultar botones según el entorno
    toggleDevButtons();
    
    // Reemplazar funciones globales con versiones mejoradas
    window.forceUpdateApp = forceUpdateAppImproved;
    window.checkUpdatesFallback = checkUpdatesFallbackImproved;
    
    console.log('✅ Herramientas de desarrollo inicializadas');
});

// Exportar funciones para uso global
window.toggleDevButtons = toggleDevButtons;
window.forceUpdateAppImproved = forceUpdateAppImproved;
window.checkUpdatesFallbackImproved = checkUpdatesFallbackImproved;
