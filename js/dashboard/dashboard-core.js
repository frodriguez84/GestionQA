// ===============================================
// DASHBOARD-CORE.JS - Lógica principal del dashboard
// ===============================================

// ===============================================
// VARIABLES GLOBALES DEL DASHBOARD
// ===============================================

let requirementsList = [];
let filteredRequirements = [];
let currentFilter = 'all';
let currentSort = 'priority';
let searchQuery = '';

// ===============================================
// ESTRUCTURA DE DATOS
// ===============================================

/**
 * Crea un nuevo requerimiento
 */
function createRequirement(data) {
    const requirement = {
        id: generateId(),
        number: data.number || '',
        name: data.name || '',
        description: data.description || '',
        priority: parseInt(data.priority) || 1,
        tester: data.tester || '',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        status: 'active', // active, completed, paused, blocked
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cases: [],
        stats: {
            totalCases: 0,
            completedCases: 0,
            totalScenarios: 0,
            completedScenarios: 0,
            totalOK: 0,
            totalNO: 0,
            totalPending: 0,
            successRate: 0,
            totalHours: 0,
            bugfixingHours: 0
        }
    };
    
    return requirement;
}

/**
 * Genera un ID único
 */
function generateId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===============================================
// FUNCIONES DE GESTIÓN DE REQUERIMIENTOS
// ===============================================

/**
 * Agrega un nuevo requerimiento
 */
function addRequirement(requirementData) {
    const requirement = createRequirement(requirementData);
    requirementsList.push(requirement);
    saveRequirements();
    updateDashboard();
    return requirement;
}

/**
 * Actualiza un requerimiento existente (PRESERVANDO CASOS Y ESCENARIOS)
 */
function updateRequirement(id, updates) {
    const index = requirementsList.findIndex(req => req.id === id);
    if (index !== -1) {
        const existingRequirement = requirementsList[index];
        
        // CRÍTICO: Sincronizar casos desde la app antes de actualizar
        let casesToPreserve = existingRequirement.cases || [];
        let statsToPreserve = existingRequirement.stats || {
            totalCases: 0,
            completedCases: 0,
            totalScenarios: 0,
            completedScenarios: 0,
            totalOK: 0,
            totalNO: 0,
            totalPending: 0,
            successRate: 0,
            totalHours: 0,
            bugfixingHours: 0
        };
        
        // CRÍTICO: Sincronizar casos desde localStorage (multicaseData)
        console.log('🔄 Sincronizando casos desde localStorage antes de actualizar estado...');
        
        try {
            const multicaseData = localStorage.getItem('multicaseData');
            /* console.log('🔍 DEBUG - multicaseData raw:', multicaseData); */
            
            if (multicaseData) {
                // Descomprimir datos si están comprimidos
                const data = typeof decompressData === 'function' ? decompressData(multicaseData) : JSON.parse(multicaseData);
                /* console.log('🔍 DEBUG - multicaseData parsed:', data);
                console.log('🔍 DEBUG - currentRequirement en localStorage:', data.currentRequirement); */
                
                if (data.currentRequirement && data.currentRequirement.id === id) {
                    /* console.log('📊 Casos en localStorage:', data.currentRequirement.cases?.length || 0);
                    console.log('📊 Casos en el dashboard:', casesToPreserve.length); */
                    
                    if (data.currentRequirement.cases && data.currentRequirement.cases.length > 0) {
                        casesToPreserve = data.currentRequirement.cases;
                        /* console.log('✅ Usando casos de localStorage (más recientes)'); */
                    }
                } else {
                    /* console.log('⚠️ No hay currentRequirement en localStorage con el mismo ID');
                    console.log('⚠️ ID buscado:', id);
                    console.log('⚠️ ID en localStorage:', data.currentRequirement?.id); */
                }
            } else {
                /* console.log('⚠️ No hay datos multicaseData en localStorage'); */
            }
        } catch (error) {
            /* console.error('❌ Error leyendo multicaseData:', error); */
        }
        
        // CRÍTICO: Preservar casos y escenarios existentes
        const preservedData = {
            cases: casesToPreserve,
            stats: statsToPreserve
        };
        
        requirementsList[index] = {
            ...existingRequirement,
            ...updates,
            ...preservedData, // Preservar casos y estadísticas
            updatedAt: new Date().toISOString()
        };
        
        console.log('✅ Requerimiento actualizado preservando casos:', {
            id: id,
            cases: requirementsList[index].cases.length,
            stats: requirementsList[index].stats
        });
        
        // CRÍTICO: Actualizar estadísticas después de actualizar el requerimiento
        updateRequirementStats(id);
        
        saveRequirements();
        updateDashboard();
        return requirementsList[index];
    }
    return null;
}

