// ===============================================
// LEGACY-CLEANUP-FINAL.JS - Limpieza Final Legacy
// VERSIÓN: 20250112a - Eliminación Completa del Sistema Legacy
// ===============================================

// Iniciando limpieza final del sistema legacy...

// ===============================================
// FUNCIONES DE LIMPIEZA FINAL
// ===============================================

/**
 * Elimina completamente el sistema legacy
 */
function performFinalLegacyCleanup() {
    console.log('🧹 === LIMPIEZA FINAL DEL SISTEMA LEGACY ===');
    
    try {
        // Paso 1: Verificar que el sistema unificado funciona
        if (!window.GestorCP || !window.GestorCP.Data) {
            console.error('❌ Sistema unificado no disponible, abortando limpieza');
            return false;
        }
        
        // Paso 2: Crear respaldo final
        console.log('💾 Creando respaldo final...');
        if (typeof createArchitectureBackup === 'function') {
            createArchitectureBackup();
        }
        
        // Paso 3: Limpiar localStorage
        console.log('🗑️ Limpiando localStorage legacy...');
        if (window.GestorCP.Storage && typeof window.GestorCP.Storage.cleanupLegacyData === 'function') {
            window.GestorCP.Storage.cleanupLegacyData();
        }
        
        // Paso 4: Eliminar variables globales legacy
        console.log('🧹 Eliminando variables globales legacy...');
        cleanupGlobalVariables();
        
        // Paso 5: Desactivar funciones legacy
        console.log('🔌 Desactivando funciones legacy...');
        disableLegacyFunctions();
        
        // Paso 6: Validar que todo funciona
        console.log('✅ Validando funcionamiento...');
        const isValid = validateUnifiedSystem();
        
        if (isValid) {
            console.log('🎉 Limpieza final completada exitosamente');
            
            // Marcar como completada
            localStorage.setItem('legacyCleanupCompleted', new Date().toISOString());
            localStorage.setItem('appVersion', '4.0-unified');
            
            return true;
        } else {
            console.error('❌ Validación falló, restaurando respaldo...');
            if (typeof restoreArchitectureBackup === 'function') {
                restoreArchitectureBackup();
            }
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en limpieza final:', error);
        
        // Restaurar respaldo en caso de error
        if (typeof restoreArchitectureBackup === 'function') {
            console.log('🔄 Restaurando desde respaldo...');
            restoreArchitectureBackup();
        }
        
        return false;
    }
}

/**
 * Limpia variables globales legacy
 */
function cleanupGlobalVariables() {
    const legacyVars = [
        'testCases',
        'requirementInfo',
        'inputVariableNames',
        'filteredCases'
    ];
    
    legacyVars.forEach(varName => {
        if (window.hasOwnProperty(varName)) {
            try {
                delete window[varName];
                console.log(`🗑️ Variable global eliminada: ${varName}`);
            } catch (e) {
                console.warn(`⚠️ No se pudo eliminar ${varName}:`, e.message);
            }
        }
    });
}

/**
 * Desactiva funciones legacy
 */
function disableLegacyFunctions() {
    const legacyFunctions = [
        'initializeLegacyProxies',
        'syncLegacyToMulticase',
        'migrateToMulticase'
    ];
    
    legacyFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            window[funcName] = function() {
                console.warn(`⚠️ Función legacy desactivada: ${funcName}`);
                return false;
            };
            console.log(`🔌 Función legacy desactivada: ${funcName}`);
        }
    });
}

/**
 * Valida que el sistema unificado funciona correctamente
 */
