// ===============================================
// SYNC-MANAGER.JS - Sistema de sincronización centralizado
// ===============================================

// ===============================================
// FUNCIONES AUXILIARES
// ===============================================

/**
 * Preserva los timers de bugfixing durante la sincronización
 */
function preserveBugfixingTimers(appCases, dashboardCases) {
    if (!appCases || !dashboardCases) return;
    
    appCases.forEach(appCase => {
        const dashboardCase = dashboardCases.find(dc => dc.id === appCase.id);
        if (dashboardCase && appCase.scenarios) {
            appCase.scenarios.forEach(appScenario => {
                const dashboardScenario = dashboardCase.scenarios?.find(ds => ds.id === appScenario.id);
                if (dashboardScenario && appScenario.bugfixingTimer) {
                    // Preservar el timer de bugfixing del escenario de la app (RUNNING o PAUSED)
                    dashboardScenario.bugfixingTimer = {
                        ...appScenario.bugfixingTimer,
                        // Mantener el estado y tiempo acumulado
                    };
                    // Log de timer preservado comentado para mejorar rendimiento
                    // const caseNumber = appCase.caseNumber || appCase.title || `Caso ${appCase.id.split('_')[1]}`;
                    // console.log(`🔄 Timer preservado para ${caseNumber}, Escenario ${appScenario.scenarioNumber} - Ciclo ${appScenario.cycleNumber}:`, {
                    //     state: appScenario.bugfixingTimer.state,
                    //     accumulated: appScenario.bugfixingTimer.accumulated,
                    //     tiempoFormateado: `${Math.floor(appScenario.bugfixingTimer.accumulated / 60)}h ${Math.floor(appScenario.bugfixingTimer.accumulated % 60)}m`
                    // });
                }
            });
        }
    });
}

// ===============================================
// VARIABLES GLOBALES - OPTIMIZADAS
// ===============================================

// Usar el estado global centralizado
const syncState = {
    inProgress: false,
    lastSyncTime: null,
    retryCount: 0,
    maxRetries: 3
};

// ===============================================
// FUNCIONES DE SINCRONIZACIÓN
// ===============================================

/**
 * Sincroniza datos del dashboard con la app
 */
