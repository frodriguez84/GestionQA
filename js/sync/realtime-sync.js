// ===============================================
// REALTIME-SYNC.JS - Sincronización en Tiempo Real
// VERSIÓN: 20250113a - BROADCASTCHANNEL API
// ===============================================

/**
 * 🔄 REALTIME SYNC - Sincronización entre pestañas
 * 
 * Usa BroadcastChannel API para sincronizar cambios en tiempo real
 * entre múltiples pestañas del mismo navegador
 */

// Configuración
const SYNC_CHANNEL = 'gestorcp-sync';
const SYNC_EVENTS = {
    CASE_UPDATED: 'case_updated',
    SCENARIO_UPDATED: 'scenario_updated',
    CASE_CREATED: 'case_created',
    CASE_DELETED: 'case_deleted',
    REQUIREMENT_UPDATED: 'requirement_updated',
    USER_ACTIVITY: 'user_activity',
    SYNC_REQUEST: 'sync_request',
    SYNC_RESPONSE: 'sync_response'
};

// Variables globales
let syncChannel = null;
let isSyncEnabled = false;
let currentUser = null;
let lastSyncTime = null;
let pendingChanges = new Map();

// ===============================================
// INICIALIZACIÓN
// ===============================================

/**
 * 🚀 Inicializa el sistema de sincronización
 */
