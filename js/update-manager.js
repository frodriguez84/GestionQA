// ===============================================
// UPDATE MANAGER - GESTIÓN AUTOMÁTICA DE ACTUALIZACIONES
// ===============================================

class UpdateManager {
    constructor() {
        this.swRegistration = null;
        this.updateAvailable = false;
        this.updateCheckInterval = null;
        this.init();
    }
    
    async init() {
        console.log('🚀 UpdateManager: Inicializando...');
        
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('🔧 UpdateManager: Service Worker registrado exitosamente');
                
                this.setupEventListeners();
                this.startPeriodicCheck();
                
            } catch (error) {
                console.error('❌ UpdateManager: Error registrando Service Worker:', error);
                // Continuar sin Service Worker
                this.startPeriodicCheck();
            }
        } else {
            console.warn('⚠️ UpdateManager: Service Worker no soportado, continuando sin él');
            this.startPeriodicCheck();
        }
    }
    
    setupEventListeners() {
        // Escuchar actualizaciones del Service Worker
        this.swRegistration.addEventListener('updatefound', () => {
            console.log('🔄 UpdateManager: Nueva versión detectada');
            this.updateAvailable = true;
            this.showUpdateNotification();
        });
        
        // Escuchar mensajes del Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.updateAvailable) {
                this.updateAvailable = true;
                this.showUpdateNotification(event.data.version);
            }
        });
        
        // Escuchar cuando la app se vuelve visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });
        
        // Escuchar cuando la app gana focus
        window.addEventListener('focus', () => {
            this.checkForUpdates();
        });
    }
    
    startPeriodicCheck() {
        // Verificar actualizaciones cada 5 minutos
        this.updateCheckInterval = setInterval(() => {
            this.checkForUpdates();
        }, 5 * 60 * 1000);
        
        // Verificar inmediatamente al cargar
        setTimeout(() => {
            this.checkForUpdates();
        }, 2000);
    }
    
    async checkForUpdates() {
        if (!this.swRegistration) return;
        
        try {
            await this.swRegistration.update();
            
            // Verificar con el Service Worker si hay actualizaciones
            if (navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();
                
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.updateAvailable) {
                        this.updateAvailable = true;
                        this.showUpdateNotification(event.data.version);
                    }
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'CHECK_UPDATE' },
                    [messageChannel.port2]
                );
            }
            
        } catch (error) {
            console.error('❌ UpdateManager: Error verificando actualizaciones:', error);
        }
    }
    
    showUpdateNotification(version = null) {
        // Crear notificación de actualización
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <div class="update-icon">🔄</div>
                <div class="update-text">
                    <strong>Nueva versión disponible</strong>
                    ${version ? `<br><small>Versión ${version}</small>` : ''}
                </div>
                <div class="update-actions">
                    <button class="btn-update" onclick="window.updateManager?.applyUpdate() || window.location.reload()">
                        Actualizar Ahora
                    </button>
                    <button class="btn-later" onclick="window.updateManager?.hideNotification() || document.getElementById('update-notification')?.remove()">
                        Más Tarde
                    </button>
                </div>
            </div>
        `;
        
        // Agregar estilos si no existen
        if (!document.getElementById('update-styles')) {
            const styles = document.createElement('style');
            styles.id = 'update-styles';
            styles.textContent = `
                .update-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    z-index: 10000;
                    max-width: 350px;
                    animation: slideIn 0.3s ease-out;
                }
                
                .update-content {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .update-icon {
                    font-size: 24px;
                    animation: pulse 2s infinite;
                }
                
                .update-text {
                    flex: 1;
                    font-size: 14px;
                    line-height: 1.4;
                }
                
                .update-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                }
                
                .btn-update, .btn-later {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                
                .btn-update {
                    background: #4CAF50;
                    color: white;
                }
                
                .btn-update:hover {
                    background: #45a049;
                    transform: translateY(-1px);
                }
                
                .btn-later {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }
                
                .btn-later:hover {
                    background: rgba(255,255,255,0.3);
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                .update-notification.hidden {
                    animation: slideOut 0.3s ease-in forwards;
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Remover notificación anterior si existe
        const existing = document.getElementById('update-notification');
        if (existing) {
            existing.remove();
        }
        
        document.body.appendChild(notification);
        
        // Auto-ocultar después de 30 segundos
        setTimeout(() => {
            if (document.getElementById('update-notification')) {
                this.hideNotification();
            }
        }, 30000);
    }
    
    hideNotification() {
        const notification = document.getElementById('update-notification');
        if (notification) {
            notification.classList.add('hidden');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }
    
    async applyUpdate() {
        if (!this.swRegistration) return;
        
        try {
            // Limpiar caché completamente
            await this.clearCache();
            
            // Forzar recarga de la página
            window.location.reload(true);
            
        } catch (error) {
            console.error('❌ UpdateManager: Error aplicando actualización:', error);
            // Fallback: recarga simple
            window.location.reload(true);
        }
    }
    
    async clearCache() {
        return new Promise((resolve) => {
            if (navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();
                
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.success) {
                        console.log('✅ UpdateManager: Cache limpiado');
                        resolve();
                    }
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'CLEAR_CACHE' },
                    [messageChannel.port2]
                );
            } else {
                resolve();
            }
        });
    }
    
    // Función para forzar verificación de actualizaciones
    forceCheck() {
        this.checkForUpdates();
    }
    
    // Función para limpiar caché manualmente
    async forceClearCache() {
        await this.clearCache();
        window.location.reload(true);
    }
    
    destroy() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
    }
}

