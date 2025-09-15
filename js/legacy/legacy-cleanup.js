// ===============================================
// LEGACY-CLEANUP.JS - Limpieza completa del sistema legacy
// ===============================================

/**
 * Migra TODOS los datos legacy al sistema multicaso
 * Esta función se ejecuta una sola vez para migrar completamente
 */
function migrateAllLegacyData() {
    console.log('🔄 Iniciando migración completa de datos legacy...');
    
    try {
        // Verificar si hay datos legacy
        const legacyTestCases = localStorage.getItem('testCases');
        const legacyRequirementInfo = localStorage.getItem('requirementInfo');
        const legacyInputVariableNames = localStorage.getItem('inputVariableNames');
        
        if (!legacyTestCases && !legacyRequirementInfo && !legacyInputVariableNames) {
            console.log('✅ No hay datos legacy para migrar');
            return true;
        }
        
        console.log('📦 Datos legacy encontrados, migrando...');
        
        // Crear un requerimiento temporal si no existe
        if (!currentRequirement) {
            const newRequirement = {
                id: 'req_' + Date.now() + '_legacy_migration',
                info: {
                    name: 'Migración Legacy',
                    description: 'Requerimiento migrado desde sistema legacy',
                    created: new Date().toISOString()
                },
                cases: [],
                _fromLegacy: true
            };
            
            // Crear caso temporal
            const newCase = {
                id: 'case_' + Date.now() + '_legacy_migration',
                caseNumber: 1,
                title: 'Caso Migrado',
                objective: 'Caso migrado desde sistema legacy',
                inputVariableNames: [],
                scenarios: []
            };
            
            newRequirement.cases.push(newCase);
            
            // Establecer como requerimiento actual
            window.currentRequirement = newRequirement;
            window.currentCaseId = newCase.id;
        }
        
        // Migrar datos
        if (legacyRequirementInfo) {
            try {
                const reqInfo = JSON.parse(legacyRequirementInfo);
                currentRequirement.info = { ...currentRequirement.info, ...reqInfo };
                console.log('✅ requirementInfo migrado');
            } catch (e) {
                console.error('Error migrando requirementInfo:', e);
            }
        }
        
        if (legacyTestCases) {
            try {
                const testCases = JSON.parse(legacyTestCases);
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    currentCase.scenarios = [...testCases];
                    console.log('✅ testCases migrados:', testCases.length, 'escenarios');
                }
            } catch (e) {
                console.error('Error migrando testCases:', e);
            }
        }
        
        if (legacyInputVariableNames) {
            try {
                const varNames = JSON.parse(legacyInputVariableNames);
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    currentCase.inputVariableNames = [...varNames];
                    console.log('✅ inputVariableNames migrados:', varNames.length, 'variables');
                }
            } catch (e) {
                console.error('Error migrando inputVariableNames:', e);
            }
        }
        
        // Guardar en el sistema multicaso
        if (typeof saveMulticaseData === 'function') {
            saveMulticaseData();
            console.log('✅ Datos guardados en sistema multicaso');
        }
        
        // Limpiar datos legacy
        localStorage.removeItem('testCases');
        localStorage.removeItem('requirementInfo');
        localStorage.removeItem('inputVariableNames');
        
        console.log('✅ Migración completada, datos legacy eliminados');
        return true;
        
    } catch (error) {
        console.error('❌ Error en migración legacy:', error);
        return false;
    }
}

/**
 * Verifica si el sistema legacy está completamente migrado
 */
function isLegacySystemCleaned() {
    const legacyTestCases = localStorage.getItem('testCases');
    const legacyRequirementInfo = localStorage.getItem('requirementInfo');
    const legacyInputVariableNames = localStorage.getItem('inputVariableNames');
    
    return !legacyTestCases && !legacyRequirementInfo && !legacyInputVariableNames;
}

/**
 * Función para desactivar completamente el sistema legacy
 */
function disableLegacySystem() {
    console.log('🚫 Desactivando sistema legacy...');
    
    // Marcar que el sistema legacy está desactivado
    localStorage.setItem('legacySystemDisabled', 'true');
    
    // Limpiar cualquier referencia legacy restante
    if (window.legacyProxiesInitialized) {
        window.legacyProxiesInitialized = false;
    }
    
    console.log('✅ Sistema legacy desactivado');
}

/**
 * Función para verificar si el sistema legacy está desactivado
 */
function isLegacySystemDisabled() {
    return localStorage.getItem('legacySystemDisabled') === 'true';
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.migrateAllLegacyData = migrateAllLegacyData;
window.isLegacySystemCleaned = isLegacySystemCleaned;
window.disableLegacySystem = disableLegacySystem;
window.isLegacySystemDisabled = isLegacySystemDisabled;
