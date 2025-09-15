// ===============================================
// GLOBAL-STATE.JS - Estado global centralizado
// ===============================================

/**
 * Namespace global para evitar contaminación del window object
 */
window.GestorCP = window.GestorCP || {};

// ===============================================
// ESTADO GLOBAL CENTRALIZADO
// ===============================================

GestorCP.State = {
    // Estado de la aplicación
    isInitialized: false,
    isLegacyDisabled: false,
    currentTheme: 'dark',
    
    // Estado de timers
    bugfixingTimersRestoredShown: false,
    
    // Estado de sincronización
    syncInProgress: false,
    lastSyncTime: null,
    
    // Estado de UI
    currentEditingId: null,
    isDuplicating: false,
    duplicatedCaseTemp: null,
    
    // Estado de filtros
    updatingFilters: false,
    
    // Estado de drag & drop
    dragScrollActive: false,
    
    // Métodos para acceder al estado
    set: function(key, value) {
        this[key] = value;
    },
    
    get: function(key) {
        return this[key];
    },
    
    // Métodos específicos para casos comunes
    setEditing: function(id) {
        this.currentEditingId = id;
    },
    
    clearEditing: function() {
        this.currentEditingId = null;
        this.isDuplicating = false;
        this.duplicatedCaseTemp = null;
    },
    
    setDuplicating: function(tempCase) {
        this.isDuplicating = true;
        this.duplicatedCaseTemp = tempCase;
    },
    
    clearDuplicating: function() {
        this.isDuplicating = false;
        this.duplicatedCaseTemp = null;
    }
};

// ===============================================
// FUNCIONES GLOBALES OPTIMIZADAS
// ===============================================

/**
 * Función optimizada para exponer funciones globalmente
 */
GestorCP.Utils = {
    expose: function(functions) {
        Object.keys(functions).forEach(name => {
            if (typeof functions[name] === 'function') {
                window[name] = functions[name];
            }
        });
    },
    
    exposeOnce: function(name, fn) {
        if (!window[name]) {
            window[name] = fn;
        }
    }
};

// ===============================================
// COMPATIBILIDAD CON SISTEMA EXISTENTE
// ===============================================

// Mantener compatibilidad con variables globales existentes
window.currentEditingId = null;
window.isDuplicating = false;
window.duplicatedCaseTemp = null;
window.updatingFilters = false;
window.bugfixingTimersRestoredShown = false;

// Sincronizar con el estado centralizado
Object.defineProperty(window, 'currentEditingId', {
    get: function() { return GestorCP.State.currentEditingId; },
    set: function(value) { GestorCP.State.currentEditingId = value; }
});

Object.defineProperty(window, 'isDuplicating', {
    get: function() { return GestorCP.State.isDuplicating; },
    set: function(value) { GestorCP.State.isDuplicating = value; }
});

Object.defineProperty(window, 'duplicatedCaseTemp', {
    get: function() { return GestorCP.State.duplicatedCaseTemp; },
    set: function(value) { GestorCP.State.duplicatedCaseTemp = value; }
});

Object.defineProperty(window, 'updatingFilters', {
    get: function() { return GestorCP.State.updatingFilters; },
    set: function(value) { GestorCP.State.updatingFilters = value; }
});

Object.defineProperty(window, 'bugfixingTimersRestoredShown', {
    get: function() { return GestorCP.State.bugfixingTimersRestoredShown; },
    set: function(value) { GestorCP.State.bugfixingTimersRestoredShown = value; }
});

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer solo lo necesario
window.GestorCP = GestorCP;