/**
 * Elimina un requerimiento
 */
function deleteRequirement(id) {
    const index = requirementsList.findIndex(req => req.id === id);
    if (index !== -1) {
        requirementsList.splice(index, 1);
        saveRequirements();
        updateDashboard();
        return true;
    }
    return false;
}

/**
 * Obtiene un requerimiento por ID
 */
function getRequirement(id) {
    return requirementsList.find(req => req.id === id);
}

/**
 * Obtiene todos los requerimientos
 */
function getAllRequirements() {
    return requirementsList;
}

// ===============================================
// FUNCIONES DE FILTRADO Y BÚSQUEDA
// ===============================================

/**
 * Aplica filtros a los requerimientos del dashboard
 */
function applyDashboardFilters() {
    let filtered = [...requirementsList];
    
    // Filtro por estado
    if (currentFilter !== 'all') {
        filtered = filtered.filter(req => req.status === currentFilter);
    }
    
    // Filtro por búsqueda
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(req => 
            req.name.toLowerCase().includes(query) ||
            req.number.toLowerCase().includes(query) ||
            req.description.toLowerCase().includes(query) ||
            req.tester.toLowerCase().includes(query)
        );
    }
    
    // Ordenamiento
    filtered = sortRequirements(filtered, currentSort);
    
    filteredRequirements = filtered;
    return filtered;
}

/**
 * Ordena los requerimientos
 */
function sortRequirements(requirements, sortBy) {
    const sorted = [...requirements];
    
    switch (sortBy) {
        case 'priority':
            return sorted.sort((a, b) => a.priority - b.priority);
        case 'name':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'date':
            return sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        case 'progress':
            return sorted.sort((a, b) => {
                const progressA = calculateProgress(a);
                const progressB = calculateProgress(b);
                return progressB - progressA;
            });
        default:
            return sorted;
    }
}

/**
 * Calcula el progreso de un requerimiento
 */
function calculateProgress(requirement) {
    if (requirement.stats.totalScenarios === 0) return 0;
    return Math.round((requirement.stats.completedScenarios / requirement.stats.totalScenarios) * 100);
}

// ===============================================
// FUNCIONES DE ESTADÍSTICAS
// ===============================================

/**
 * Calcula estadísticas del dashboard
 */
function calculateDashboardStats() {
    const stats = {
        total: requirementsList.length,
        active: requirementsList.filter(req => req.status === 'active').length,
        completed: requirementsList.filter(req => req.status === 'completed').length,
        paused: requirementsList.filter(req => req.status === 'paused').length,
        blocked: requirementsList.filter(req => req.status === 'blocked').length,
        totalCases: requirementsList.reduce((sum, req) => sum + req.stats.totalCases, 0),
        totalScenarios: requirementsList.reduce((sum, req) => sum + req.stats.totalScenarios, 0)
    };
    
    return stats;
}

/**
 * Actualiza las estadísticas de un requerimiento
 */
function updateRequirementStats(requirementId) {
    const requirement = getRequirement(requirementId);
    if (!requirement) return;
    
    // Calcular estadísticas reales usando la misma lógica que la app
    const realStats = calculateRealStatsFromCases(requirement);
    
    // Actualizar las estadísticas del requerimiento
    requirement.stats = realStats;
    
    saveRequirements();
    return realStats;
}

