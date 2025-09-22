// ===============================================
// VERSION MANAGER - GESTIÓN AUTOMÁTICA DE VERSIONES
// ===============================================

class VersionManager {
    constructor() {
        this.currentVersion = '1.0.0';
        this.buildNumber = Date.now();
        this.lastUpdate = new Date().toISOString();
        this.init();
    }
    
    init() {
        // Obtener versión desde localStorage o generar nueva
        const storedVersion = localStorage.getItem('app_version');
        const storedBuild = localStorage.getItem('app_build');
        
        if (storedVersion && storedBuild) {
            this.currentVersion = storedVersion;
            this.buildNumber = parseInt(storedBuild);
        } else {
            // Primera vez, generar versión
            this.generateNewVersion();
        }
        
        // Actualizar información en el DOM
        this.updateVersionDisplay();
        
        // Exponer información globalmente
        window.appVersion = this.currentVersion;
        window.appBuild = this.buildNumber;
        
        console.log(`🚀 App Version: ${this.currentVersion} (Build: ${this.buildNumber})`);
    }
    
    generateNewVersion() {
        // Incrementar build number
        this.buildNumber = Date.now();
        this.lastUpdate = new Date().toISOString();
        
        // Guardar en localStorage
        localStorage.setItem('app_version', this.currentVersion);
        localStorage.setItem('app_build', this.buildNumber.toString());
        localStorage.setItem('app_last_update', this.lastUpdate);
    }
    
    updateVersionDisplay() {
        // Actualizar en la tab de configuración si existe
        const versionDisplay = document.getElementById('version-display');
        if (versionDisplay) {
            versionDisplay.innerHTML = `
                <div class="version-info">
                    <strong>📱 Versión: </strong> ${this.currentVersion}<br>
                    <strong>🔨 Build: </strong> ${this.buildNumber}<br>
                    <strong>📅 Última actualización: </strong> ${new Date(this.lastUpdate).toLocaleString()}
                </div>
            `;
        }
    }
    
    // Función para verificar si hay una nueva versión
    checkForNewVersion() {
        const serverVersion = this.getServerVersion();
        if (serverVersion && serverVersion !== this.currentVersion) {
            return {
                hasUpdate: true,
                currentVersion: this.currentVersion,
                newVersion: serverVersion
            };
        }
        return { hasUpdate: false };
    }
    
    getServerVersion() {
        // En un entorno real, esto haría una petición al servidor
        // Por ahora, simulamos que no hay nueva versión
        return null;
    }
    
    // Función para actualizar a una nueva versión
    updateToVersion(newVersion) {
        this.currentVersion = newVersion;
        this.generateNewVersion();
        this.updateVersionDisplay();
        
        // Notificar al usuario
        if (typeof showSuccess === 'function') {
            showSuccess(`Aplicación actualizada a la versión ${newVersion}`, 'Actualización completada');
        }
    }
    
    // Función para obtener información de versión
    getVersionInfo() {
        return {
            version: this.currentVersion,
            build: this.buildNumber,
            lastUpdate: this.lastUpdate,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }
}

// ===============================================
// INICIALIZACIÓN GLOBAL
// ===============================================

let versionManager;

document.addEventListener('DOMContentLoaded', () => {
    versionManager = new VersionManager();
    
    // Exponer funciones globalmente
    window.versionManager = versionManager;
    window.getVersionInfo = () => versionManager.getVersionInfo();
});

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

// Función para mostrar información de versión en consola
window.showVersionInfo = function() {
    if (versionManager) {
        const info = versionManager.getVersionInfo();
        console.log('📱 Información de la aplicación:');
        console.table(info);
    }
};

// Función para generar nueva versión (solo para desarrollo)
window.generateNewVersion = function() {
    if (versionManager) {
        versionManager.generateNewVersion();
        console.log('🔄 Nueva versión generada:', versionManager.currentVersion);
    }
};