async function syncDashboardToApp(requirementId) {
    try {
        console.log(`🔄 Sincronizando dashboard → app para requerimiento: ${requirementId}`);
        
        // Obtener datos del dashboard
        const dashboardData = await getDashboardData();
        console.log('📊 Datos del dashboard obtenidos:', dashboardData ? 'Sí' : 'No');
        
        if (!dashboardData) {
            console.warn('⚠️ No hay datos del dashboard');
            console.log('🔍 Contenido de localStorage:', localStorage.getItem('dashboardData'));
            return false;
        }
        
        const requirement = dashboardData.requirements.find(req => req.id === requirementId);
        if (!requirement) {
            console.warn('⚠️ Requerimiento no encontrado en dashboard');
            return false;
        }
        
        // CRÍTICO: Cada requerimiento debe ser independiente
        // NO preservar casos de requerimientos anteriores
        console.log('🔄 Cargando requerimiento independiente:', requirement.name);
        
        // Crear estructura multicaso
        const multicaseRequirement = {
            id: requirement.id,
            info: {
                number: requirement.number,
                name: requirement.name,
                description: requirement.description,
                tester: requirement.tester,
                startDate: requirement.startDate || requirement.createdAt
            },
            // CRÍTICO: Usar los casos del dashboard tal como están
            cases: requirement.cases || [],
            createdAt: requirement.createdAt,
            updatedAt: requirement.updatedAt
        };
        
        // SOLO crear un caso vacío si NO hay casos en absoluto
        console.log('🔍 DEBUG syncDashboardToApp - Casos existentes:', multicaseRequirement.cases.length);
        if (multicaseRequirement.cases.length === 0) {
            console.log('🚨 DEBUG syncDashboardToApp - CREANDO CASO VACÍO porque no hay casos');
            if (typeof window.createEmptyCase === 'function') {
                multicaseRequirement.cases.push(window.createEmptyCase());
            } else {
                console.error('❌ window.createEmptyCase no está disponible');
            }
        } else {
            console.log('✅ DEBUG syncDashboardToApp - NO creando caso vacío, ya hay casos');
        }
        
        // DEBUG CRÍTICO: Verificar casos antes de establecer
        /* console.log('🔍 DEBUG syncDashboardToApp - Casos del dashboard:', requirement.cases?.length || 0);
        console.log('🔍 DEBUG syncDashboardToApp - Primer caso del dashboard:', requirement.cases?.[0]);
        console.log('🔍 DEBUG syncDashboardToApp - Escenarios del primer caso:', requirement.cases?.[0]?.scenarios?.length || 0); */
        
        // 🎯 CRÍTICO: Preservar timers de bugfixing ANTES de sobrescribir datos
        // Buscar casos existentes en localStorage para preservar timers
        try {
            const compressedMulticaseData = localStorage.getItem('multicaseData');
            console.log('🔍 DEBUG: compressedMulticaseData existe:', !!compressedMulticaseData);
            
            if (compressedMulticaseData) {
                // Descomprimir datos si están comprimidos
                const existingMulticaseData = typeof decompressData === 'function' ? 
                    decompressData(compressedMulticaseData) : 
                    JSON.parse(compressedMulticaseData);
                
                console.log('🔍 DEBUG: existingMulticaseData:', {
                    existe: !!existingMulticaseData,
                    tieneCurrentRequirement: !!(existingMulticaseData && existingMulticaseData.currentRequirement),
                    tieneCases: !!(existingMulticaseData && existingMulticaseData.currentRequirement && existingMulticaseData.currentRequirement.cases),
                    casosLength: existingMulticaseData?.currentRequirement?.cases?.length || 0
                });
                
                if (existingMulticaseData && existingMulticaseData.currentRequirement && existingMulticaseData.currentRequirement.cases && existingMulticaseData.currentRequirement.cases.length > 0) {
                    // console.log('🔄 PRESERVANDO timers desde multicaseData:', existingMulticaseData.currentRequirement.cases.length, 'casos');
                    preserveBugfixingTimers(existingMulticaseData.currentRequirement.cases, multicaseRequirement.cases);
                } else {
                    console.log('⚠️ No hay casos para preservar en multicaseData');
                }
            } else {
                console.log('⚠️ No hay multicaseData en localStorage');
            }
        } catch (e) {
            console.warn('⚠️ No se pudieron preservar timers desde localStorage:', e);
        }
        
        /* console.log('📊 Casos del requerimiento:', multicaseRequirement.cases.length);
        console.log('📊 Casos del dashboard:', requirement.cases?.length || 0); */
        
        // Guardar logs persistentes
        const debugLogs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        debugLogs.push({
            timestamp: new Date().toISOString(),
            source: 'APP',
            action: 'syncDashboardToApp',
            message: `Cargando requerimiento: ${requirement.name}`,
            data: {
                requirementId: requirement.id,
                requirementName: requirement.name,
                casesFromDashboard: requirement.cases?.length || 0,
                casesInMulticase: multicaseRequirement.cases.length
            }
        });
        
        if (requirement.cases && requirement.cases.length > 0) {
            console.log('📊 Primer caso del dashboard:', requirement.cases[0].name || 'Sin nombre');
            
            debugLogs.push({
                timestamp: new Date().toISOString(),
                source: 'APP',
                action: 'syncDashboardToApp',
                message: `Primer caso del dashboard: ${requirement.cases[0].name || 'Sin nombre'}`,
                data: {
                    firstCaseName: requirement.cases[0].name || 'Sin nombre',
                    firstCaseScenarios: requirement.cases[0].scenarios?.length || 0
                }
            });
        } else {
            debugLogs.push({
                timestamp: new Date().toISOString(),
                source: 'APP',
                action: 'syncDashboardToApp',
                message: 'PROBLEMA: Dashboard no tiene casos',
                data: {
                    casesFromDashboard: 0,
                    casesInMulticase: multicaseRequirement.cases.length
                }
            });
        }
        
        localStorage.setItem('debugLogs', JSON.stringify(debugLogs));
        
        // Establecer como requerimiento activo (usar variables globales)
        if (typeof window !== 'undefined') {
            window.currentRequirement = multicaseRequirement;
            window.currentCaseId = multicaseRequirement.cases.length > 0 ? multicaseRequirement.cases[0].id : null;
            window.multicaseMode = true;
        }
        
        // También establecer en el scope global si están definidas
        if (typeof currentRequirement !== 'undefined') {
            currentRequirement = multicaseRequirement;
        }
        if (typeof currentCaseId !== 'undefined') {
            currentCaseId = multicaseRequirement.cases.length > 0 ? multicaseRequirement.cases[0].id : null;
        }
        if (typeof multicaseMode !== 'undefined') {
            multicaseMode = true;
        }
        
        // Marcar que este requerimiento viene del dashboard
        multicaseRequirement._fromDashboard = true;
        
        console.log('📊 Estado después de establecer requerimiento:', {
            currentRequirement: window.currentRequirement ? 'Existe' : 'No existe',
            currentCaseId: window.currentCaseId,
            multicaseMode: window.multicaseMode
        });
        
        // CRÍTICO: Cargar el caso activo para que los escenarios estén disponibles en testCases
        if (multicaseRequirement.cases.length > 0 && multicaseRequirement.cases[0].id) {
            console.log('🔄 Cargando caso activo para disponibilizar escenarios...');
            if (typeof switchToCase === 'function') {
                const success = switchToCase(multicaseRequirement.cases[0].id);
                console.log('📊 Resultado de switchToCase:', success ? 'Éxito' : 'Falló');
            }
        } else {
            console.log('ℹ️ No hay casos en el requerimiento, limpiando variables globales...');
            // Solo limpiar si no hay casos
            if (typeof window !== 'undefined') {
                window.testCases = [];
                window.inputVariableNames = [];
            }
        }
        
        // Guardar en el sistema multicaso
        if (typeof saveMulticaseData === 'function') {
            saveMulticaseData();
        }
        
        // Actualizar la interfaz multicaso con delay para asegurar que las variables estén establecidas
        setTimeout(() => {
            if (typeof updateMulticaseUI === 'function') {
                updateMulticaseUI();
            }
            
            // Forzar actualización del header
            if (typeof createRequirementHeader === 'function') {
                createRequirementHeader();
            }
            
            // 🚨 CRÍTICO: Reconfigurar event listeners después de sincronizar requerimiento
            console.log('🔄 Reconfigurando event listeners después de sincronizar requerimiento...');
            if (typeof setupLateEventListeners === 'function') {
                setupLateEventListeners();
            }
        }, 100);
        
        console.log(`✅ Requerimiento "${requirement.name}" sincronizado a la app`);
        return true;
        
    } catch (error) {
        console.error('❌ Error sincronizando dashboard → app:', error);
        return false;
    }
}

