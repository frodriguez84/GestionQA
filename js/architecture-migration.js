// ===============================================
// ARCHITECTURE-MIGRATION.JS - Migración Arquitectónica
// VERSIÓN: 20250112a - Sistema de Migración Segura
// ===============================================

// Iniciando migración arquitectónica...

// ===============================================
// SISTEMA DE RESPALDO SEGURO
// ===============================================

/**
 * Crea un respaldo completo del estado actual
 */
function createArchitectureBackup() {
    const backup = {
        timestamp: new Date().toISOString(),
        version: 'pre-migration',
        
        // Respaldo de variables globales legacy
        legacy: {
            testCases: window.testCases ? [...window.testCases] : [],
            requirementInfo: window.requirementInfo ? {...window.requirementInfo} : {},
            inputVariableNames: window.inputVariableNames ? [...window.inputVariableNames] : [],
            filteredCases: window.filteredCases ? [...window.filteredCases] : []
        },
        
        // Respaldo del sistema multicaso
        multicase: {
            currentRequirement: window.currentRequirement ? JSON.parse(JSON.stringify(window.currentRequirement)) : null,
            currentCaseId: window.currentCaseId || null,
            multicaseMode: window.multicaseMode || false
        },
        
        // Respaldo del localStorage
        storage: {
            testCases: localStorage.getItem('testCases'),
            requirementInfo: localStorage.getItem('requirementInfo'),
            inputVariableNames: localStorage.getItem('inputVariableNames'),
            multicaseData: localStorage.getItem('multicaseData'),
            filteredCases: localStorage.getItem('filteredCases')
        }
    };
    
    // Guardar respaldo con manejo de errores
    try {
        localStorage.setItem('architectureBackup', JSON.stringify(backup));
        // Respaldo arquitectónico creado
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ localStorage lleno, saltando backup de arquitectura');
            // Limpiar datos antiguos para hacer espacio
            try {
                console.log('🧹 Limpiando datos antiguos para hacer espacio...');
                
                // Limpiar datos legacy
                localStorage.removeItem('legacyTestCases');
                localStorage.removeItem('legacyRequirementInfo');
                localStorage.removeItem('legacyInputVariableNames');
                localStorage.removeItem('architectureBackup');
                
                // Limpiar backups antiguos (más de 7 días)
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                const keysToRemove = [];
                
                for (let key in localStorage) {
                    if (key.startsWith('architecture_backup_')) {
                        const timestamp = parseInt(key.split('_')[2]);
                        if (timestamp < sevenDaysAgo) {
                            keysToRemove.push(key);
                        }
                    }
                }
                
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                if (keysToRemove.length > 0) {
                    console.log(`🗑️ ${keysToRemove.length} backups antiguos eliminados`);
                }
                
                // Intentar guardar de nuevo
                localStorage.setItem('architectureBackup', JSON.stringify(backup));
                console.log('✅ Backup de arquitectura creado exitosamente');
            } catch (retryError) {
                console.warn('⚠️ No se pudo crear backup, continuando sin respaldo');
            }
        } else {
            console.error('❌ Error guardando backup:', error);
        }
    }
    
    return backup;
}

/**
 * Restaura el estado desde un respaldo
 */
function restoreArchitectureBackup() {
    const backupData = localStorage.getItem('architectureBackup');
    if (!backupData) {
        console.error('❌ No se encontró respaldo arquitectónico');
        return false;
    }
    
    try {
        const backup = JSON.parse(backupData);
        // Restaurando desde respaldo
        
        // Restaurar variables globales
        window.testCases = backup.legacy.testCases;
        window.requirementInfo = backup.legacy.requirementInfo;
        window.inputVariableNames = backup.legacy.inputVariableNames;
        window.filteredCases = backup.legacy.filteredCases;
        
        // Restaurar sistema multicaso
        window.currentRequirement = backup.multicase.currentRequirement;
        window.currentCaseId = backup.multicase.currentCaseId;
        window.multicaseMode = backup.multicase.multicaseMode;
        
        // Restaurar localStorage
        Object.entries(backup.storage).forEach(([key, value]) => {
            if (value !== null) {
                localStorage.setItem(key, value);
            } else {
                localStorage.removeItem(key);
            }
        });
        
        // Estado restaurado exitosamente
        return true;
        
    } catch (error) {
        console.error('❌ Error restaurando respaldo:', error);
        return false;
    }
}

// ===============================================
// FUNCIONES DE MIGRACIÓN SEGURA
// ===============================================

/**
 * Migra datos legacy a estructura unificada
 */