// ===============================================
// INICIALIZACIÓN GLOBAL
// ===============================================

let updateManager;

// Inicializar inmediatamente para que esté disponible para los botones
updateManager = new UpdateManager();

// Exponer funciones globalmente inmediatamente
window.updateManager = updateManager;
window.forceUpdate = () => updateManager.forceClearCache();
window.checkUpdates = () => updateManager.forceCheck();

console.log('✅ UpdateManager inicializado y funciones expuestas globalmente');

// También ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM listo - UpdateManager ya inicializado');
});

// ===============================================
// FUNCIONES DE FALLBACK (Inmediatas)
// ===============================================

// Funciones que se ejecutan inmediatamente, sin esperar al DOM
window.forceUpdateApp = () => {
    console.log('🔄 Forzando actualización...');
    console.log('🔍 UpdateManager disponible:', !!updateManager);
    console.log('🔍 window.updateManager disponible:', !!window.updateManager);
    if (updateManager) {
        console.log('✅ Usando UpdateManager para forzar actualización');
        updateManager.forceClearCache();
    } else if (window.updateManager) {
        console.log('✅ Usando window.updateManager para forzar actualización');
        window.updateManager.forceClearCache();
    } else {
        console.log('⚠️ UpdateManager no disponible, recargando página...');
        window.location.reload(true);
    }
};

// Función de fallback para verificar actualizaciones
window.checkUpdatesFallback = () => {
    console.log('🔍 Verificando actualizaciones...');
    console.log('🔍 UpdateManager disponible:', !!updateManager);
    console.log('🔍 window.updateManager disponible:', !!window.updateManager);
    if (updateManager) {
        console.log('✅ Usando UpdateManager para verificar actualizaciones');
        updateManager.forceCheck();
    } else if (window.updateManager) {
        console.log('✅ Usando window.updateManager para verificar actualizaciones');
        window.updateManager.forceCheck();
    } else {
        console.log('⚠️ UpdateManager no disponible, verificando manualmente...');
        window.location.reload(true);
    }
};

// Funciones de debug globales
window.debugUpdateManager = () => {
    console.log('🔍 DEBUG UpdateManager:');
    console.log('- updateManager disponible:', !!updateManager);
    console.log('- Service Worker disponible:', 'serviceWorker' in navigator);
    console.log('- swRegistration:', updateManager?.swRegistration ? 'Sí' : 'No');
    console.log('- updateAvailable:', updateManager?.updateAvailable || false);
    
    if (updateManager) {
        console.log('- Estado del UpdateManager:', updateManager);
    }
};

window.testForceUpdate = () => {
    console.log('🧪 Probando forzar actualización...');
    forceUpdateApp();
};

window.testCheckUpdates = () => {
    console.log('🧪 Probando verificar actualizaciones...');
    checkUpdatesFallback();
};

// ===============================================
// FUNCIONES DE COMPATIBILIDAD
// ===============================================

// Mantener compatibilidad con el botón existente
window.forceUpdateApp = () => {
    if (updateManager) {
        updateManager.forceClearCache();
    } else {
        window.location.reload(true);
    }
};
