// ===============================================
// UNIFIED-DATA-SYSTEM.JS - Sistema Unificado de Datos
// VERSIÓN: 20250112a - Reemplaza variables globales legacy
// ===============================================

// Inicializando sistema unificado de datos...

// ===============================================
// SISTEMA UNIFICADO CENTRAL
// ===============================================

/**
 * Sistema unificado que reemplaza todas las variables globales legacy
 */
window.GestorCP = window.GestorCP || {};
window.GestorCP.Data = {
    
    // ===============================================
    // GETTERS UNIFICADOS (Reemplazan variables legacy)
    // ===============================================
    
    /**
     * Obtiene los escenarios del caso actual
     * Reemplaza: window.testCases
     */
    getScenarios() {
        const currentCase = this.getCurrentCase();
        return currentCase ? currentCase.scenarios || [] : [];
    },
    
    /**
     * Obtiene la información del requerimiento
     * Reemplaza: window.requirementInfo
     */
    getRequirementInfo() {
        return window.currentRequirement ? window.currentRequirement.info || {} : {};
    },
    
    /**
     * Obtiene las variables de entrada del caso actual
     * Reemplaza: window.inputVariableNames
     */
    getInputVariables() {
        const currentCase = this.getCurrentCase();
        return currentCase ? currentCase.inputVariableNames || ['Variable 1', 'Variable 2'] : ['Variable 1', 'Variable 2'];
    },
    
    /**
     * Obtiene los casos filtrados
     * Reemplaza: window.filteredCases
     */
    getFilteredScenarios() {
        // Por ahora retorna los escenarios normales, después se implementará filtrado
        return this.getScenarios();
    },
    
    /**
     * Obtiene el caso actualmente seleccionado
     */
    getCurrentCase() {
        if (!window.currentRequirement || !window.currentCaseId) {
            return null;
        }
        
        return window.currentRequirement.cases.find(c => c.id === window.currentCaseId);
    },
    
    /**
     * Obtiene el requerimiento actual
     */
    getCurrentRequirement() {
        return window.currentRequirement;
    },
    
    // ===============================================
    // SETTERS UNIFICADOS (Reemplazan asignaciones legacy)
    // ===============================================
    
    /**
     * Establece los escenarios del caso actual
     * Reemplaza: window.testCases = [...]
     */
    setScenarios(scenarios) {
        const currentCase = this.getCurrentCase();
        if (currentCase) {
            currentCase.scenarios = Array.isArray(scenarios) ? [...scenarios] : [];
            this._updateCaseStats(currentCase);
            this._triggerDataChange('scenarios');
        }
    },
    
    /**
     * Establece la información del requerimiento
     * Reemplaza: window.requirementInfo = {...}
     */
    setRequirementInfo(info) {
        if (window.currentRequirement) {
            window.currentRequirement.info = { ...window.currentRequirement.info, ...info };
            this._triggerDataChange('requirementInfo');
        }
    },
    
    /**
     * Establece las variables de entrada del caso actual
     * Reemplaza: window.inputVariableNames = [...]
     */
    setInputVariables(variables) {
        const currentCase = this.getCurrentCase();
        if (currentCase) {
            currentCase.inputVariableNames = Array.isArray(variables) ? [...variables] : [];
            this._triggerDataChange('inputVariables');
        }
    },
    
    /**
     * Establece los casos filtrados
     * Reemplaza: window.filteredCases = [...]
     */
    setFilteredScenarios(filtered) {
        // Por ahora no hace nada, después se implementará filtrado
        this._triggerDataChange('filteredScenarios');
    },
    
    // ===============================================
    // FUNCIONES DE GESTIÓN DE CASOS
    // ===============================================
    
    /**
     * Cambia al caso especificado
     */
    switchToCase(caseId) {
        if (!window.currentRequirement) return false;
        
        const caseExists = window.currentRequirement.cases.find(c => c.id === caseId);
        if (caseExists) {
            window.currentCaseId = caseId;
            this._triggerDataChange('currentCase');
            return true;
        }
        
        return false;
    },
    
    /**
     * Agrega un nuevo escenario al caso actual
     */
    addScenario(scenario) {
        const currentCase = this.getCurrentCase();
        if (currentCase && scenario) {
            currentCase.scenarios.push({
                ...scenario,
                id: scenario.id || `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
            this._updateCaseStats(currentCase);
            this._triggerDataChange('scenarios');
            return true;
        }
        return false;
    },
    
    /**
     * Actualiza un escenario existente
     */
    updateScenario(scenarioId, updates) {
        const currentCase = this.getCurrentCase();
        if (currentCase) {
            const scenarioIndex = currentCase.scenarios.findIndex(s => s.id === scenarioId);
            if (scenarioIndex !== -1) {
                currentCase.scenarios[scenarioIndex] = {
                    ...currentCase.scenarios[scenarioIndex],
                    ...updates,
                    id: scenarioId // Mantener el ID original
                };
                this._updateCaseStats(currentCase);
                this._triggerDataChange('scenarios');
                return true;
            }
        }
        return false;
    },
    
    /**
     * Elimina un escenario
     */
    removeScenario(scenarioId) {
        const currentCase = this.getCurrentCase();
        if (currentCase) {
            const initialLength = currentCase.scenarios.length;
            currentCase.scenarios = currentCase.scenarios.filter(s => s.id !== scenarioId);
            
            if (currentCase.scenarios.length !== initialLength) {
                this._updateCaseStats(currentCase);
                this._triggerDataChange('scenarios');
                return true;
            }
        }
        return false;
    },
    
    // ===============================================
    // FUNCIONES INTERNAS
    // ===============================================
    
    /**
     * Actualiza las estadísticas de un caso
     */
    _updateCaseStats(caseObj) {
        if (!caseObj || !Array.isArray(caseObj.scenarios)) return;
        
        const scenarios = caseObj.scenarios;
        caseObj.stats = {
            totalScenarios: scenarios.length,
            totalHours: scenarios.reduce((sum, s) => sum + (s.testTime || 0), 0),
            totalOK: scenarios.filter(s => s.status === 'OK').length,
            totalNO: scenarios.filter(s => s.status === 'NO').length,
            totalPending: scenarios.filter(s => !s.status || s.status === '' || s.status === 'Pendiente').length,
            successRate: scenarios.length > 0 ? Math.round((scenarios.filter(s => s.status === 'OK').length / scenarios.length) * 100) : 0
        };
        
        // Actualizar estadísticas del requerimiento
        if (typeof updateMulticaseRequirementStats === 'function') {
            updateMulticaseRequirementStats(window.currentRequirement);
        }
    },
    
    /**
     * Dispara eventos cuando los datos cambian
     */
    _triggerDataChange(type) {
        // Guardar datos automáticamente
        if (typeof saveMulticaseData === 'function') {
            saveMulticaseData();
        }
        
        // Disparar evento personalizado para notificar cambios
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('dataChanged', {
                detail: { type, timestamp: new Date().toISOString() }
            }));
        }
        
        // Datos actualizados
    },
    
    // ===============================================
    // FUNCIONES DE COMPATIBILIDAD LEGACY
    // ===============================================
    
    /**
     * Inicializa el sistema unificado
     */
    initialize() {
        // Inicializando sistema unificado...
        
        // Si no hay requerimiento actual, crear uno básico
        if (!window.currentRequirement) {
            window.currentRequirement = {
                id: `req_${Date.now()}`,
                info: {
                    number: '',
                    name: '',
                    description: '',
                    tester: '',
                    startDate: ''
                },
                cases: []
            };
        }
        
        // Si no hay caso actual, crear uno
        if (!window.currentCaseId || !window.currentRequirement.cases.find(c => c.id === window.currentCaseId)) {
            const initialCase = {
                id: `case_${Date.now()}`,
                title: 'Caso Principal',
                objective: 'Caso inicial del sistema',
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
        }
        
        // Sistema unificado inicializado
        return true;
    }
};

// ===============================================
// PROXIES PARA COMPATIBILIDAD LEGACY
// ===============================================

/**
 * Crea proxies que mantienen compatibilidad con código legacy
 * pero redirigen al sistema unificado
 */
function createLegacyCompatibilityProxies() {
    // Creando proxies de compatibilidad legacy...
    
    // Proxy para testCases
    Object.defineProperty(window, 'testCases', {
        get: () => window.GestorCP.Data.getScenarios(),
        set: (value) => window.GestorCP.Data.setScenarios(value),
        enumerable: true,
        configurable: true
    });
    
    // Proxy para requirementInfo
    Object.defineProperty(window, 'requirementInfo', {
        get: () => window.GestorCP.Data.getRequirementInfo(),
        set: (value) => window.GestorCP.Data.setRequirementInfo(value),
        enumerable: true,
        configurable: true
    });
    
    // Proxy para inputVariableNames
    Object.defineProperty(window, 'inputVariableNames', {
        get: () => window.GestorCP.Data.getInputVariables(),
        set: (value) => window.GestorCP.Data.setInputVariables(value),
        enumerable: true,
        configurable: true
    });
    
    // Proxy para filteredCases
    Object.defineProperty(window, 'filteredCases', {
        get: () => window.GestorCP.Data.getFilteredScenarios(),
        set: (value) => window.GestorCP.Data.setFilteredScenarios(value),
        enumerable: true,
        configurable: true
    });
    
    // Proxies de compatibilidad creados
}

// ===============================================
// INICIALIZACIÓN AUTOMÁTICA
// ===============================================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        window.GestorCP.Data.initialize();
        createLegacyCompatibilityProxies();
    });
} else {
    // DOM ya está listo
    window.GestorCP.Data.initialize();
    createLegacyCompatibilityProxies();
}

// Sistema unificado de datos cargado