function migrateLegacyToUnified() {
        // Iniciando migración legacy → unificado...
    
    try {
        // Crear respaldo antes de migrar
        createArchitectureBackup();
        
        // Si no hay requerimiento actual, crear uno
        if (!window.currentRequirement) {
            console.log('📋 Creando nuevo requerimiento...');
            window.currentRequirement = createEmptyRequirement();
        }
        
        // Migrar información del requerimiento
        if (window.requirementInfo && Object.keys(window.requirementInfo).length > 0) {
            window.currentRequirement.info = {
                ...window.currentRequirement.info,
                ...window.requirementInfo
            };
            console.log('✅ requirementInfo migrado');
        }
        
        // Si no hay caso actual, crear uno
        if (!window.currentCaseId || !window.currentRequirement.cases.find(c => c.id === window.currentCaseId)) {
            console.log('🚨 DEBUG architecture-migration.js - CREANDO CASO VACÍO');
            console.log('🚨 DEBUG architecture-migration.js - currentCaseId:', window.currentCaseId);
            console.log('🚨 DEBUG architecture-migration.js - cases.length:', window.currentRequirement.cases.length);
            const mainCase = createNewCase("Caso Principal", "Caso migrado desde sistema legacy", "1");
            window.currentRequirement.cases.push(mainCase);
            window.currentCaseId = mainCase.id;
        } else {
            console.log('✅ DEBUG architecture-migration.js - NO creando caso, ya existe');
        }
        
        // Obtener caso actual
        const currentCase = window.currentRequirement.cases.find(c => c.id === window.currentCaseId);
        if (!currentCase) {
            throw new Error('No se pudo encontrar el caso actual');
        }
        
        // Migrar escenarios
        if (window.testCases && window.testCases.length > 0) {
            currentCase.scenarios = [...window.testCases];
            console.log('✅ testCases migrados:', window.testCases.length, 'escenarios');
        }
        
        // Migrar variables de entrada
        if (window.inputVariableNames && window.inputVariableNames.length > 0) {
            currentCase.inputVariableNames = [...window.inputVariableNames];
            console.log('✅ inputVariableNames migrados:', window.inputVariableNames.length, 'variables');
        }
        
        // Actualizar estadísticas
        if (typeof updateMulticaseRequirementStats === 'function') {
            updateMulticaseRequirementStats(window.currentRequirement);
        }
        
        // Guardar datos unificados
        if (typeof saveMulticaseData === 'function') {
            saveMulticaseData();
        }
        
        // Migración legacy → unificado completada
        return true;
        
    } catch (error) {
        console.error('❌ Error en migración:', error);
        console.log('🔄 Restaurando desde respaldo...');
        restoreArchitectureBackup();
        return false;
    }
}

/**
 * Crea un requerimiento vacío
 */
function createEmptyRequirement() {
    return {
        id: `req_${Date.now()}`,
        version: "4.0-unified",
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
}

/**
 * Crea un nuevo caso
 */
function createNewCase(title = "Nuevo Caso", objective = "", caseNumber = "") {
    return {
        id: `case_${Date.now()}`,
        caseNumber: caseNumber,
        title: title,
        objective: objective,
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
}

// ===============================================
// FUNCIONES DE VALIDACIÓN
// ===============================================

/**
 * Valida que la migración fue exitosa
 */
function validateMigration() {
    console.log('🔍 Validando migración...');
    
    const issues = [];
    
    // Validar que existe requerimiento actual
    if (!window.currentRequirement) {
        issues.push('No hay requerimiento actual');
    } else {
        // Validar estructura del requerimiento
        if (!window.currentRequirement.id) issues.push('Requerimiento sin ID');
        if (!window.currentRequirement.info) issues.push('Requerimiento sin info');
        if (!Array.isArray(window.currentRequirement.cases)) issues.push('Requerimiento sin casos');
        
        // Validar caso actual
        if (!window.currentCaseId) {
            issues.push('No hay caso actual seleccionado');
        } else {
            const currentCase = window.currentRequirement.cases.find(c => c.id === window.currentCaseId);
            if (!currentCase) {
                issues.push('Caso actual no encontrado');
            } else {
                if (!Array.isArray(currentCase.scenarios)) issues.push('Caso sin escenarios');
                if (!Array.isArray(currentCase.inputVariableNames)) issues.push('Caso sin variables');
            }
        }
    }
    
    if (issues.length === 0) {
        console.log('✅ Migración validada exitosamente');
        return true;
    } else {
        console.error('❌ Problemas en migración:', issues);
        return false;
    }
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones globalmente para debugging
window.createArchitectureBackup = createArchitectureBackup;
window.restoreArchitectureBackup = restoreArchitectureBackup;
window.migrateLegacyToUnified = migrateLegacyToUnified;
window.validateMigration = validateMigration;

// Sistema de migración arquitectónica inicializado
