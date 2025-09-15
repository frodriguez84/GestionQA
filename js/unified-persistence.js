// ===============================================
// UNIFIED-PERSISTENCE.JS - Persistencia Unificada
// VERSIÓN: 20250112a - Una sola clave en localStorage
// ===============================================

// Inicializando sistema de persistencia unificado...

// ===============================================
// SISTEMA DE PERSISTENCIA UNIFICADO
// ===============================================

window.GestorCP = window.GestorCP || {};
window.GestorCP.Storage = {
    
    // Clave única para toda la aplicación
    STORAGE_KEY: 'gestorcp_unified_data',
    
    // ===============================================
    // FUNCIONES DE GUARDADO
    // ===============================================
    
    /**
     * Guarda todos los datos de la aplicación en una sola clave
     */
    save() {
        try {
            // Guardando datos unificados...
            
            const dataToSave = {
                version: '4.0-unified',
                timestamp: new Date().toISOString(),
                
                // Datos principales
                currentRequirement: window.currentRequirement,
                currentCaseId: window.currentCaseId,
                multicaseMode: window.multicaseMode || true,
                
                // Configuración de la aplicación
                config: {
                    theme: localStorage.getItem('theme') || 'dark',
                    showHidden: localStorage.getItem('showHidden') === 'true',
                    autoSave: localStorage.getItem('autoSave') !== 'false'
                },
                
                // Metadatos
                metadata: {
                    lastSave: new Date().toISOString(),
                    totalSaves: parseInt(localStorage.getItem('totalSaves') || '0') + 1,
                    appVersion: '4.0-unified'
                }
            };
            
            // Usar la función de compresión de utils.js si está disponible
            if (typeof saveData === 'function') {
                const success = saveData(this.STORAGE_KEY, dataToSave);
                if (success) {
                    localStorage.setItem('totalSaves', dataToSave.metadata.totalSaves.toString());
                    return true;
                }
            } else {
                // Fallback: guardar sin compresión
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
                localStorage.setItem('totalSaves', dataToSave.metadata.totalSaves.toString());
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error guardando datos unificados:', error);
            return false;
        }
    },
    
    /**
     * Carga todos los datos de la aplicación desde una sola clave
     */
    load() {
        try {
            // Cargando datos unificados...
            
            // Usar la función de carga de utils.js si está disponible
            let data;
            if (typeof loadData === 'function') {
                data = loadData(this.STORAGE_KEY);
            } else {
                // Fallback: cargar sin descompresión
                const rawData = localStorage.getItem(this.STORAGE_KEY);
                data = rawData ? JSON.parse(rawData) : null;
            }
            
            if (!data) {
                return this.createInitialStructure();
            }
            
            // Verificar versión
            if (data.version !== '4.0-unified') {
                return this.migrateFromPreviousVersion(data);
            }
            
            // Restaurar datos principales
            window.currentRequirement = data.currentRequirement;
            window.currentCaseId = data.currentCaseId;
            window.multicaseMode = data.multicaseMode !== false; // Default a true
            
            // Restaurar configuración
            if (data.config) {
                Object.entries(data.config).forEach(([key, value]) => {
                    localStorage.setItem(key, value.toString());
                });
            }
            
            // Datos unificados cargados exitosamente
            
            return true;
            
        } catch (error) {
            console.error('❌ Error cargando datos unificados:', error);
            return false;
        }
    },
    
    /**
     * Crea una estructura inicial si no hay datos
     */
    createInitialStructure() {
        console.log('🆕 Creando estructura inicial...');
        
        // Crear requerimiento inicial
        window.currentRequirement = {
            id: `req_${Date.now()}`,
            version: '4.0-unified',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            info: {
                number: '',
                name: '',
                description: '',
                tester: '',
                startDate: '',
                status: 'active'
            },
            
            cases: [],
            
            stats: {
                totalCases: 0,
                totalScenarios: 0,
                totalHours: 0,
                totalOK: 0,
                totalNO: 0,
                totalPending: 0,
                successRate: 0
            }
        };
        
        // Crear caso inicial
        const initialCase = {
            id: `case_${Date.now()}`,
            caseNumber: '1',
            title: 'Caso Principal',
            objective: 'Caso inicial del sistema',
            prerequisites: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            
            scenarios: [],
            inputVariableNames: ['Variable 1', 'Variable 2'],
            
            stats: {
                totalScenarios: 0,
                totalHours: 0,
                totalOK: 0,
                totalNO: 0,
                totalPending: 0,
                successRate: 0
            }
        };
        
        window.currentRequirement.cases.push(initialCase);
        window.currentCaseId = initialCase.id;
        window.multicaseMode = true;
        
        // Guardar estructura inicial
        this.save();
        
        console.log('✅ Estructura inicial creada y guardada');
        return true;
    },
    
    /**
     * Migra datos de versiones anteriores
     */
    migrateFromPreviousVersion(oldData) {
        console.log('🔄 Migrando desde versión anterior...');
        
        try {
            // Crear nueva estructura
            this.createInitialStructure();
            
            // Migrar datos si existen
            if (oldData.currentRequirement) {
                window.currentRequirement = oldData.currentRequirement;
                console.log('✅ Requerimiento migrado');
            }
            
            if (oldData.currentCaseId) {
                window.currentCaseId = oldData.currentCaseId;
                console.log('✅ Caso actual migrado');
            }
            
            // Guardar datos migrados
            this.save();
            
            console.log('✅ Migración completada');
            return true;
            
        } catch (error) {
            console.error('❌ Error en migración:', error);
            return false;
        }
    },
    
    /**
     * Limpia datos legacy del localStorage
     */
    cleanupLegacyData() {
        console.log('🧹 Limpiando datos legacy...');
        
        const legacyKeys = [
            'testCases',
            'requirementInfo', 
            'inputVariableNames',
            'filteredCases',
            'multicaseData'
        ];
        
        let cleaned = 0;
        legacyKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                cleaned++;
                console.log(`🗑️ Eliminado: ${key}`);
            }
        });
        
        console.log(`✅ Limpieza completada: ${cleaned} claves eliminadas`);
        return cleaned;
    },
    
    /**
     * Obtiene información del almacenamiento
     */
    getStorageInfo() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        const size = data ? new Blob([data]).size : 0;
        const totalSaves = parseInt(localStorage.getItem('totalSaves') || '0');
        
        return {
            hasData: !!data,
            size: size,
            sizeFormatted: this.formatBytes(size),
            totalSaves: totalSaves,
            lastSave: data ? JSON.parse(data).metadata?.lastSave : null
        };
    },
    
    /**
     * Formatea bytes en formato legible
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// ===============================================
// INTEGRACIÓN CON SISTEMA UNIFICADO
// ===============================================

/**
 * Integra el sistema de persistencia con el sistema unificado
 */