/**
 * Calcula estadísticas reales desde los casos del requerimiento
 */
function calculateRealStatsFromCases(requirement) {
    if (!requirement || !requirement.cases) {
        return {
            totalCases: 0,
            completedCases: 0,
            totalScenarios: 0,
            completedScenarios: 0,
            totalOK: 0,
            totalNO: 0,
            totalPending: 0,
            successRate: 0,
            totalHours: 0,
            bugfixingHours: 0
        };
    }
    
    // Obtener todos los escenarios de todos los casos
    const allScenarios = requirement.cases.flatMap(c => c.scenarios || []);
    
    const stats = {
        totalCases: requirement.cases.length,
        completedCases: 0,
        totalScenarios: allScenarios.length,
        completedScenarios: 0,
        totalOK: 0,
        totalNO: 0,
        totalPending: 0,
        successRate: 0,
        totalHours: 0,
        bugfixingHours: 0
    };
    
    // Contar escenarios por estado y sumar horas
    allScenarios.forEach(scenario => {
        if (scenario.status === 'OK' || scenario.status === 'completed' || scenario.status === 'passed') {
            stats.completedScenarios++;
            stats.totalOK++;
        } else if (scenario.status === 'NO' || scenario.status === 'failed') {
            stats.totalNO++;
        } else {
            stats.totalPending++;
        }
        
        // Sumar tiempo del escenario (en horas)
        if (scenario.testTime && typeof scenario.testTime === 'number') {
            stats.totalHours += scenario.testTime;
        }
        
        // Sumar tiempo de bugfixing (en horas)
        if (scenario.bugfixingTimer && scenario.bugfixingTimer.accumulated && typeof scenario.bugfixingTimer.accumulated === 'number') {
            // Convertir minutos a horas
            stats.bugfixingHours += scenario.bugfixingTimer.accumulated / 60;
        }
    });
    
    // Contar casos completados (todos los escenarios del caso deben tener su último ciclo OK)
    requirement.cases.forEach(caseObj => {
        if (caseObj.scenarios && caseObj.scenarios.length > 0) {
            // Agrupar escenarios por número de escenario
            const scenarioGroups = {};
            caseObj.scenarios.forEach(scenario => {
                const scenarioNum = scenario.scenarioNumber || scenario.scenario;
                if (!scenarioGroups[scenarioNum]) {
                    scenarioGroups[scenarioNum] = [];
                }
                scenarioGroups[scenarioNum].push(scenario);
            });
            
            // Verificar si todos los escenarios del caso están completos
            const allScenariosComplete = Object.values(scenarioGroups).every(scenarioGroup => {
                // Ordenar por número de ciclo para obtener el último
                scenarioGroup.sort((a, b) => {
                    const cycleA = parseInt(a.cycleNumber || a.cycle) || 0;
                    const cycleB = parseInt(b.cycleNumber || b.cycle) || 0;
                    return cycleA - cycleB;
                });
                
                // El último ciclo debe estar OK
                const lastCycle = scenarioGroup[scenarioGroup.length - 1];
                return lastCycle && lastCycle.status === 'OK';
            });
            
            if (allScenariosComplete) {
                stats.completedCases++;
            }
        }
    });
    
    // Calcular tasa de éxito
    stats.successRate = stats.totalScenarios > 0 ? 
        Math.round((stats.totalOK / stats.totalScenarios) * 100) : 0;
    
    return stats;
}

/**
 * Actualiza las estadísticas de TODOS los requerimientos
 */
function updateAllRequirementsStats() {
    requirementsList.forEach(requirement => {
        updateRequirementStats(requirement.id);
    });
    
    saveRequirements();
}

// ===============================================
// FUNCIONES DE NAVEGACIÓN
// ===============================================

/**
 * Navega a un requerimiento específico
 */