/**
 * Sincroniza datos de la app con el dashboard
 */
function syncAppToDashboard() {
    if (syncState.inProgress) {
        console.log('⏳ Sincronización ya en progreso...');
        return;
    }
    
    try {
        syncState.inProgress = true;
        console.log('🔄 Sincronizando app → dashboard...');
        
        if (!window.currentRequirement) {
            console.log('ℹ️ No hay requerimiento activo en la app');
            return false;
        }
        
        // DEBUG CRÍTICO: Verificar estado de currentRequirement
        /* console.log('🔍 DEBUG syncAppToDashboard - window.currentRequirement:', window.currentRequirement);
        console.log('🔍 DEBUG syncAppToDashboard - window.currentRequirement.cases:', window.currentRequirement.cases);
        console.log('🔍 DEBUG syncAppToDashboard - window.currentRequirement.cases.length:', window.currentRequirement.cases?.length || 0); */
        
        // Verificar también currentRequirement local
        if (typeof currentRequirement !== 'undefined') {
            /* console.log('🔍 DEBUG syncAppToDashboard - currentRequirement local:', currentRequirement);
            console.log('🔍 DEBUG syncAppToDashboard - currentRequirement.cases local:', currentRequirement.cases);
            console.log('🔍 DEBUG syncAppToDashboard - currentRequirement.cases.length local:', currentRequirement.cases?.length || 0); */
        }
        
        // Obtener datos del dashboard
        const dashboardData = getDashboardData();
        if (!dashboardData) {
            console.warn('⚠️ No hay datos del dashboard');
            return false;
        }
        
        // Encontrar el requerimiento en el dashboard
        const requirementIndex = dashboardData.requirements.findIndex(req => req.id === window.currentRequirement.id);
        
        if (requirementIndex === -1) {
            console.warn('⚠️ Requerimiento no encontrado en dashboard');
            /* console.log('🔍 DEBUG - IDs disponibles en dashboard:', dashboardData.requirements.map(r => r.id));
            console.log('🔍 DEBUG - ID buscado:', window.currentRequirement.id); */
            
            // 🆕 SI NO SE ENCUENTRA, BUSCAR POR ID DEL REQUERIMIENTO ACTIVO DEL DASHBOARD
            const activeRequirementId = localStorage.getItem('activeRequirementId');
            if (activeRequirementId) {
                const activeIndex = dashboardData.requirements.findIndex(req => req.id === activeRequirementId);
                if (activeIndex !== -1) {
                    /* console.log('🔄 REEMPLAZANDO requerimiento activo del dashboard con datos del JSON importado'); */
                    // Reemplazar el requerimiento activo del dashboard con los datos del JSON
                    dashboardData.requirements[activeIndex] = {
                        ...dashboardData.requirements[activeIndex], // Mantener estructura del dashboard
                        // Actualizar con datos del JSON
                        name: window.currentRequirement.info.name,
                        number: window.currentRequirement.info.number,
                        description: window.currentRequirement.info.description,
                        tester: window.currentRequirement.info.tester,
                        startDate: window.currentRequirement.info.startDate,
                        status: window.currentRequirement.info.status || 'active',
                        priority: window.currentRequirement.info.priority || 1,
                        updatedAt: new Date().toISOString(),
                        cases: window.currentRequirement.cases || [],
                        stats: calculateRealStats(window.currentRequirement)
                    };
                    
                    // Guardar datos actualizados
                    saveDashboardData(dashboardData);
                    
                    console.log('✅ Requerimiento activo del dashboard reemplazado con datos del JSON');
                    return true;
                }
            }
            
            return false;
        }
        
        // Actualizar datos del requerimiento
        const requirement = dashboardData.requirements[requirementIndex];
        
        // Sincronizar información básica
        /* console.log('🔄 ANTES de sincronizar - Dashboard:', {
            name: requirement.name,
            number: requirement.number,
            tester: requirement.tester
        }); */
        /* console.log('🔄 ANTES de sincronizar - App:', {
            name: window.currentRequirement.info.name,
            number: window.currentRequirement.info.number,
            tester: window.currentRequirement.info.tester
        }); */
        
        requirement.name = window.currentRequirement.info.name;
        requirement.number = window.currentRequirement.info.number;
        requirement.description = window.currentRequirement.info.description;
        requirement.tester = window.currentRequirement.info.tester;
        requirement.startDate = window.currentRequirement.info.startDate;
        requirement.updatedAt = new Date().toISOString();
        
        /* console.log('🔄 DESPUÉS de sincronizar - Dashboard:', {
            name: requirement.name,
            number: requirement.number,
            tester: requirement.tester
        }); */
        
        // Sincronizar casos y escenarios
        requirement.cases = window.currentRequirement.cases || [];
        
        /* console.log('📊 Sincronizando casos al dashboard:', requirement.cases.length);
        console.log('📊 Casos en currentRequirement antes de sincronizar:', window.currentRequirement.cases?.length || 0); */
        
        // Guardar logs persistentes
        const debugLogs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        debugLogs.push({
            timestamp: new Date().toISOString(),
            source: 'APP',
            action: 'syncAppToDashboard',
            message: `Sincronizando ${requirement.cases.length} casos al dashboard`,
            data: {
                casesToSync: requirement.cases.length,
                currentRequirementCases: window.currentRequirement.cases?.length || 0
            }
        });
        
        if (requirement.cases.length > 0) {
            /* console.log('📊 Primer caso:', requirement.cases[0].name);
            console.log('📊 Escenarios del primer caso:', requirement.cases[0].scenarios?.length || 0); */
            
            debugLogs.push({
                timestamp: new Date().toISOString(),
                source: 'APP',
                action: 'syncAppToDashboard',
                message: `Primer caso sincronizado: ${requirement.cases[0].name}`,
                data: {
                    firstCaseName: requirement.cases[0].name,
                    firstCaseScenarios: requirement.cases[0].scenarios?.length || 0
                }
            });
        }
        
        localStorage.setItem('debugLogs', JSON.stringify(debugLogs));
        
        // Calcular estadísticas reales
        requirement.stats = calculateRealStats(window.currentRequirement);
        
        // DEBUG CRÍTICO: Verificar casos antes de guardar en dashboard
        /* console.log('🔍 DEBUG syncAppToDashboard - Casos antes de guardar:', requirement.cases?.length || 0);
        console.log('🔍 DEBUG syncAppToDashboard - Primer caso:', requirement.cases?.[0]);
        console.log('🔍 DEBUG syncAppToDashboard - Escenarios del primer caso:', requirement.cases?.[0]?.scenarios?.length || 0);
        
        console.log('📊 Estadísticas calculadas:', requirement.stats);
        console.log('📊 Progreso calculado:', Math.round((requirement.stats.completedScenarios / requirement.stats.totalScenarios) * 100) || 0, '%');
        console.log('📊 Casos en el requerimiento:', window.currentRequirement.cases?.length || 0); */
        if (window.currentRequirement.cases && window.currentRequirement.cases.length > 0) {
            /* console.log('📊 Primer caso:', window.currentRequirement.cases[0].title);
            console.log('📊 Escenarios del primer caso:', window.currentRequirement.cases[0].scenarios?.length || 0); */
            if (window.currentRequirement.cases[0].scenarios && window.currentRequirement.cases[0].scenarios.length > 0) {
                /* console.log('📊 Primer escenario:', window.currentRequirement.cases[0].scenarios[0]); */
            }
        }
        
        // Guardar datos actualizados
        saveDashboardData(dashboardData);
        
        // CRÍTICO: Forzar actualización de estadísticas en el dashboard
        if (typeof window.updateRequirementStats === 'function') {
            /* console.log('🔄 Forzando actualización de estadísticas en dashboard...'); */
            window.updateRequirementStats(requirement.id);
        }
        
        // Verificar que se guardó correctamente
        const savedData = getDashboardData();
        if (savedData && savedData.requirements[requirementIndex]) {
            const savedRequirement = savedData.requirements[requirementIndex];
            console.log('✅ Verificación: Casos guardados en dashboard:', savedRequirement.cases?.length || 0);
        }
        
        lastSyncTime = new Date().toISOString();
        console.log('✅ Datos sincronizados app → dashboard');
        return true;
        
    } catch (error) {
        console.error('❌ Error sincronizando app → dashboard:', error);
        return false;
    } finally {
        syncState.inProgress = false;
    }
}

