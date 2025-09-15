// ===============================================
// CONFIG.JS - Configuración centralizada de la aplicación
// ===============================================

window.GestorCP = window.GestorCP || {};

GestorCP.Config = {
    // Configuración de la aplicación
    APP: {
        name: 'GestorCP',
        version: '3.0.0',
        debug: false
    },
    
    // Configuración de localStorage
    STORAGE: {
        useCompression: true,
        maxRetries: 3,
        backupEnabled: true,
        autoCleanup: true
    },
    
    // Configuración de timers
    TIMERS: {
        updateInterval: 1000, // 1 segundo
        maxSessionTime: 24 * 60 * 60 * 1000, // 24 horas en ms
        showNotifications: true
    },
    
    // Configuración de sincronización
    SYNC: {
        autoSync: true,
        syncInterval: 30000, // 30 segundos
        maxRetries: 3,
        timeout: 10000 // 10 segundos
    },
    
    // Configuración de UI
    UI: {
        theme: 'dark',
        animations: true,
        showDebugLogs: false,
        autoSave: true,
        autoSaveInterval: 5000 // 5 segundos
    },
    
    // Configuración de exportación
    EXPORT: {
        defaultFormat: 'json',
        includeMetadata: true,
        compressExports: true
    },
    
    // Configuración de legacy
    LEGACY: {
        migrationEnabled: true,
        cleanupEnabled: true,
        showMigrationLogs: false
    },
    
    // Métodos para acceder a la configuración
    get: function(category, key) {
        if (this[category] && this[category][key] !== undefined) {
            return this[category][key];
        }
        return null;
    },
    
    set: function(category, key, value) {
        if (!this[category]) {
            this[category] = {};
        }
        this[category][key] = value;
        
        // Guardar en localStorage si es una configuración persistente
        this.saveToStorage();
    },
    
    // Cargar configuración desde localStorage
    loadFromStorage: function() {
        try {
            const saved = localStorage.getItem('gestorcp_config');
            if (saved) {
                const config = JSON.parse(saved);
                Object.assign(this, config);
            }
        } catch (e) {
            console.warn('Error cargando configuración:', e);
        }
    },
    
    // Guardar configuración en localStorage
    saveToStorage: function() {
        try {
            localStorage.setItem('gestorcp_config', JSON.stringify(this));
        } catch (e) {
            console.warn('Error guardando configuración:', e);
        }
    },
    
    // Resetear configuración a valores por defecto
    reset: function() {
        localStorage.removeItem('gestorcp_config');
        location.reload();
    }
};

// Cargar configuración al inicializar
GestorCP.Config.loadFromStorage();

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.GestorCP = GestorCP;
