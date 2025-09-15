// ===============================================
// LEGACY-ADAPTER.JS - Adaptador para eliminar sistema legacy
// ===============================================

// ===============================================
// PROXIES PARA VARIABLES LEGACY
// ===============================================

/**
 * Proxy para testCases - Redirige al sistema multicaso
 */
function createTestCasesProxy() {
    return new Proxy([], {
        get(target, prop) {
            // Si hay caso activo, devolver sus escenarios
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase && currentCase.scenarios) {
                    return currentCase.scenarios[prop];
                }
            }
            return target[prop];
        },
        
        set(target, prop, value) {
            // Actualizar en el sistema multicaso
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    if (!currentCase.scenarios) currentCase.scenarios = [];
                    currentCase.scenarios[prop] = value;
                    updateCaseStats(currentCase);
                    saveMulticaseData();
                }
            }
            return true;
        },
        
        has(target, prop) {
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                return currentCase && currentCase.scenarios && prop in currentCase.scenarios;
            }
            return prop in target;
        },
        
        ownKeys(target) {
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase && currentCase.scenarios) {
                    return Object.keys(currentCase.scenarios);
                }
            }
            return Object.keys(target);
        },
        
        getOwnPropertyDescriptor(target, prop) {
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase && currentCase.scenarios && prop in currentCase.scenarios) {
                    return {
                        enumerable: true,
                        configurable: true,
                        value: currentCase.scenarios[prop]
                    };
                }
            }
            return Object.getOwnPropertyDescriptor(target, prop);
        }
    });
}

/**
 * Proxy para requirementInfo - Redirige al sistema multicaso
 */
function createRequirementInfoProxy() {
    return new Proxy({}, {
        get(target, prop) {
            if (currentRequirement && currentRequirement.info) {
                return currentRequirement.info[prop];
            }
            return target[prop];
        },
        
        set(target, prop, value) {
            if (currentRequirement) {
                if (!currentRequirement.info) currentRequirement.info = {};
                currentRequirement.info[prop] = value;
                currentRequirement.updatedAt = new Date().toISOString();
                saveMulticaseData();
            }
            return true;
        },
        
        has(target, prop) {
            return currentRequirement && currentRequirement.info && prop in currentRequirement.info;
        },
        
        ownKeys(target) {
            if (currentRequirement && currentRequirement.info) {
                return Object.keys(currentRequirement.info);
            }
            return Object.keys(target);
        }
    });
}

/**
 * Proxy para inputVariableNames - Redirige al caso activo
 */
function createInputVariableNamesProxy() {
    return new Proxy([], {
        get(target, prop) {
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase && currentCase.inputVariableNames) {
                    return currentCase.inputVariableNames[prop];
                }
            }
            return target[prop];
        },
        
        set(target, prop, value) {
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    if (!currentCase.inputVariableNames) currentCase.inputVariableNames = [];
                    currentCase.inputVariableNames[prop] = value;
                    currentCase.updatedAt = new Date().toISOString();
                    saveMulticaseData();
                }
            }
            return true;
        },
        
        has(target, prop) {
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                return currentCase && currentCase.inputVariableNames && prop in currentCase.inputVariableNames;
            }
            return prop in target;
        }
    });
}

/**
 * Proxy para filteredCases - Calculado dinámicamente
 */
function createFilteredCasesProxy() {
    return new Proxy([], {
        get(target, prop) {
            // Obtener casos filtrados del caso activo
            if (currentRequirement && currentCaseId) {
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase && currentCase.scenarios) {
                    // Aplicar filtros si existen
                    return getFilteredScenarios(currentCase.scenarios)[prop];
                }
            }
            return target[prop];
        },
        
        set(target, prop, value) {
            // No permitir escritura directa - se maneja a través de testCases
            console.warn('⚠️ filteredCases es de solo lectura. Use testCases para modificar.');
            return false;
        }
    });
}

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

/**
 * Obtiene escenarios filtrados del caso activo
 */
function getFilteredScenarios(scenarios) {
    // Aquí aplicarías la misma lógica de filtros que tienes en applyFilters()
    // Por ahora devuelve todos los escenarios
    return scenarios || [];
}

/**
 * Inicializa todos los proxies
 */
function initializeLegacyProxies() {
    // console.log('🔄 Inicializando proxies legacy...');
    
    // Reemplazar variables globales con proxies
    window.testCases = createTestCasesProxy();
    window.requirementInfo = createRequirementInfoProxy();
    window.inputVariableNames = createInputVariableNamesProxy();
    window.filteredCases = createFilteredCasesProxy();
    
    // console.log('✅ Proxies legacy inicializados');
}