function navigateToRequirement(requirementId) {
    // Guardar el ID del requerimiento activo
    localStorage.setItem('activeRequirementId', requirementId);
    
    // Redirigir a la aplicación principal
    // La sincronización se hará en la app si es necesario
    window.location.href = 'index.html';
}

/**
 * Sincroniza datos desde la app al dashboard (llamada cuando se regresa al dashboard)
 */
function syncFromAppToDashboard() {
    try {
        // Obtener datos de la app
        const appData = localStorage.getItem('multicaseData');
        
        if (!appData) {
            return false;
        }
        
        // Descomprimir datos si están comprimidos
        const data = typeof decompressData === 'function' ? decompressData(appData) : JSON.parse(appData);
        
        if (!data.currentRequirement) {
            return false;
        }
        
        const appRequirement = data.currentRequirement;
        
        // Buscar el requerimiento en el dashboard
        const dashboardRequirement = requirementsList.find(req => req.id === appRequirement.id);
        if (!dashboardRequirement) {
            return false;
        }
        
        // 🆕 SINCRONIZAR DATOS NOMINALES DEL REQUERIMIENTO
        if (appRequirement.info) {
            // Actualizar datos nominales
            dashboardRequirement.name = appRequirement.info.name || dashboardRequirement.name;
            dashboardRequirement.number = appRequirement.info.number || dashboardRequirement.number;
            dashboardRequirement.tester = appRequirement.info.tester || dashboardRequirement.tester;
            dashboardRequirement.description = appRequirement.info.description || dashboardRequirement.description;
            dashboardRequirement.startDate = appRequirement.info.startDate || dashboardRequirement.startDate;
            dashboardRequirement.status = appRequirement.info.status || dashboardRequirement.status;
            dashboardRequirement.priority = appRequirement.info.priority || dashboardRequirement.priority;
            dashboardRequirement.updatedAt = new Date().toISOString();
        }
        
        // Sincronizar casos y escenarios
        dashboardRequirement.cases = appRequirement.cases || [];
        
        // Actualizar estadísticas
        updateRequirementStats(appRequirement.id);
        
        // Guardar cambios
        saveRequirements();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error sincronizando desde la app:', error);
        return false;
    }
}

/**
 * Obtiene el requerimiento activo
 */
function getActiveRequirement() {
    const activeId = localStorage.getItem('activeRequirementId');
    return activeId ? getRequirement(activeId) : null;
}

// ===============================================
// FUNCIONES DE PERSISTENCIA
// ===============================================

/**
 * Guarda los requerimientos en localStorage
 */
