// ===============================================
// EVENT-SYSTEM.JS - Sistema de eventos para desacoplar componentes
// ===============================================

window.GestorCP = window.GestorCP || {};

/**
 * Sistema de eventos simple para desacoplar componentes
 */
GestorCP.Events = {
    // Almacén de listeners
    listeners: {},
    
    // Contador de eventos para debugging
    eventCount: 0,
    
    /**
     * Suscribirse a un evento
     */
    on: function(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        
        this.listeners[eventName].push(callback);
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`📡 Event listener registrado: ${eventName}`);
        }
    },
    
    /**
     * Desuscribirse de un evento
     */
    off: function(eventName, callback) {
        if (!this.listeners[eventName]) return;
        
        const index = this.listeners[eventName].indexOf(callback);
        if (index > -1) {
            this.listeners[eventName].splice(index, 1);
        }
    },
    
    /**
     * Emitir un evento
     */
    emit: function(eventName, data = null) {
        this.eventCount++;
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`📢 Evento emitido: ${eventName}`, data);
        }
        
        if (!this.listeners[eventName]) return;
        
        // Ejecutar todos los listeners
        this.listeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Error en event listener para ${eventName}:`, error);
            }
        });
    },
    
    /**
     * Suscribirse a un evento una sola vez
     */
    once: function(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        
        this.on(eventName, onceCallback);
    },
    
    /**
     * Limpiar todos los listeners de un evento
     */
    clear: function(eventName) {
        if (eventName) {
            delete this.listeners[eventName];
        } else {
            this.listeners = {};
        }
    },
    
    /**
     * Obtener estadísticas del sistema de eventos
     */
    getStats: function() {
        const totalListeners = Object.values(this.listeners)
            .reduce((sum, listeners) => sum + listeners.length, 0);
        
        return {
            totalEvents: Object.keys(this.listeners).length,
            totalListeners: totalListeners,
            eventCount: this.eventCount
        };
    }
};

// ===============================================
// EVENTOS PREDEFINIDOS
// ===============================================

/**
 * Eventos del sistema de casos
 */
GestorCP.Events.CASES = {
    CREATED: 'case:created',
    UPDATED: 'case:updated',
    DELETED: 'case:deleted',
    DUPLICATED: 'case:duplicated',
    STATUS_CHANGED: 'case:status_changed',
    TIMER_STARTED: 'case:timer_started',
    TIMER_STOPPED: 'case:timer_stopped',
    BUGFIXING_STARTED: 'case:bugfixing_started',
    BUGFIXING_STOPPED: 'case:bugfixing_stopped'
};

/**
 * Eventos del sistema de requerimientos
 */
GestorCP.Events.REQUIREMENTS = {
    LOADED: 'requirement:loaded',
    CREATED: 'requirement:created',
    UPDATED: 'requirement:updated',
    DELETED: 'requirement:deleted',
    SWITCHED: 'requirement:switched'
};

/**
 * Eventos del sistema de almacenamiento
 */
GestorCP.Events.STORAGE = {
    SAVED: 'storage:saved',
    LOADED: 'storage:loaded',
    ERROR: 'storage:error',
    CLEANUP: 'storage:cleanup'
};

/**
 * Eventos del sistema de sincronización
 */
GestorCP.Events.SYNC = {
    STARTED: 'sync:started',
    COMPLETED: 'sync:completed',
    ERROR: 'sync:error',
    DASHBOARD_TO_APP: 'sync:dashboard_to_app',
    APP_TO_DASHBOARD: 'sync:app_to_dashboard'
};

/**
 * Eventos del sistema de UI
 */
GestorCP.Events.UI = {
    RENDERED: 'ui:rendered',
    FILTERS_UPDATED: 'ui:filters_updated',
    STATS_UPDATED: 'ui:stats_updated',
    MODAL_OPENED: 'ui:modal_opened',
    MODAL_CLOSED: 'ui:modal_closed',
    THEME_CHANGED: 'ui:theme_changed'
};

// ===============================================
// UTILIDADES PARA EVENTOS COMUNES
// ===============================================

/**
 * Emitir evento de caso creado
 */
GestorCP.Events.emitCaseCreated = function(caseData) {
    this.emit(this.CASES.CREATED, caseData);
};

/**
 * Emitir evento de caso actualizado
 */
GestorCP.Events.emitCaseUpdated = function(caseData) {
    this.emit(this.CASES.UPDATED, caseData);
};

/**
 * Emitir evento de caso eliminado
 */
GestorCP.Events.emitCaseDeleted = function(caseId) {
    this.emit(this.CASES.DELETED, caseId);
};

/**
 * Emitir evento de cambio de estado
 */
GestorCP.Events.emitStatusChanged = function(scenarioId, oldStatus, newStatus) {
    this.emit(this.CASES.STATUS_CHANGED, {
        scenarioId,
        oldStatus,
        newStatus
    });
};

/**
 * Emitir evento de timer iniciado
 */
GestorCP.Events.emitTimerStarted = function(scenarioId, timerType) {
    this.emit(this.CASES.TIMER_STARTED, {
        scenarioId,
        timerType
    });
};

/**
 * Emitir evento de timer detenido
 */
GestorCP.Events.emitTimerStopped = function(scenarioId, timerType, duration) {
    this.emit(this.CASES.TIMER_STOPPED, {
        scenarioId,
        timerType,
        duration
    });
};

/**
 * Emitir evento de guardado
 */
GestorCP.Events.emitStorageSaved = function(key, data) {
    this.emit(this.STORAGE.SAVED, { key, data });
};

/**
 * Emitir evento de carga
 */
GestorCP.Events.emitStorageLoaded = function(key, data) {
    this.emit(this.STORAGE.LOADED, { key, data });
};

/**
 * Emitir evento de error de almacenamiento
 */
GestorCP.Events.emitStorageError = function(error) {
    this.emit(this.STORAGE.ERROR, error);
};

/**
 * Emitir evento de UI renderizada
 */
GestorCP.Events.emitUIRendered = function(component, data) {
    this.emit(this.UI.RENDERED, { component, data });
};

/**
 * Emitir evento de filtros actualizados
 */
GestorCP.Events.emitFiltersUpdated = function(filters) {
    this.emit(this.UI.FILTERS_UPDATED, filters);
};

/**
 * Emitir evento de estadísticas actualizadas
 */
GestorCP.Events.emitStatsUpdated = function(stats) {
    this.emit(this.UI.STATS_UPDATED, stats);
};

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer el sistema de eventos globalmente
window.GestorCP = GestorCP;
window.Events = GestorCP.Events; // Alias para compatibilidad
