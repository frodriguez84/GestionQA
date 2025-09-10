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
    console.log('🔄 Inicializando proxies legacy...');
    
    // Reemplazar variables globales con proxies
    window.testCases = createTestCasesProxy();
    window.requirementInfo = createRequirementInfoProxy();
    window.inputVariableNames = createInputVariableNamesProxy();
    window.filteredCases = createFilteredCasesProxy();
    
    console.log('✅ Proxies legacy inicializados');
}

/**
 * Sincroniza datos legacy con multicaso (una sola vez)
 */
function syncLegacyToMulticase() {
    if (!currentRequirement) {
        console.log('⚠️ No hay requerimiento multicaso activo');
        return;
    }
    
    console.log('🔄 Sincronizando datos legacy con multicaso...');
    
    // Si hay datos legacy en localStorage, migrarlos
    const legacyTestCases = localStorage.getItem('testCases');
    const legacyRequirementInfo = localStorage.getItem('requirementInfo');
    const legacyInputVariableNames = localStorage.getItem('inputVariableNames');
    
    if (legacyTestCases || legacyRequirementInfo || legacyInputVariableNames) {
        console.log('📦 Datos legacy encontrados, migrando...');
        
        // CRÍTICO: Solo migrar si el requerimiento actual NO viene del dashboard
        const isFromDashboard = currentRequirement._fromDashboard === true;
        
        if (isFromDashboard) {
            console.log('⚠️ Requerimiento viene del dashboard, NO migrando datos legacy');
            console.log('🧹 Limpiando datos legacy sin migrar...');
            
            // Solo limpiar datos legacy sin migrar
            localStorage.removeItem('testCases');
            localStorage.removeItem('requirementInfo');
            localStorage.removeItem('inputVariableNames');
            
            console.log('✅ Datos legacy limpiados (sin migración)');
            return;
        }
        
        // Migrar requirementInfo solo si no viene del dashboard
        if (legacyRequirementInfo) {
            try {
                const reqInfo = JSON.parse(legacyRequirementInfo);
                currentRequirement.info = { ...currentRequirement.info, ...reqInfo };
            } catch (e) {
                console.error('Error migrando requirementInfo:', e);
            }
        }
        
        // Migrar testCases al caso activo
        if (legacyTestCases && currentCaseId) {
            try {
                const testCases = JSON.parse(legacyTestCases);
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    currentCase.scenarios = [...testCases];
                    updateCaseStats(currentCase);
                }
            } catch (e) {
                console.error('Error migrando testCases:', e);
            }
        }
        
        // Migrar inputVariableNames
        if (legacyInputVariableNames && currentCaseId) {
            try {
                const varNames = JSON.parse(legacyInputVariableNames);
                const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
                if (currentCase) {
                    currentCase.inputVariableNames = [...varNames];
                }
            } catch (e) {
                console.error('Error migrando inputVariableNames:', e);
            }
        }
        
        // Guardar cambios
        saveMulticaseData();
        
        // Limpiar datos legacy
        localStorage.removeItem('testCases');
        localStorage.removeItem('requirementInfo');
        localStorage.removeItem('inputVariableNames');
        
        console.log('✅ Migración completada, datos legacy eliminados');
    }
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