function saveRequirements() {
    try {
        localStorage.setItem('dashboardRequirements', JSON.stringify(requirementsList));
        
        // También guardar en el formato del dashboard
        const dashboardData = {
            requirements: requirementsList,
            settings: {
                currentFilter: currentFilter,
                currentSort: currentSort,
                searchQuery: searchQuery
            },
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
    } catch (error) {
        console.error('❌ Error guardando requerimientos:', error);
    }
}

/**
 * Carga los requerimientos desde localStorage
 */
function loadRequirements() {
    try {
        const saved = localStorage.getItem('dashboardRequirements');
        if (saved) {
            // Descomprimir datos si están comprimidos
            requirementsList = typeof decompressData === 'function' ? decompressData(saved) : JSON.parse(saved);
        } else {
            // Crear algunos requerimientos de ejemplo
            createSampleRequirements();
        }
    } catch (error) {
        console.error('❌ Error cargando requerimientos:', error);
        requirementsList = [];
        createSampleRequirements();
    }
}

/**
 * Crea requerimientos de ejemplo
 */
function createSampleRequirements() {
    const sampleRequirements = [
        {
            number: 'REQ-001',
            name: 'Sistema de Login de Usuario',
            description: 'Implementar autenticación segura para usuarios del sistema',
            priority: 1,
            tester: 'Juan Pérez',
            startDate: new Date().toISOString().split('T')[0]
        },
        {
            number: 'REQ-002',
            name: 'Carrito de Compras',
            description: 'Funcionalidad completa de carrito de compras con persistencia',
            priority: 2,
            tester: 'María García',
            startDate: new Date().toISOString().split('T')[0]
        },
        {
            number: 'REQ-003',
            name: 'Reportes de Ventas',
            description: 'Generación de reportes de ventas con filtros y exportación',
            priority: 3,
            tester: 'Carlos López',
            startDate: new Date().toISOString().split('T')[0]
        },
        {
            number: 'REQ-004',
            name: 'Notificaciones Push',
            description: 'Sistema de notificaciones en tiempo real',
            priority: 4,
            tester: 'Ana Martínez',
            startDate: new Date().toISOString().split('T')[0]
        },
        {
            number: 'REQ-005',
            name: 'Configuración de Usuario',
            description: 'Panel de configuración personalizable',
            priority: 5,
            tester: 'Luis Rodríguez',
            startDate: new Date().toISOString().split('T')[0]
        },
        {
            number: 'REQ-006',
            name: 'Documentación del Sistema',
            description: 'Generación automática de documentación técnica',
            priority: 6,
            tester: 'Sofia Herrera',
            startDate: new Date().toISOString().split('T')[0]
        }
    ];
    
    requirementsList = sampleRequirements.map(req => createRequirement(req));
    saveRequirements();
    console.log('📝 Requerimientos de ejemplo creados');
}

// ===============================================
// FUNCIONES DE INICIALIZACIÓN
// ===============================================

/**
 * Inicializa el dashboard
 */
function initializeDashboard() {
    // Inicializando Dashboard...
    
    // Cargar datos
    loadRequirements();
    
    // 🆕 VERIFICAR SI HAY QUE FORZAR ACTUALIZACIÓN
    const forceUpdate = localStorage.getItem('forceDashboardUpdate');
    if (forceUpdate) {
        console.log('🔄 Forzando actualización del dashboard después de importar JSON...');
        localStorage.removeItem('forceDashboardUpdate');
        
        // Forzar sincronización desde la app
        if (typeof syncFromAppToDashboard === 'function') {
            syncFromAppToDashboard();
            
            // 🆕 ESPERAR A QUE SE COMPLETE LA SINCRONIZACIÓN ANTES DE RENDERIZAR
            setTimeout(() => {
                console.log('🔄 Sincronización completada, actualizando interfaz...');
                
                // CRÍTICO: Actualizar estadísticas de todos los requerimientos
                updateAllRequirementsStats();
                
                // Aplicar filtros iniciales
                applyDashboardFilters();
                
                // Actualizar interfaz
                updateDashboard();
                
                console.log('✅ Dashboard actualizado después de importar JSON');
            }, 1000); // Aumentamos el tiempo para asegurar que se complete la sincronización
        }
    } else {
        // CRÍTICO: Actualizar estadísticas de todos los requerimientos
        updateAllRequirementsStats();
        
        // Aplicar filtros iniciales
        applyDashboardFilters();
        
        // Actualizar interfaz
        updateDashboard();
    }
    
    // Dashboard inicializado
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.requirementsList = requirementsList;
window.filteredRequirements = filteredRequirements;
window.addRequirement = addRequirement;
window.updateRequirement = updateRequirement;
window.deleteRequirement = deleteRequirement;
window.getRequirement = getRequirement;
window.getAllRequirements = getAllRequirements;
window.applyDashboardFilters = applyDashboardFilters;
window.calculateDashboardStats = calculateDashboardStats;
window.navigateToRequirement = navigateToRequirement;
window.getActiveRequirement = getActiveRequirement;
window.initializeDashboard = initializeDashboard;
window.updateRequirementStats = updateRequirementStats;
window.updateAllRequirementsStats = updateAllRequirementsStats;
window.calculateRealStatsFromCases = calculateRealStatsFromCases;
window.syncFromAppToDashboard = syncFromAppToDashboard;