/**
 * Sincroniza datos legacy con multicaso (una sola vez)
 */
function syncLegacyToMulticase() {
    console.log('🔄 Migrando completamente del sistema legacy al multicaso...');
    
    // Verificar si hay datos legacy
    const legacyTestCases = localStorage.getItem('testCases');
    const legacyRequirementInfo = localStorage.getItem('requirementInfo');
    const legacyInputVariableNames = localStorage.getItem('inputVariableNames');
    
    if (!legacyTestCases && !legacyRequirementInfo && !legacyInputVariableNames) {
        console.log('✅ No hay datos legacy para migrar');
        return;
    }
    
    console.log('📦 Datos legacy encontrados, migrando completamente...');
    
    // Crear requerimiento desde datos legacy si no existe uno activo
    if (!currentRequirement) {
        const newRequirement = {
            id: 'req_' + Date.now() + '_legacy_migration',
            info: {
                name: 'Requerimiento Migrado',
                description: 'Migrado desde sistema legacy',
                created: new Date().toISOString()
            },
            cases: [],
            _fromLegacy: true
        };
        
        // Crear caso desde datos legacy
        const newCase = {
            id: 'case_' + Date.now() + '_legacy_migration',
            caseNumber: 1,
            title: 'Caso Principal',
            objective: 'Caso migrado desde sistema legacy',
            inputVariableNames: [],
            scenarios: []
        };
        
        // Migrar datos (usando descompresión automática)
        if (legacyRequirementInfo) {
            try {
                const reqInfo = decompressData(legacyRequirementInfo);
                newRequirement.info = { ...newRequirement.info, ...reqInfo };
                console.log('✅ requirementInfo migrado');
            } catch (e) {
                console.error('Error migrando requirementInfo:', e);
            }
        }
        
        if (legacyInputVariableNames) {
            try {
                newCase.inputVariableNames = decompressData(legacyInputVariableNames);
                console.log('✅ inputVariableNames migrados');
            } catch (e) {
                console.error('Error migrando inputVariableNames:', e);
            }
        }
        
        if (legacyTestCases) {
            try {
                newCase.scenarios = decompressData(legacyTestCases);
                console.log('✅ testCases migrados:', newCase.scenarios.length, 'escenarios');
            } catch (e) {
                console.error('Error migrando testCases:', e);
            }
        }
        
        newRequirement.cases.push(newCase);
        
        // Establecer como requerimiento actual
        window.currentRequirement = newRequirement;
        window.currentCaseId = newCase.id;
        
        // Guardar en sistema multicaso
        if (typeof saveMulticaseData === 'function') {
            saveMulticaseData();
            console.log('✅ Requerimiento guardado en sistema multicaso');
        }
    } else {
        // Si ya hay un requerimiento activo, migrar a él
        console.log('⚠️ Ya hay requerimiento activo, migrando datos a él...');
        
        if (legacyRequirementInfo) {
            try {
                const reqInfo = decompressData(legacyRequirementInfo);
                currentRequirement.info = { ...currentRequirement.info, ...reqInfo };
            } catch (e) {
                console.error('Error migrando requirementInfo:', e);
            }
        }
        
        if (legacyTestCases) {
            try {
                const testCases = decompressData(legacyTestCases);
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    currentCase.scenarios = [...testCases];
                    updateCaseStats(currentCase);
                }
            } catch (e) {
                console.error('Error migrando testCases:', e);
            }
        }
        
        if (legacyInputVariableNames) {
            try {
                const varNames = decompressData(legacyInputVariableNames);
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    currentCase.inputVariableNames = [...varNames];
                }
            } catch (e) {
                console.error('Error migrando inputVariableNames:', e);
            }
        }
        
        saveMulticaseData();
    }
    
    // ELIMINAR COMPLETAMENTE datos legacy
    localStorage.removeItem('testCases');
    localStorage.removeItem('requirementInfo');
    localStorage.removeItem('inputVariableNames');
    
    // Marcar que el sistema legacy está completamente migrado
    localStorage.setItem('legacyMigrationComplete', 'true');
    
    console.log('✅ Migración completa finalizada, sistema legacy eliminado');
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.initializeLegacyProxies = initializeLegacyProxies;
window.syncLegacyToMulticase = syncLegacyToMulticase;
window.createTestCasesProxy = createTestCasesProxy;
window.createRequirementInfoProxy = createRequirementInfoProxy;
window.createInputVariableNamesProxy = createInputVariableNamesProxy;
window.createFilteredCasesProxy = createFilteredCasesProxy;