function initRealtimeSync() {
    try {
        // Verificar soporte de BroadcastChannel
        if (!window.BroadcastChannel) {
            console.warn('⚠️ BroadcastChannel no soportado, sincronización deshabilitada');
            return false;
        }

        // Crear canal de sincronización
        syncChannel = new BroadcastChannel(SYNC_CHANNEL);
        
        // Configurar usuario actual
        currentUser = getCurrentUser();
        
        // Configurar event listeners
        setupSyncEventListeners();
        
        // Habilitar sincronización
        isSyncEnabled = true;
        lastSyncTime = new Date().toISOString();
        
        console.log('✅ Sincronización en tiempo real inicializada');
        console.log('👤 Usuario actual:', currentUser);
        console.log('📡 Canal de sincronización creado:', SYNC_CHANNEL);
        console.log('🔄 Estado de sincronización:', isSyncEnabled);
        
        // Solicitar sincronización inicial (diferida para no impactar el boot)
        setTimeout(() => {
            try {
                if (document.visibilityState === 'visible') {
                    requestFullSync();
                }
            } catch (e) { /* noop */ }
        }, 2000);
        
        // Verificar conectividad del canal
        setTimeout(() => {
            if (syncChannel) {
                console.log('🔍 Verificando conectividad del canal...');
                syncChannel.postMessage({
                    type: 'test_connection',
                    user: currentUser,
                    timestamp: new Date().toISOString()
                });
            }
        }, 1000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error inicializando sincronización:', error);
        return false;
    }
}

/**
 * 👤 Obtiene información del usuario actual
 */
function getCurrentUser() {
    // Crear usuario único por pestaña basado en timestamp
    const timestamp = Date.now();
    const user = `Tester_${timestamp.toString().slice(-4)}`;
    
    // Guardar en sessionStorage (solo para esta pestaña)
    sessionStorage.setItem('currentUser', user);
    
    return user;
}

/**
 * 🎧 Configura los event listeners de sincronización
 */
function setupSyncEventListeners() {
    if (!syncChannel) return;

    syncChannel.onmessage = (event) => {
        try {
            const { type, data, user, timestamp } = event.data;
            
            console.log('📨 Mensaje de sincronización recibido:', { type, user, timestamp });
            
            // Ignorar mensajes propios
            if (user === currentUser) {
                console.log('⏭️ Ignorando mensaje propio');
                return;
            }
            
            // Procesar según el tipo de evento
            switch (type) {
                case SYNC_EVENTS.CASE_UPDATED:
                    handleCaseUpdated(data);
                    break;
                    
                case SYNC_EVENTS.SCENARIO_UPDATED:
                    handleScenarioUpdated(data);
                    break;
                    
                case SYNC_EVENTS.CASE_CREATED:
                    handleCaseCreated(data);
                    break;
                    
                case SYNC_EVENTS.CASE_DELETED:
                    handleCaseDeleted(data);
                    break;
                    
                case SYNC_EVENTS.REQUIREMENT_UPDATED:
                    handleRequirementUpdated(data);
                    break;
                    
                case SYNC_EVENTS.USER_ACTIVITY:
                    handleUserActivity(data);
                    break;
                    
                case SYNC_EVENTS.SYNC_REQUEST:
                    handleSyncRequest(data);
                    break;
                    
                case SYNC_EVENTS.SYNC_RESPONSE:
                    handleSyncResponse(data);
                    break;
                    
                case 'test_connection':
                    handleTestConnection(data);
                    break;
                    
                case 'test_connection_response':
                    handleTestConnectionResponse(data);
                    break;
            }
            
        } catch (error) {
            console.error('❌ Error procesando mensaje de sincronización:', error);
        }
    };
}

// ===============================================
// MANEJO DE EVENTOS DE SINCRONIZACIÓN
// ===============================================

/**
 * 📝 Maneja actualización de caso
 */
function handleCaseUpdated(data) {
    try {
        console.log('🔄 Caso actualizado por otro usuario:', data.caseId);
        
        // Actualizar el caso en la UI local
        if (window.currentRequirement && window.currentRequirement.cases) {
            const caseIndex = window.currentRequirement.cases.findIndex(c => c.id === data.caseId);
            if (caseIndex !== -1) {
                // Actualizar caso
                window.currentRequirement.cases[caseIndex] = { ...window.currentRequirement.cases[caseIndex], ...data.caseData };
                
                // Actualizar UI si es necesario
                if (typeof updateMulticaseUI === 'function') {
                    updateMulticaseUI();
                }
                
                // Mostrar notificación
                showSyncNotification(`Caso ${data.caseNumber} actualizado por ${data.user}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error manejando actualización de caso:', error);
    }
}

/**
 * 📋 Maneja actualización de escenario
 */
function handleScenarioUpdated(data) {
    try {
        console.log('🔄 Escenario actualizado por otro usuario:', data.scenarioId);
        console.log('📊 Datos recibidos:', data);
        
        // Verificar si es un escenario nuevo (no existe en la lista local)
        if (window.testCases) {
            const scenarioIndex = window.testCases.findIndex(s => s.id === data.scenarioId);
            
            // Verificar si es una eliminación
            if (data.scenarioData && data.scenarioData.deleted === true) {
                // Eliminar escenario
                if (scenarioIndex !== -1) {
                    window.testCases.splice(scenarioIndex, 1);
                    console.log('🗑️ Escenario eliminado:', data.scenarioNumber);
                    console.log('📊 Total de escenarios después de eliminar:', window.testCases.length);
                }
            } else if (scenarioIndex !== -1) {
                // Actualizar escenario existente
                window.testCases[scenarioIndex] = { ...window.testCases[scenarioIndex], ...data.scenarioData };
                console.log('✅ Escenario existente actualizado');
            } else {
                // Agregar nuevo escenario
                window.testCases.push(data.scenarioData);
                console.log('✅ Nuevo escenario agregado:', data.scenarioNumber);
                console.log('📊 Total de escenarios después de agregar:', window.testCases.length);
            }
                
                // Preservar los datos en localStorage también
                if (typeof saveToStorage === 'function') {
                    saveToStorage();
                    console.log('💾 Datos guardados en localStorage');
                }
            
            // Actualizar UI
            if (typeof renderTestCases === 'function') {
                renderTestCases();
                console.log('🔄 UI actualizada con renderTestCases');
            } else if (typeof window.renderTestCases === 'function') {
                window.renderTestCases();
                console.log('🔄 UI actualizada con window.renderTestCases');
            } else {
                console.warn('⚠️ renderTestCases no está disponible');
                // Forzar actualización de la UI
                setTimeout(() => {
                    if (typeof window.updateAppStats === 'function') {
                        window.updateAppStats();
                    }
                    if (typeof window.applyFilters === 'function') {
                        window.applyFilters();
                    }
                }, 100);
            }
            
            // Mostrar notificación
            if (data.scenarioData && data.scenarioData.deleted === true) {
                showSyncNotification(`Escenario ${data.scenarioNumber} eliminado por ${data.user}`);
            } else {
                showSyncNotification(`Escenario ${data.scenarioNumber} actualizado por ${data.user}`);
            }
            
            // Verificar que los datos se mantuvieron después de actualizar UI
            setTimeout(() => {
                console.log('🔍 Verificación post-UI - Total de escenarios:', window.testCases.length);
                if (window.testCases.length === 0) {
                    console.warn('⚠️ Los escenarios se perdieron después de actualizar UI');
                    // Recuperar manualmente desde localStorage (evitar loadFromStorage que falla)
                    try {
                        console.log('🔄 Intentando recuperar datos desde localStorage...');
                        const savedData = localStorage.getItem('testCases');
                        if (savedData) {
                            const parsedData = JSON.parse(savedData);
                            if (Array.isArray(parsedData)) {
                                window.testCases = parsedData;
                                console.log('✅ Datos recuperados manualmente desde localStorage:', parsedData.length, 'escenarios');
                                
                                // Actualizar UI después de recuperar
                                setTimeout(() => {
                                    if (typeof window.renderTestCases === 'function') {
                                        window.renderTestCases();
                                        console.log('🔄 UI actualizada después de recuperar datos');
                                    }
                                    if (typeof window.updateAppStats === 'function') {
                                        window.updateAppStats();
                                        console.log('📊 Estadísticas actualizadas');
                                    }
                                }, 100);
                            } else {
                                console.warn('⚠️ Datos en localStorage no son un array válido');
                            }
                        } else {
                            console.warn('⚠️ No hay datos guardados en localStorage');
                        }
                    } catch (error) {
                        console.error('❌ Error recuperando datos desde localStorage:', error);
                    }
                }
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Error manejando actualización de escenario:', error);
    }
}

/**
 * ➕ Maneja creación de caso
 */
function handleCaseCreated(data) {
    try {
        console.log('➕ Caso creado por otro usuario:', data.caseId);
        
        // Agregar caso a la UI local
        if (window.currentRequirement && window.currentRequirement.cases) {
            window.currentRequirement.cases.push(data.caseData);
            
            // Actualizar UI
            if (typeof updateMulticaseUI === 'function') {
                updateMulticaseUI();
            }
            
            // Mostrar notificación
            showSyncNotification(`Nuevo caso ${data.caseNumber} creado por ${data.user}`);
        }
        
    } catch (error) {
        console.error('❌ Error manejando creación de caso:', error);
    }
}

/**
 * 🗑️ Maneja eliminación de caso
 */
function handleCaseDeleted(data) {
    try {
        console.log('🗑️ Caso eliminado por otro usuario:', data.caseId);
        
        // Eliminar caso de la UI local
        if (window.currentRequirement && window.currentRequirement.cases) {
            const caseIndex = window.currentRequirement.cases.findIndex(c => c.id === data.caseId);
            if (caseIndex !== -1) {
                window.currentRequirement.cases.splice(caseIndex, 1);
                
                // Actualizar UI
                if (typeof updateMulticaseUI === 'function') {
                    updateMulticaseUI();
                }
                
                // Mostrar notificación
                showSyncNotification(`Caso ${data.caseNumber} eliminado por ${data.user}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error manejando eliminación de caso:', error);
    }
}

/**
 * 📊 Maneja actualización de requerimiento
 */
function handleRequirementUpdated(data) {
    try {
        console.log('🔄 Requerimiento actualizado por otro usuario:', data.requirementId);
        
        // Actualizar requerimiento en la UI local
        if (window.currentRequirement && window.currentRequirement.id === data.requirementId) {
            window.currentRequirement = { ...window.currentRequirement, ...data.requirementData };
            
            // Actualizar UI
            if (typeof updateMulticaseUI === 'function') {
                updateMulticaseUI();
            }
            
            // Mostrar notificación
            showSyncNotification(`Requerimiento actualizado por ${data.user}`);
        }
        
    } catch (error) {
        console.error('❌ Error manejando actualización de requerimiento:', error);
    }
}

/**
 * 👥 Maneja actividad de usuario
 */
function handleUserActivity(data) {
    try {
        console.log('👥 Usuario activo:', data.user, data.activity);
        
        // Actualizar indicador de usuario activo
        updateUserActivityIndicator(data);
        
    } catch (error) {
        console.error('❌ Error manejando actividad de usuario:', error);
    }
}

/**
 * 🔄 Maneja solicitud de sincronización
 */
function handleSyncRequest(data) {
    try {
        console.log('🔄 Solicitud de sincronización de:', data.user);
        
        // Responder con datos actuales
        sendSyncResponse(data.requestId);
        
    } catch (error) {
        console.error('❌ Error manejando solicitud de sincronización:', error);
    }
}

/**
 * 📨 Maneja respuesta de sincronización
 */
function handleSyncResponse(data) {
    try {
        console.log('📨 Respuesta de sincronización recibida de:', data.user);
        
        // Aplicar cambios recibidos
        applySyncData(data.syncData);
        
    } catch (error) {
        console.error('❌ Error manejando respuesta de sincronización:', error);
    }
}

// ===============================================
// FUNCIONES DE ENVÍO
// ===============================================

/**
 * 📤 Envía evento de sincronización
 */
function sendSyncEvent(type, data) {
    if (!isSyncEnabled || !syncChannel) {
        console.warn('⚠️ Sincronización no disponible:', { isSyncEnabled, syncChannel: !!syncChannel });
        return;
    }
    
    try {
        const message = {
            type,
            data,
            user: currentUser,
            timestamp: new Date().toISOString()
        };
        
        syncChannel.postMessage(message);
        //console.log('📤 Evento de sincronización enviado:', { type, user: currentUser, data });
        
    } catch (error) {
        console.error('❌ Error enviando evento de sincronización:', error);
    }
}

/**
 * 🔄 Solicita sincronización completa
 */
function requestFullSync() {
    if (!isSyncEnabled) return;
    
    const requestId = `sync_${Date.now()}`;
    sendSyncEvent(SYNC_EVENTS.SYNC_REQUEST, { requestId, user: currentUser });
}

/**
 * 📨 Envía respuesta de sincronización
 */
function sendSyncResponse(requestId) {
    if (!isSyncEnabled) return;
    
    try {
        const syncData = {
            currentRequirement: window.currentRequirement,
            testCases: window.testCases,
            currentCaseId: window.currentCaseId,
            lastSyncTime: new Date().toISOString()
        };
        
        sendSyncEvent(SYNC_EVENTS.SYNC_RESPONSE, { 
            requestId, 
            user: currentUser, 
            syncData 
        });
        
    } catch (error) {
        console.error('❌ Error enviando respuesta de sincronización:', error);
    }
}

// ===============================================
// FUNCIONES PÚBLICAS
// ===============================================

/**
 * 📝 Notifica actualización de caso
 */
function notifyCaseUpdated(caseId, caseData) {
    if (!isSyncEnabled) return;
    
    sendSyncEvent(SYNC_EVENTS.CASE_UPDATED, {
        caseId,
        caseData,
        caseNumber: caseData.caseNumber || 'N/A'
    });
}

/**
 * 📋 Notifica actualización de escenario
 */
function notifyScenarioUpdated(scenarioId, scenarioData) {
    if (!isSyncEnabled) return;
    
    sendSyncEvent(SYNC_EVENTS.SCENARIO_UPDATED, {
        scenarioId,
        scenarioData,
        scenarioNumber: scenarioData.scenarioNumber || 'N/A'
    });
}

/**
 * ➕ Notifica creación de caso
 */
function notifyCaseCreated(caseId, caseData) {
    if (!isSyncEnabled) return;
    
    sendSyncEvent(SYNC_EVENTS.CASE_CREATED, {
        caseId,
        caseData,
        caseNumber: caseData.caseNumber || 'N/A'
    });
}

/**
 * 🗑️ Notifica eliminación de caso
 */
function notifyCaseDeleted(caseId, caseNumber) {
    if (!isSyncEnabled) return;
    
    sendSyncEvent(SYNC_EVENTS.CASE_DELETED, {
        caseId,
        caseNumber
    });
}

/**
 * 📊 Notifica actualización de requerimiento
 */
function notifyRequirementUpdated(requirementId, requirementData) {
    if (!isSyncEnabled) return;
    
    sendSyncEvent(SYNC_EVENTS.REQUIREMENT_UPDATED, {
        requirementId,
        requirementData
    });
}

/**
 * 👥 Notifica actividad de usuario
 */
function notifyUserActivity(activity) {
    if (!isSyncEnabled) return;
    
    sendSyncEvent(SYNC_EVENTS.USER_ACTIVITY, {
        activity,
        timestamp: new Date().toISOString()
    });
}

// ===============================================
// FUNCIONES DE UI
// ===============================================

/**
 * 🔔 Muestra notificación de sincronización
 */
function showSyncNotification(message) {
    try {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = 'sync-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            ">
                <strong>🔄 Sincronización</strong><br>
                ${message}
            </div>
        `;
        
        // Agregar estilos CSS si no existen
        if (!document.querySelector('#sync-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'sync-notification-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .sync-notification {
                    animation: slideIn 0.3s ease-out;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Remover después de 4 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
        
    } catch (error) {
        console.error('❌ Error mostrando notificación de sincronización:', error);
    }
}

/**
 * 👥 Actualiza indicador de usuario activo
 */
function updateUserActivityIndicator(data) {
    try {
        // Buscar o crear indicador de usuario activo
        let indicator = document.getElementById('user-activity-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'user-activity-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 12px;
                z-index: 9999;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div>👥 Usuarios activos:</div>
            <div>${data.user} - ${data.activity}</div>
        `;
        
        // Ocultar después de 10 segundos
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.style.opacity = '0.5';
            }
        }, 10000);
        
    } catch (error) {
        console.error('❌ Error actualizando indicador de usuario activo:', error);
    }
}

/**
 * 🔍 Maneja test de conexión
 */
function handleTestConnection(data) {
    try {
        console.log('🔍 Test de conexión recibido de:', data?.user || 'usuario desconocido');
        console.log('✅ Canal de sincronización funcionando correctamente');
        
        // Responder al test
        sendSyncEvent('test_connection_response', {
            user: currentUser,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error manejando test de conexión:', error);
    }
}

/**
 * 🔍 Maneja respuesta de test de conexión
 */
function handleTestConnectionResponse(data) {
    try {
        console.log('🔍 Respuesta de test de conexión recibida de:', data?.user || 'usuario desconocido');
        console.log('✅ Comunicación bidireccional funcionando');
        
    } catch (error) {
        console.error('❌ Error manejando respuesta de test de conexión:', error);
    }
}

/**
 * 📊 Aplica datos de sincronización
 */
function applySyncData(syncData) {
    try {
        if (syncData.currentRequirement) {
            window.currentRequirement = syncData.currentRequirement;
        }
        
        if (syncData.testCases) {
            window.testCases = syncData.testCases;
            if (Array.isArray(syncData.testCases)) {
                try { testCases = [...syncData.testCases]; } catch(_) {}
            }
        }
        
        if (syncData.currentCaseId) {
            window.currentCaseId = syncData.currentCaseId;
        }
        
        // Actualizar UI
        if (typeof updateMulticaseUI === 'function') {
            updateMulticaseUI();
        }
        
        if (typeof renderTestCases === 'function') {
            renderTestCases();
        }
        
        console.log('✅ Datos de sincronización aplicados');
        
    } catch (error) {
        console.error('❌ Error aplicando datos de sincronización:', error);
    }
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones globalmente
window.RealtimeSync = {
    init: initRealtimeSync,
    notifyCaseUpdated,
    notifyScenarioUpdated,
    notifyCaseCreated,
    notifyCaseDeleted,
    notifyRequirementUpdated,
    notifyUserActivity,
    isEnabled: () => isSyncEnabled,
    getCurrentUser: () => currentUser,
    requestFullSync,
    changeUser: (newUser) => {
        currentUser = newUser;
        sessionStorage.setItem('currentUser', newUser);
        console.log('👤 Usuario cambiado a:', newUser);
    },
    forceUIUpdate: () => {
        console.log('🔄 Forzando actualización de UI...');
        if (typeof window.renderTestCases === 'function') {
            window.renderTestCases();
            console.log('✅ renderTestCases ejecutado');
        }
        if (typeof window.updateAppStats === 'function') {
            window.updateAppStats();
            console.log('✅ updateAppStats ejecutado');
        }
        if (typeof window.applyFilters === 'function') {
            window.applyFilters();
            console.log('✅ applyFilters ejecutado');
        }
    },
    checkDataIntegrity: () => {
        console.log('🔍 Verificando integridad de datos...');
        console.log('📊 window.testCases:', window.testCases);
        console.log('📊 localStorage testCases:', localStorage.getItem('testCases'));
        console.log('📊 currentRequirement:', window.currentRequirement);
        console.log('📊 currentCaseId:', window.currentCaseId);
        
        // Verificar si hay datos en localStorage pero no en window
        const savedData = localStorage.getItem('testCases');
        if (savedData && (!window.testCases || window.testCases.length === 0)) {
            try {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData)) {
                    window.testCases = parsedData;
                    try { testCases = [...parsedData]; } catch(_) {}
                    console.log('🔄 Datos restaurados desde localStorage:', parsedData.length, 'escenarios');
                    return true;
                }
            } catch (error) {
                console.error('❌ Error parseando datos desde localStorage:', error);
            }
        }
        return false;
    },
    recoverData: () => {
        console.log('🔄 Recuperando datos manualmente...');
        try {
            const savedData = localStorage.getItem('testCases');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData)) {
                    window.testCases = parsedData;
                    try { testCases = [...parsedData]; } catch(_) {}
                    console.log('✅ Datos recuperados:', parsedData.length, 'escenarios');
                    
                    // Actualizar UI
                    if (typeof window.renderTestCases === 'function') {
                        window.renderTestCases();
                    }
                    if (typeof window.updateAppStats === 'function') {
                        window.updateAppStats();
                    }
                    
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Error recuperando datos:', error);
        }
        return false;
    }
};

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar sin bloquear: rápido si hay soporte, no crítico
    setTimeout(() => {
        try { initRealtimeSync(); } catch (e) { console.warn('⚠️ RealtimeSync init:', e); }
    }, 200);
});

// console.log('🔄 Realtime Sync cargado - Versión 20250113a');