function integrateUnifiedPersistence() {
    // Integrando persistencia unificada...
    
    if (window.GestorCP && window.GestorCP.Data) {
        // Sobrescribir el método _triggerDataChange para usar persistencia unificada
        const originalTriggerDataChange = window.GestorCP.Data._triggerDataChange;
        
        window.GestorCP.Data._triggerDataChange = function(type) {
            // Llamar método original
            if (originalTriggerDataChange) {
                originalTriggerDataChange.call(this, type);
            }
            
            // Guardar usando persistencia unificada
            if (window.GestorCP && window.GestorCP.Storage) {
                window.GestorCP.Storage.save();
            }
        };
        
        // Persistencia unificada integrada
        return true;
    }
    
    return false;
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones globalmente
window.saveUnifiedData = () => window.GestorCP.Storage.save();
window.loadUnifiedData = () => window.GestorCP.Storage.load();
window.cleanupLegacyStorage = () => window.GestorCP.Storage.cleanupLegacyData();
window.getStorageInfo = () => window.GestorCP.Storage.getStorageInfo();

// ===============================================
// INICIALIZACIÓN AUTOMÁTICA
// ===============================================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        integrateUnifiedPersistence();
    });
} else {
    // DOM ya está listo
    integrateUnifiedPersistence();
}

// Sistema de persistencia unificado cargado