function validateUnifiedSystem() {
    console.log('🔍 Validando sistema unificado...');
    
    const validations = [];
    
    // Validación 1: Sistema unificado disponible
    validations.push({
        name: 'Sistema unificado disponible',
        test: () => window.GestorCP && window.GestorCP.Data,
        result: !!(window.GestorCP && window.GestorCP.Data)
    });
    
    // Validación 2: Getters funcionan
    if (window.GestorCP && window.GestorCP.Data) {
        validations.push({
            name: 'Getters funcionan',
            test: () => {
                const scenarios = window.GestorCP.Data.getScenarios();
                const reqInfo = window.GestorCP.Data.getRequirementInfo();
                const inputVars = window.GestorCP.Data.getInputVariables();
                return Array.isArray(scenarios) && typeof reqInfo === 'object' && Array.isArray(inputVars);
            },
            result: (() => {
                const scenarios = window.GestorCP.Data.getScenarios();
                const reqInfo = window.GestorCP.Data.getRequirementInfo();
                const inputVars = window.GestorCP.Data.getInputVariables();
                return Array.isArray(scenarios) && typeof reqInfo === 'object' && Array.isArray(inputVars);
            })()
        });
    }
    
    // Validación 3: Persistencia funciona
    if (window.GestorCP && window.GestorCP.Storage) {
        validations.push({
            name: 'Persistencia funciona',
            test: () => typeof window.GestorCP.Storage.save === 'function' && typeof window.GestorCP.Storage.load === 'function',
            result: typeof window.GestorCP.Storage.save === 'function' && typeof window.GestorCP.Storage.load === 'function'
        });
    }
    
    // Validación 4: Variables legacy no existen
    const legacyVars = ['testCases', 'requirementInfo', 'inputVariableNames', 'filteredCases'];
    const legacyVarsExist = legacyVars.some(varName => window.hasOwnProperty(varName));
    
    validations.push({
        name: 'Variables legacy eliminadas',
        test: () => !legacyVarsExist,
        result: !legacyVarsExist
    });
    
    // Mostrar resultados
    console.log('📊 === RESULTADOS DE VALIDACIÓN ===');
    let passed = 0;
    let failed = 0;
    
    validations.forEach(validation => {
        const status = validation.result ? '✅' : '❌';
        console.log(`${status} ${validation.name}: ${validation.result ? 'PASÓ' : 'FALLÓ'}`);
        
        if (validation.result) {
            passed++;
        } else {
            failed++;
        }
    });
    
    console.log(`📈 Resumen: ${passed} pasaron, ${failed} fallaron`);
    
    return failed === 0;
}

/**
 * Verifica si la limpieza ya fue completada
 */
function isLegacyCleanupCompleted() {
    return localStorage.getItem('legacyCleanupCompleted') !== null;
}

/**
 * Obtiene información del estado de la migración
 */
function getMigrationStatus() {
    return {
        legacyCleanupCompleted: isLegacyCleanupCompleted(),
        appVersion: localStorage.getItem('appVersion') || 'unknown',
        lastCleanup: localStorage.getItem('legacyCleanupCompleted'),
        hasUnifiedSystem: !!(window.GestorCP && window.GestorCP.Data),
        hasUnifiedStorage: !!(window.GestorCP && window.GestorCP.Storage),
        storageInfo: window.GestorCP && window.GestorCP.Storage ? window.GestorCP.Storage.getStorageInfo() : null
    };
}

// ===============================================
// FUNCIONES DE MANTENIMIENTO
// ===============================================

/**
 * Optimiza el almacenamiento después de la migración
 */
function optimizeStorageAfterMigration() {
    console.log('🔧 Optimizando almacenamiento...');
    
    try {
        // Limpiar respaldos antiguos (mantener solo el último)
        const backupData = localStorage.getItem('architectureBackup');
        if (backupData) {
            // Crear respaldo optimizado
            const backup = JSON.parse(backupData);
            backup.optimized = true;
            backup.optimizationDate = new Date().toISOString();
            
            localStorage.setItem('architectureBackup', JSON.stringify(backup));
            console.log('✅ Respaldo optimizado');
        }
        
        // Limpiar metadatos innecesarios
        const keysToClean = [
            'totalSaves',
            'legacyMigrationAttempts',
            'multicaseMigrationStatus'
        ];
        
        keysToClean.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`🗑️ Metadato eliminado: ${key}`);
            }
        });
        
        console.log('✅ Optimización de almacenamiento completada');
        return true;
        
    } catch (error) {
        console.error('❌ Error optimizando almacenamiento:', error);
        return false;
    }
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones globalmente
window.performFinalLegacyCleanup = performFinalLegacyCleanup;
window.isLegacyCleanupCompleted = isLegacyCleanupCompleted;
window.getMigrationStatus = getMigrationStatus;
window.optimizeStorageAfterMigration = optimizeStorageAfterMigration;

// ===============================================
// EJECUCIÓN AUTOMÁTICA
// ===============================================

// Verificar si necesita limpieza automática
setTimeout(() => {
    if (!isLegacyCleanupCompleted() && window.GestorCP && window.GestorCP.Data) {
        console.log('🔄 Sistema unificado detectado, verificando necesidad de limpieza...');
        
        // Verificar si hay variables legacy
        const hasLegacyVars = ['testCases', 'requirementInfo', 'inputVariableNames', 'filteredCases']
            .some(varName => window.hasOwnProperty(varName));
        
        if (hasLegacyVars) {
            console.log('🧹 Variables legacy detectadas, ejecutando limpieza automática...');
            performFinalLegacyCleanup();
        } else {
            console.log('✅ No se detectaron variables legacy, marcando limpieza como completada');
            localStorage.setItem('legacyCleanupCompleted', new Date().toISOString());
            localStorage.setItem('appVersion', '4.0-unified');
        }
    }
}, 3000);

// Sistema de limpieza final legacy cargado