/**
 * Calcula estadísticas reales de un requerimiento (USANDO LA MISMA LÓGICA QUE LA APP)
 */
function calculateRealStats(requirement) {
    if (!requirement || !requirement.cases) {
        return {
            totalCases: 0,
            completedCases: 0,
            totalScenarios: 0,
            completedScenarios: 0,
            totalOK: 0,
            totalNO: 0,
            totalPending: 0,
            successRate: 0
        };
    }
    
    // Usar la misma lógica que updateRequirementStats en multicase-core.js
    const allScenarios = requirement.cases.flatMap(c => c.scenarios || []);
    
    const stats = {
        totalCases: requirement.cases.length,
        completedCases: 0,
        totalScenarios: allScenarios.length,
        completedScenarios: 0,
        totalOK: 0,
        totalNO: 0,
        totalPending: 0,
        successRate: 0
    };
    
    // Contar escenarios por estado
    allScenarios.forEach(scenario => {
        if (scenario.status === 'OK' || scenario.status === 'completed' || scenario.status === 'passed') {
            stats.completedScenarios++;
            stats.totalOK++;
        } else if (scenario.status === 'NO' || scenario.status === 'failed') {
            stats.totalNO++;
        } else {
            stats.totalPending++;
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

// Función para crear un caso vacío - ELIMINADA PARA EVITAR RECURSIÓN
// Usar directamente window.createEmptyCase desde core.js

// ===============================================
// FUNCIONES DE GESTIÓN DE DATOS
// ===============================================

/**
 * Obtiene datos del dashboard desde IndexedDB
 */
function getDashboardData() {
    try {
        if (typeof window.IndexedDBManager !== 'undefined' && window.IndexedDBManager.loadFromIndexedDB) {
            // Intentar cargar desde IndexedDB
            return new Promise((resolve) => {
                window.IndexedDBManager.loadFromIndexedDB('dashboardData').then(data => {
                    resolve(data);
                }).catch(() => {
                    // Fallback a localStorage
                    const fallbackData = localStorage.getItem('dashboardData');
                    resolve(fallbackData ? JSON.parse(fallbackData) : null);
                });
            });
        } else {
            // Fallback a localStorage
            const data = localStorage.getItem('dashboardData');
            return data ? JSON.parse(data) : null;
        }
    } catch (error) {
        console.error('❌ Error obteniendo datos del dashboard:', error);
        return null;
    }
}

/**
 * Guarda datos del dashboard
 */
function saveDashboardData(data) {
    try {
        // Usar localStorage directamente - más simple y confiable
        localStorage.setItem('dashboardData', JSON.stringify(data));
        console.log('✅ Dashboard data guardado en localStorage');
        return true;
    } catch (error) {
        console.error('❌ Error guardando datos del dashboard:', error);
        return false;
    }
}

/**
 * Obtiene datos de la app multicaso
 */
function getAppData() {
    try {
        const data = localStorage.getItem('multicaseData');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('❌ Error obteniendo datos de la app:', error);
        return null;
    }
}

// ===============================================
// FUNCIONES DE SINCRONIZACIÓN AUTOMÁTICA
// ===============================================

/**
 * Configura sincronización automática
 */
function setupAutoSync() {
    // Sincronizar cada 30 segundos
    setInterval(() => {
        if (window.currentRequirement && window.multicaseMode) {
            syncAppToDashboard();
        }
    }, 30000);
    
    // Sincronizar al cambiar de pestaña
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.currentRequirement && window.multicaseMode) {
            syncAppToDashboard();
        }
    });
    
    // Sincronizar antes de cerrar la página
    window.addEventListener('beforeunload', () => {
        if (window.currentRequirement && window.multicaseMode) {
            syncAppToDashboard();
        }
    });
    
    // console.log('✅ Sincronización automática configurada');
}

/**
 * Sincroniza cuando se crea un nuevo caso
 */
function syncOnCaseCreated(caseData) {
    /* console.log('🔄 Sincronizando nuevo caso...');
    console.log('🔍 DEBUG syncOnCaseCreated - caseData:', caseData);
    console.log('🔍 DEBUG syncOnCaseCreated - currentRequirement:', window.currentRequirement); */
    
    setTimeout(() => {
        /* console.log('🔄 Ejecutando syncAppToDashboard después de crear caso...'); */
        syncAppToDashboard();
        
        // 🆕 FORZAR ACTUALIZACIÓN DEL DASHBOARD
        /* console.log('🔄 Marcando dashboard para actualización después de crear caso...'); */
        localStorage.setItem('forceDashboardUpdate', new Date().toISOString());
    }, 1000);
}

/**
 * Sincroniza cuando se modifica un escenario
 */
function syncOnScenarioModified(scenarioData) {
    /* console.log('🔄 Sincronizando escenario modificado...');
    console.log('🔍 DEBUG syncOnScenarioModified - scenarioData:', scenarioData);
    console.log('🔍 DEBUG syncOnScenarioModified - currentRequirement:', window.currentRequirement); */
    
    setTimeout(() => {
        /* console.log('🔄 Ejecutando syncAppToDashboard después de modificar escenario...'); */
        syncAppToDashboard();
        
        // 🆕 FORZAR ACTUALIZACIÓN DEL DASHBOARD
        /* console.log('🔄 Marcando dashboard para actualización después de modificar escenario...'); */
        localStorage.setItem('forceDashboardUpdate', new Date().toISOString());
    }, 1000);
}

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

/**
 * Función de debug para verificar el estado de los datos
 */
window.debugSyncState = function() {
    /* console.log('🔍 === ESTADO DE SINCRONIZACIÓN ==='); */
    
    // Estado de la app
    /* console.log('📱 APP:');
    console.log('  - currentRequirement:', window.currentRequirement ? 'Existe' : 'No existe'); */
    if (window.currentRequirement) {
        /* console.log('  - ID:', window.currentRequirement.id);
        console.log('  - Casos:', window.currentRequirement.cases?.length || 0); */
        if (window.currentRequirement.cases?.length > 0) {
            /* console.log('  - Primer caso:', window.currentRequirement.cases[0].name);
            console.log('  - Escenarios del primer caso:', window.currentRequirement.cases[0].scenarios?.length || 0); */
        }
    }
    
    // Estado del dashboard
    console.log('📊 DASHBOARD:');
    const dashboardData = getDashboardData();
    if (dashboardData && dashboardData.requirements) {
        console.log('  - Requerimientos:', dashboardData.requirements.length);
        if (window.currentRequirement) {
            const dashboardReq = dashboardData.requirements.find(req => req.id === window.currentRequirement.id);
            if (dashboardReq) {
                console.log('  - Casos en dashboard:', dashboardReq.cases?.length || 0);
                if (dashboardReq.cases?.length > 0) {
                    console.log('  - Primer caso en dashboard:', dashboardReq.cases[0].name);
                }
            } else {
                /* console.log('  - Requerimiento no encontrado en dashboard'); */
            }
        }
    } else {
        /* console.log('  - No hay datos del dashboard'); */
    }
    
    // Estado del localStorage
    console.log('💾 LOCALSTORAGE:');
    const multicaseData = localStorage.getItem('multicaseData');
    if (multicaseData) {
        const data = JSON.parse(multicaseData);
        console.log('  - multicaseData existe');
        if (data.currentRequirement) {
            console.log('  - Casos en multicaseData:', data.currentRequirement.cases?.length || 0);
        }
    } else {
        console.log('  - No hay multicaseData');
    }
    
    console.log('🔍 === FIN ESTADO ===');
};

/**
 * Función específica para debug de migración legacy
 */
window.debugLegacyMigration = function() {
    console.log('🔍 === DEBUG MIGRACIÓN LEGACY ===');
    
    // Verificar datos legacy
    console.log('📦 DATOS LEGACY:');
    const legacyTestCases = localStorage.getItem('testCases');
    const legacyRequirementInfo = localStorage.getItem('requirementInfo');
    const legacyInputVariableNames = localStorage.getItem('inputVariableNames');
    
    /* console.log('  - testCases:', legacyTestCases ? 'Existe' : 'No existe');
    console.log('  - requirementInfo:', legacyRequirementInfo ? 'Existe' : 'No existe');
    console.log('  - inputVariableNames:', legacyInputVariableNames ? 'Existe' : 'No existe'); */
    
    // Verificar requerimiento actual
    console.log('📱 REQUERIMIENTO ACTUAL:');
    if (currentRequirement) {
        /* console.log('  - ID:', currentRequirement.id);
        console.log('  - Nombre:', currentRequirement.info?.name || 'Sin nombre');
        console.log('  - Casos:', currentRequirement.cases?.length || 0);
        console.log('  - Viene del dashboard:', currentRequirement._fromDashboard ? 'Sí' : 'No'); */
    } else {
        console.log('  - No hay requerimiento activo');
    }
    
    console.log('🔍 === FIN DEBUG MIGRACIÓN ===');
};

/**
 * Función específica para debug de escenarios
 */
window.debugScenarios = function() {
    console.log('🔍 === DEBUG ESCENARIOS ===');
    
    // Verificar testCases globales
    /* console.log('📱 TESTCASES GLOBALES:');
    console.log('  - Cantidad:', testCases ? testCases.length : 'No definido'); */
    if (testCases && testCases.length > 0) {
        /* console.log('  - Primer escenario:', testCases[0].scenarioNumber || 'Sin número');
        console.log('  - Estados:', testCases.map(tc => tc.status || 'Sin estado')); */
    }
    
    // Verificar caso actual
    console.log('📁 CASO ACTUAL:');
    if (currentRequirement && currentCaseId) {
        const currentCase = currentRequirement.cases.find(c => c.id === currentCaseId);
        if (currentCase) {
            /* console.log('  - ID:', currentCase.id);
            console.log('  - Nombre:', currentCase.title || 'Sin título');
            console.log('  - Escenarios:', currentCase.scenarios ? currentCase.scenarios.length : 'No definido'); */
            if (currentCase.scenarios && currentCase.scenarios.length > 0) {
                /* console.log('  - Primer escenario:', currentCase.scenarios[0].scenarioNumber || 'Sin número');
                console.log('  - Estados:', currentCase.scenarios.map(s => s.status || 'Sin estado')); */
            }
        } else {
            console.log('  - Caso no encontrado');
        }
    } else {
        console.log('  - No hay caso activo');
    }
    
    console.log('🔍 === FIN DEBUG ESCENARIOS ===');
};

/**
 * Verifica si hay datos para sincronizar
 */
function hasDataToSync() {
    const dashboardData = getDashboardData();
    const appData = getAppData();
    
    return !!(dashboardData && appData);
}

/**
 * Obtiene el estado de sincronización
 */
function getSyncStatus() {
    return {
        inProgress: syncState.inProgress,
        lastSync: syncState.lastSyncTime,
        hasData: hasDataToSync()
    };
}

/**
 * Fuerza una sincronización completa
 */
function forceFullSync() {
    console.log('🔄 Forzando sincronización completa...');
    
    if (window.currentRequirement && window.multicaseMode) {
        return syncAppToDashboard();
    } else {
        console.log('ℹ️ No hay requerimiento activo para sincronizar');
        return false;
    }
}

// ===============================================
// FUNCIONES DE MIGRACIÓN
// ===============================================

/**
 * Migra datos existentes de la app al dashboard
 */
function migrateAppDataToDashboard() {
    try {
        console.log('🔄 Migrando datos de la app al dashboard...');
        
        const appData = getAppData();
        if (!appData || !appData.currentRequirement) {
            console.log('ℹ️ No hay datos de la app para migrar');
            return false;
        }
        
        const requirement = appData.currentRequirement;
        
        // Crear estructura para el dashboard
        const dashboardRequirement = {
            id: requirement.id || generateId(),
            number: requirement.info.number || 'REQ-001',
            name: requirement.info.name || 'Requerimiento Migrado',
            description: requirement.info.description || '',
            priority: 1, // Prioridad por defecto
            tester: requirement.info.tester || '',
            startDate: requirement.info.startDate || new Date().toISOString().split('T')[0],
            status: 'active',
            createdAt: requirement.createdAt || new Date().toISOString(),
            updatedAt: requirement.updatedAt || new Date().toISOString(),
            cases: requirement.cases || [],
            stats: calculateRealStats(requirement)
        };
        
        // Obtener o crear datos del dashboard
        let dashboardData = getDashboardData();
        if (!dashboardData) {
            dashboardData = {
                requirements: [],
                settings: {
                    currentFilter: 'all',
                    currentSort: 'priority',
                    searchQuery: ''
                }
            };
        }
        
        // Agregar requerimiento al dashboard
        dashboardData.requirements.push(dashboardRequirement);
        
        // Guardar datos
        saveDashboardData(dashboardData);
        
        console.log('✅ Datos migrados al dashboard');
        return true;
        
    } catch (error) {
        console.error('❌ Error migrando datos:', error);
        return false;
    }
}

/**
 * Genera un ID único
 */
function generateId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.syncDashboardToApp = syncDashboardToApp;
window.syncAppToDashboard = syncAppToDashboard;
window.calculateRealStats = calculateRealStats;
window.setupAutoSync = setupAutoSync;
window.syncOnCaseCreated = syncOnCaseCreated;
window.syncOnScenarioModified = syncOnScenarioModified;
window.getSyncStatus = getSyncStatus;
window.forceFullSync = forceFullSync;
window.migrateAppDataToDashboard = migrateAppDataToDashboard;
