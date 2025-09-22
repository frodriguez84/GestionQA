// ===============================================
// CORE.JS - Variables globales y funciones esenciales
// ===============================================

// ===============================================
// VARIABLES GLOBALES CRÍTICAS
// ===============================================

// Datos principales
let testCases = [];
let inputVariableNames = ['Variable 1', 'Variable 2']; // Variables por defecto
let filteredCases = [];
let requirementInfo = {
    number: '',
    name: '',
    description: '',
    caso: '',
    titleCase: '',
    tester: '',
    startDate: ''
};

// Control de formularios
let currentEditingId = null;

// Sistema de cronómetros
let activeTimerId = null;
let rowTimerInterval = null;
let rowTimerStartTime = 0;
let rowTimerAccum = 0;
let timerPaused = false;
let pausedTime = 0;
let timerInterval = null; // FALTABA - Para modal

// Sistema de selección múltiple
let selectedCases = new Set();

// ✅ NUEVAS VARIABLES PARA DRAG & DROP
let dragState = {
    isDragging: false,
    draggedCaseId: null,
    draggedElement: null,
    placeholder: null,
    startY: 0,
    startIndex: 0,
    draggedScenarioNumber: null,
    draggedScenarioBlock: [],
    dropZoneElement: null,
    ghostElement: null
};

// ✅ VARIABLE PARA AUTO-SCROLL EN DRAG & DROP
let autoScrollState = {
    interval: null,
    direction: null,
    speed: 0,
    zones: {
        top: 50,
        bottom: 50
    }
};

// ✅ VARIABLES PARA CONTENEDOR Y COORDENADAS
let containerBounds = null;
let scrollContainer = null;

// ===============================================
// FUNCIONES DE PERSISTENCIA
// ===============================================

/**
 * Guarda datos con compresión automática
 */
function saveToStorage() {
    // Usar las funciones centralizadas de utils.js
    const success = saveData('testCases', testCases) && 
                   saveData('inputVariableNames', inputVariableNames) && 
                   saveData('requirementInfo', requirementInfo);
    
    if (!success) {
        console.error('❌ Error guardando datos usando funciones centralizadas');
        
        // Fallback a método anterior si las funciones centralizadas fallan
        try {
            const compressedTestCases = compressData(testCases);
            const compressedInputVariables = compressData(inputVariableNames);
            const compressedRequirementInfo = compressData(requirementInfo);
            
            localStorage.setItem('testCases', compressedTestCases);
            localStorage.setItem('inputVariableNames', compressedInputVariables);
            localStorage.setItem('requirementInfo', compressedRequirementInfo);
            
            console.log('✅ Datos guardados usando método de fallback');
        } catch (e) {
            console.error('❌ Error crítico en fallback:', e);
            alert('❌ Error crítico: No se pudieron guardar los datos.\n\nPor favor, exporta tu trabajo inmediatamente y recarga la página.');
            
            if (confirm('¿Deseas recargar la página para liberar memoria?')) {
                window.location.reload();
            }
        }
    }
}

function loadFromStorage() {
    try {
        // Usar las funciones centralizadas de utils.js
        const savedTestCases = loadData('testCases');
        const savedInputVariables = loadData('inputVariableNames');
        const savedRequirementInfo = loadData('requirementInfo');
        
        if (savedTestCases) {
            testCases = savedTestCases;
            try { window.testCases = [...savedTestCases]; } catch(_) {}
        }
        
        if (savedInputVariables) {
            inputVariableNames = savedInputVariables;
        }
        
        if (savedRequirementInfo) {
            requirementInfo = savedRequirementInfo;
        }

        // Asegurar que filteredCases esté inicializado
        filteredCases = [...testCases];

        // 🎯 CRÍTICO: Restaurar timers de bugfixing después de cargar datos
        setTimeout(() => {
            if (typeof restoreBugfixingTimers === 'function') {
                restoreBugfixingTimers();
            }
            // Actualizar UI después de cargar datos
            if (typeof updateAppStats === 'function') {
                updateAppStats();
            }
            if (typeof renderTestCases === 'function') {
                renderTestCases();
            }
            if (typeof updateFilters === 'function') {
                updateFilters();
            }
        }, 100);

    } catch (e) {
        console.error('❌ Error cargando desde localStorage:', e);
        // Inicializar con valores por defecto
        testCases = [];
        inputVariableNames = ['Variable 1', 'Variable 2'];
        filteredCases = [];
    }
}

// ===============================================
// FUNCIONES DE INTEGRACIÓN CON DASHBOARD
// ===============================================

/**
 * Carga un requerimiento desde el dashboard (VERSIÓN INDEXEDDB)
 */
function loadRequirementFromDashboard(requirementId) {
    try {
        // Obtener datos del dashboard desde IndexedDB
        let dashboardData = null;
        
        if (typeof window.IndexedDBManager !== 'undefined' && window.IndexedDBManager.loadFromIndexedDB) {
            // Intentar cargar desde IndexedDB
            window.IndexedDBManager.loadFromIndexedDB('dashboardData').then(data => {
                if (data && data.requirements) {
                    const requirement = data.requirements.find(req => req.id === requirementId);
                    if (requirement) {
                        loadRequirementData(requirement);
                    } else {
                        console.warn('⚠️ Requerimiento no encontrado en IndexedDB');
                    }
                } else {
                    console.warn('⚠️ No hay datos del dashboard en IndexedDB');
                }
            }).catch(() => {
                // Fallback a localStorage
                const fallbackData = localStorage.getItem('dashboardData');
                if (fallbackData) {
                    const data = JSON.parse(fallbackData);
                    const requirement = data.requirements.find(req => req.id === requirementId);
                    if (requirement) {
                        loadRequirementData(requirement);
                    }
                }
            });
            return true;
        } else {
            // Fallback: cargar desde localStorage
            dashboardData = localStorage.getItem('dashboardData');
            if (!dashboardData) {
                console.warn('⚠️ No hay datos del dashboard disponibles');
                return false;
            }
            
            const data = JSON.parse(dashboardData);
            const requirement = data.requirements.find(req => req.id === requirementId);
        }
        
        if (!requirement) {
            console.warn('⚠️ Requerimiento no encontrado en el dashboard');
            return false;
        }
        
        loadRequirementData(requirement);
        return true;
        
    } catch (error) {
        console.error('❌ Error cargando requerimiento desde dashboard:', error);
        return false;
    }
}

/**
 * Carga los datos de un requerimiento específico
 */
function loadRequirementData(requirement) {
    try {
        
        if (!requirement) {
            console.warn('⚠️ Requerimiento no encontrado en el dashboard');
            return false;
        }
        
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
        console.log('🔍 DEBUG loadRequirementData - Casos existentes:', multicaseRequirement.cases.length);
        if (multicaseRequirement.cases.length === 0) {
            console.log('🚨 DEBUG loadRequirementData - CREANDO CASO VACÍO porque no hay casos');
            multicaseRequirement.cases.push(createEmptyCase());
        } else {
            console.log('✅ DEBUG loadRequirementData - NO creando caso vacío, ya hay casos');
        }
        
        // Establecer como requerimiento activo
        window.currentRequirement = multicaseRequirement;
        window.currentCaseId = multicaseRequirement.cases.length > 0 ? multicaseRequirement.cases[0].id : null;
        window.multicaseMode = true;
        
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
        saveMulticaseData();
        
        // Actualizar la interfaz multicaso con delay (y único wiring tardío)
        setTimeout(() => {
            if (typeof updateMulticaseUI === 'function') {
                updateMulticaseUI();
            }
            
            // Forzar actualización del header
            if (typeof createRequirementHeader === 'function') {
                createRequirementHeader();
            }
            
            // Único wiring tardío de listeners
            setTimeout(() => {
                setupLateEventListeners();
            }, 400);
        }, 100);
        
        console.log(`✅ Requerimiento "${requirement.name}" cargado desde dashboard`);
        return true;
        
    } catch (error) {
        console.error('❌ Error cargando requerimiento desde dashboard:', error);
        return false;
    }
}

// ===============================================
// FUNCIONES DE NAVEGACIÓN DEL DASHBOARD
// ===============================================

/**
 * Configura la navegación del dashboard
 */
function setupDashboardNavigation() {
    // console.log('ℹ️ setupDashboardNavigation() - Los botones se configuran en setupLateEventListeners()');
    
    // Botón de editar requerimiento removido - ahora se maneja desde el header
}

/**
 * Sincroniza datos con el dashboard
 */
function syncWithDashboard() {
    try {
        if (currentRequirement) {
            // CRÍTICO: Sincronizar window.currentRequirement con currentRequirement
            if (typeof window !== 'undefined') {
                window.currentRequirement = currentRequirement;
                console.log('🔄 [Dashboard] Sincronizando window.currentRequirement con currentRequirement');
            }
            
            // Usar el sistema de sincronización centralizado
            if (typeof syncAppToDashboard === 'function') {
                syncAppToDashboard();
            } else {
                // Fallback al método anterior
                const dashboardData = localStorage.getItem('dashboardData');
                if (dashboardData) {
                    const data = JSON.parse(dashboardData);
                    
                    // Encontrar el requerimiento en el dashboard
                    const requirementIndex = data.requirements.findIndex(req => req.id === currentRequirement.id);
                    
                    if (requirementIndex !== -1) {
                        // Actualizar estadísticas
                        data.requirements[requirementIndex].stats = {
                            totalCases: currentRequirement.cases.length,
                            completedCases: currentRequirement.cases.filter(c => c.status === 'completed').length,
                            totalScenarios: currentRequirement.cases.reduce((sum, c) => sum + (c.scenarios?.length || 0), 0),
                            completedScenarios: currentRequirement.cases.reduce((sum, c) => 
                                sum + (c.scenarios?.filter(s => s.status === 'completed').length || 0), 0)
                        };
                        
                        // Actualizar fecha de modificación
                        data.requirements[requirementIndex].updatedAt = new Date().toISOString();
                        
                        // Guardar datos actualizados
                        localStorage.setItem('dashboardData', JSON.stringify(data));
                        console.log('✅ Datos sincronizados con dashboard');
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error sincronizando con dashboard:', error);
    }
}

// ===============================================
// FUNCIONES DE INICIALIZACIÓN - SOLO MULTICASO
// ===============================================

function initializeApp() {
    // console.log('🚀 Inicializando aplicación...');
    
    // 🎯 PASO 1: Verificar si hay un requerimiento activo del dashboard
    const activeRequirementId = localStorage.getItem('activeRequirementId');
    // console.log('🔍 ID de requerimiento activo:', activeRequirementId);
    
    if (activeRequirementId) {
        // console.log('📥 Cargando requerimiento desde dashboard...');
        
        // 🎯 VERIFICAR SI YA ESTAMOS EN EL REQUERIMIENTO CORRECTO
        const currentReqId = localStorage.getItem('currentRequirement');
        let currentReq = null;
        try {
            currentReq = currentReqId ? JSON.parse(currentReqId) : null;
        } catch (e) {
            currentReq = null;
        }
        
        // Si ya estamos en el requerimiento correcto, NO limpiar datos
        if (currentReq && currentReq.id === activeRequirementId) {
            // console.log('✅ Ya estamos en el requerimiento correcto, manteniendo datos...');
            localStorage.removeItem('activeRequirementId');
            
            // 🚨 CRÍTICO: Configurar event listeners aunque no se recarguen datos
            // console.log('🔄 Reconfigurando event listeners después de navegación...');
            setTimeout(() => {
                // console.log('🚨 FORZANDO setupLateEventListeners...');
                setupLateEventListeners();
            }, 500);
            
            // 🚨 DOBLE SEGURIDAD: También configurar después de más tiempo
            setTimeout(() => {
                // console.log('🚨 SEGUNDA EJECUCIÓN de setupLateEventListeners...');
                setupLateEventListeners();
            }, 2000);
            
            // 🚨 TRIPLE SEGURIDAD: Configurar después de que TODO se cargue
            setTimeout(() => {
                // console.log('🚨 TERCERA EJECUCIÓN de setupLateEventListeners...');
                setupLateEventListeners();
            }, 4000);
            
            return;
        }
        
        // 🎯 PASO 1: LIMPIAR DATOS LEGACY Y CARGAR DESDE DASHBOARD
        console.log('🧹 Limpiando datos legacy antes de cargar desde dashboard...');
        
        // Limpiar datos legacy que causan problemas
        localStorage.removeItem('multicaseData');
        localStorage.removeItem('currentRequirement');
        localStorage.removeItem('currentCaseId');
        localStorage.removeItem('testCases');
        
        // Marcar sync en progreso y limpiar ID activo ANTES de iniciar para evitar flujos paralelos
        try { window.syncFromDashboardInProgress = true; } catch(_) {}
        localStorage.removeItem('activeRequirementId');

        // Siempre cargar desde dashboard para requerimientos nuevos
        if (typeof syncDashboardToApp === 'function') {
            console.log('✅ Cargando requerimiento desde dashboard...');
            syncDashboardToApp(activeRequirementId);
        } else {
            console.log('⚠️ Usando fallback loadRequirementFromDashboard');
            loadRequirementFromDashboard(activeRequirementId);
        }
        
        // Salida temprana: la sincronización ya disparará el render y wiring necesarios
        return;
    } else {
        // console.log('📂 No hay requerimiento activo, cargando datos existentes...');
        // 🎯 PASO 2: Cargar datos usando sistema multicaso
        // window.GestorCP.Storage fue eliminado durante la limpieza legacy
        if (typeof loadMulticaseData === 'function') {
            // Fallback al sistema anterior si no está disponible el unificado
            const loaded = loadMulticaseData();
            
            if (!loaded) {
                enableMulticaseMode();
            }
        }
    }
    
    // console.log('📊 Estado después de carga:', {
    //     currentRequirement: currentRequirement ? 'Existe' : 'No existe',
    //     currentCaseId: currentCaseId,
    //     multicaseMode: multicaseMode
    // });
    
    // Verificar si hay requerimiento activo después de la sincronización
    if (activeRequirementId && currentRequirement) {
        // console.log('✅ Requerimiento cargado correctamente desde dashboard');
    } else if (activeRequirementId && !currentRequirement) {
        if (!window.syncFromDashboardInProgress) {
            console.warn('⚠️ Aún no se estableció el requerimiento (esperando sync)');
        }
    }

    // 🎯 PASO 3: Sistema unificado eliminado durante limpieza legacy
    // Las funciones migrateLegacyToUnified y restoreArchitectureBackup fueron eliminadas
    // junto con window.GestorCP.Data durante la limpieza legacy

    // 🎯 PASO 3: Configurar event listeners esenciales SOLO para multicaso
    setupEssentialEventListeners();
    
    // 🎯 PASO 4: Configurar botón de regreso al dashboard
    setupDashboardNavigation();
    
    // 🎯 PASO 4.5: Única reconfiguración tardía de listeners
    setTimeout(() => { setupLateEventListeners(); }, 800);
    
    // 🎯 PASO 5: Configurar sincronización automática
    if (typeof setupAutoSync === 'function') {
        setupAutoSync();
    }

    // 🎯 PASO 4: Ocultar interfaz original INMEDIATAMENTE
    hideOriginalInterface();

    // 🎯 PASO 5: Actualizar interfaz multicaso
    setTimeout(() => {
        if (typeof updateMulticaseUI === 'function') {
            updateMulticaseUI();
        }
        
        // Forzar actualización del header si hay requerimiento activo
        if (currentRequirement && typeof createRequirementHeader === 'function') {
            createRequirementHeader();
        }
        
        if (typeof renderTestCases === 'function') {
            renderTestCases();
        }
        if (typeof updateStats === 'function') {
            updateStats();
        }
        // 🎯 CRÍTICO: Actualizar filtros después de cargar datos
        if (typeof window.ensureFiltersReady === 'function') {
            window.ensureFiltersReady(12, 120);
        } else if (typeof updateFilters === 'function') {
            updateFilters();
        }
        
        // 🎯 CRÍTICO: Restaurar timers de bugfixing
        if (typeof restoreBugfixingTimers === 'function') {
            restoreBugfixingTimers();
            // console.log('✅ Timers de bugfixing restaurados automáticamente');
        }
    }, 50);

    // console.log('✅ Aplicación inicializada en modo multicaso únicamente');
    
    // 🎯 PASO FINAL: Verificar sincronización
    setTimeout(() => {
        verifySynchronization();
    }, 2000);
}

/**
 * Verifica que la sincronización entre dashboard y app funcione correctamente
 */
function verifySynchronization() {
    try {
        console.log('🔍 Verificando sincronización dashboard ↔ app...');
        
        // Verificar que IndexedDB esté disponible
        if (typeof window.IndexedDBManager === 'undefined') {
            console.error('❌ IndexedDBManager no está disponible');
            return false;
        }
        
        // Verificar que las funciones de sincronización existan
        const functions = [
            'loadRequirementFromDashboard',
            'syncDashboardToApp',
            'saveMulticaseData',
            'loadMulticaseData'
        ];
        
        functions.forEach(funcName => {
            if (typeof window[funcName] !== 'function') {
                console.warn(`⚠️ Función ${funcName} no está disponible globalmente`);
            }
        });
        
        console.log('✅ Verificación de sincronización completada');
        return true;
        
    } catch (error) {
        console.error('❌ Error verificando sincronización:', error);
        return false;
    }
}

// ===============================================
// EXPOSICIÓN GLOBAL DE FUNCIONES CRÍTICAS
// ===============================================

// Función para crear un caso vacío
function createEmptyCase() {
    console.log('🚨 createEmptyCase() LLAMADA');
    
    const emptyCase = {
        id: `case_${Date.now()}`,
        caseNumber: "1",
        title: "Caso 1",
        objective: "Casos de prueba principales",
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
            successRate: 0,
            cycles: []
        }
    };
    
    console.log('🚨 createEmptyCase() RESULTADO:', emptyCase.id);
    return emptyCase;
}

// Exponer funciones de sincronización globalmente
window.loadRequirementFromDashboard = loadRequirementFromDashboard;
window.createEmptyCase = createEmptyCase;
window.loadRequirementData = loadRequirementData;
window.verifySynchronization = verifySynchronization;

// 🎯 FUNCIÓN PARA OCULTAR INTERFAZ ORIGINAL
function hideOriginalInterface() {
    // Ocultar card de información del requerimiento original
    const oldRequirementInfo = document.getElementById('requirementInfo');
    if (oldRequirementInfo) {
        oldRequirementInfo.style.display = 'none';
    }

    // Ocultar cualquier otro elemento de la interfaz original
    const elementsToHide = [
        '.requirement-card',
        '#currentCaseHeader'
    ];

    elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.id !== 'requirementHeader') { // No ocultar el header multicaso
                el.style.display = 'none';
            }
        });
    });

    // console.log('✅ Interfaz original ocultada');
}

/**
 * Configura event listeners tardíos (después de que todos los scripts carguen)
 */
function setupLateEventListeners() {
    // console.log('🔄 Configurando event listeners tardíos...');
    
    // 🚨 DECISIÓN DRASTICA: Configurar botones de forma más robusta
    const buttons = [
        { id: 'btnAddCase', func: 'openAddModal', name: 'Nuevo Escenario' },
        { id: 'btnBackToDashboard', func: 'goToDashboard', name: 'Dashboard' },
        { id: 'btnGenerateReport', func: 'openReportPreview', name: 'Reportes' },
        { id: 'btnClearAll', func: 'clearAllData', name: 'Limpiar Todo' }
    ];
    
    buttons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            // console.log(`🔍 Configurando ${button.name}`);
            
            // 🚨 DRASTICO: Eliminar TODOS los event listeners y reconfigurar
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            // Agregar nuevo event listener con verificación robusta
            newElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🔄 Click en ${button.name}`);
                
                // Verificar si la función existe
                // console.log(`🔍 Verificando función ${button.func}:`, typeof window[button.func]);
                // console.log(`🔍 window.${button.func} existe:`, typeof window[button.func] === 'function');
                
                if (typeof window[button.func] === 'function') {
                    try {
                        // console.log(`🚀 Ejecutando ${button.func}...`);
                        window[button.func]();
                        // console.log(`✅ ${button.func} ejecutado correctamente`);
                    } catch (error) {
                        console.error(`❌ Error ejecutando ${button.func}:`, error);
                        if (typeof showError === 'function') {
                            showError(`Error ejecutando ${button.name}. Recarga la página.`, 'Error');
                        } else {
                            alert(`Error ejecutando ${button.name}. Recarga la página.`);
                        }
                    }
                } else {
                    console.error(`❌ ${button.func} no está disponible`);
                    console.error(`❌ Funciones disponibles en window:`, Object.keys(window).filter(key => typeof window[key] === 'function').slice(0, 10));
                    if (typeof showError === 'function') {
                        showError(`Función ${button.name} no disponible. Recarga la página.`, 'Error');
                    } else {
                        alert(`Función ${button.name} no disponible. Recarga la página.`);
                    }
                }
            });
            
            // console.log(`✅ ${button.name} configurado correctamente`);
        } else {
            console.warn(`⚠️ ${button.id} no encontrado en el DOM`);
        }
    });
    
    // 🚨 CRÍTICO: También reconfigurar event listeners del modal
    // console.log('🔄 Reconfigurando event listeners del modal...');
    if (typeof setupModalEventListeners === 'function') {
        setupModalEventListeners();
        // console.log('✅ Event listeners del modal reconfigurados');
    } else {
        console.warn('⚠️ setupModalEventListeners no está disponible');
    }
    
    // console.log('✅ Event listeners tardíos configurados correctamente');
}

function setupEssentialEventListeners() {
    // Event listeners para filtros
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (window.__applyFiltersRef) {
                window.__applyFiltersRef();
            } else if (typeof window.applyFilters === 'function') {
                window.applyFilters();
            }
        });
    }

    const testerFilter = document.getElementById('testerFilter');
    if (testerFilter) {
        testerFilter.addEventListener('change', () => {
            if (window.__applyFiltersRef) {
                window.__applyFiltersRef();
            } else if (typeof applyFilters === 'function') {
                applyFilters();
            }
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            if (window.__applyFiltersRef) {
                window.__applyFiltersRef();
            } else if (typeof applyFilters === 'function') {
                applyFilters();
            }
        });
    }

    const dateFromFilter = document.getElementById('dateFromFilter');
    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', () => {
            if (window.__applyFiltersRef) {
                window.__applyFiltersRef();
            } else if (typeof applyFilters === 'function') {
                applyFilters();
            }
        });
    }

    const dateToFilter = document.getElementById('dateToFilter');
    if (dateToFilter) {
        dateToFilter.addEventListener('change', () => {
            if (window.__applyFiltersRef) {
                window.__applyFiltersRef();
            } else if (typeof applyFilters === 'function') {
                applyFilters();
            }
        });
    }

    // Event listeners para botones principales - ELIMINADO PARA EVITAR CONFLICTOS
    // Los event listeners se configuran en setupLateEventListeners()
    // console.log('ℹ️ Event listeners de botones se configurarán en setupLateEventListeners()');

    const btnNewRequirement = document.getElementById('btnNewRequirement');
    if (btnNewRequirement) {
        btnNewRequirement.addEventListener('click', () => {
            if (typeof openRequirementModal === 'function') {
                openRequirementModal();
            }
        });
    }

    // Event listeners para modales
    setupModalEventListeners();
    
    // ✅ Event listeners configurados correctamente
}

function setupModalEventListeners() {
    // Modal principal de casos
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (typeof closeModal === 'function') closeModal();
        });
    }

    const btnCancelModal = document.getElementById('btnCancelModal');
    if (btnCancelModal) {
        btnCancelModal.addEventListener('click', () => {
            if (typeof closeModal === 'function') closeModal();
        });
    }

    // Event listener para subida de evidencias
    const evidenceInput = document.getElementById('evidenceInput');
    if (evidenceInput) {
        evidenceInput.addEventListener('change', () => {
            if (typeof handleEvidenceUpload === 'function') handleEvidenceUpload();
        });
    }

    // Modal de evidencias
    const closeEvidenceModalBtn = document.getElementById('closeEvidenceModalBtn');
    if (closeEvidenceModalBtn) {
        closeEvidenceModalBtn.addEventListener('click', () => {
            document.getElementById('evidenceViewModal').style.display = 'none';
        });
    }

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function (event) {
        const modals = ['testCaseModal', 'evidenceViewModal', 'configVarsModal', 'requirementModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// ===============================================
// FUNCIÓN PARA LIMPIAR TODOS LOS DATOS
// ===============================================

function clearAllData() {
    const confirmMessage = `⚠️ ¿Estás seguro de que deseas limpiar los casos y escenarios?

Esto eliminará:
• Todos los casos de prueba
• Todos los escenarios de prueba
• Configuración de variables
• Historial y estadísticas

⚠️ El requerimiento se mantiene intacto.
⚠️ Esta acción NO se puede deshacer.`;

    if (confirm(confirmMessage)) {
        // Limpiar solo casos y escenarios, mantener el requerimiento
        if (currentRequirement) {
            currentRequirement.cases = [];
            currentRequirement.updatedAt = new Date().toISOString();
            currentCaseId = null;
            
            // Guardar cambios
            saveMulticaseData();
        }
        
        // Limpiar variables del sistema original
        testCases = [];
        filteredCases = [];
        inputVariableNames = ['Variable 1', 'Variable 2'];
        requirementInfo = {
            number: '',
            name: '',
            description: '',
            caso: '',
            titleCase: '',
            tester: '',
            startDate: ''
        };
        selectedCases.clear();

        // Detener cronómetro si está activo
        if (activeTimerId !== null && typeof stopRowTimer === 'function') {
            stopRowTimer();
        }

        // Limpiar localStorage de casos
        localStorage.removeItem('testCases');
        localStorage.removeItem('inputVariableNames');
        localStorage.removeItem('requirementInfo');
        localStorage.removeItem('activeTab');

        // Actualizar interfaz
        if (typeof renderTestCases === 'function') renderTestCases();
        if (typeof updateStats === 'function') updateStats();
        if (typeof updateFilters === 'function') updateFilters();
        if (typeof updateMulticaseUI === 'function') updateMulticaseUI();

        // Sincronizar con dashboard
        if (typeof syncAppToDashboard === 'function') {
            syncAppToDashboard();
        }

        updateRequirementButtons();

        alert('✅ Todos los datos han sido eliminados correctamente');
        console.log('🗑️ Todos los datos eliminados');
    }
}

// ===============================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA - SOLO MULTICASO
// ===============================================

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // Si el documento ya está cargado
    initializeApp();
}
// =====================================================
// Binder de rescate para IO (JSON/Excel) - idempotente
// Se asegura de cablear los botones, aun si otro script falló.
// =====================================================
(function ensureIOBinders() {
    function bindOnce() {
        const map = [
            ['btnSaveCases', () => window.exportProjectJSONv3?.()],
            ['btnLoadCases', () => window.importProjectJSONAuto?.()],
            ['btnExportExcel', () =>
            (typeof window.exportAllCasesToExcel === 'function'
                ? window.exportAllCasesToExcel()
                : (typeof window.exportToExcel === 'function'
                    ? window.exportToExcel()
                    : alert('Función Exportar Excel no disponible.')))
            ],
            ['btnImportExcel', () => (typeof window.importFromExcel === 'function' ? window.importFromExcel() : alert('Función Importar Excel no disponible.'))],
        ];

        let bound = 0;
        for (const [id, handler] of map) {
            const el = document.getElementById(id);
            if (!el) continue;
            // Evitar duplicados
            el.onclick = (e) => { e.preventDefault(); try { handler(); } catch (err) { console.error(`❌ Error en ${id}:`, err); alert(`Error en ${id}`); } };
            bound++;
        }
        // console.log(`🔗 IO binders aplicados: ${bound}`);
    }

    // Ejecutar ahora (si el DOM ya cargó) y también después de DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindOnce);
    } else {
        bindOnce();
    }
    // Reintento tardío por si otros scripts modifican el DOM
    setTimeout(bindOnce, 400);
    setTimeout(bindOnce, 1200);

    // Pequeña utilidad de depuración
    window.__dumpIO = () => ({
        btnSave: document.getElementById('btnSaveCases')?.onclick?.toString()?.slice(0, 80) || null,
        btnLoad: document.getElementById('btnLoadCases')?.onclick?.toString()?.slice(0, 80) || null,
        btnEx: document.getElementById('btnExportExcel')?.onclick?.toString()?.slice(0, 80) || null,
        btnIm: document.getElementById('btnImportExcel')?.onclick?.toString()?.slice(0, 80) || null,
    });
})();

// =====================================================
// 🔧 HOTFIX JSON v3 - Definiciones mínimas (export/import)
// Pegar al FINAL de js/core.js
// =====================================================
(function JSONv3Hotfix() {
    // Evitar re-definir si ya existe
    if (typeof window.exportProjectJSONv3 !== 'function') {
        window.exportProjectJSONv3 = function exportProjectJSONv3() {
            try {
                const req = (function () {
                    try { if (typeof currentRequirement !== 'undefined' && currentRequirement) return currentRequirement; } catch (_) { }
                    return window.currentRequirement || null;
                })();
                if (!req || !Array.isArray(req.cases) || req.cases.length === 0) {
                    alert("⚠️ No hay requerimiento para exportar");
                    return;
                }
                if (typeof window.saveMulticaseData === 'function') {
                    window.saveMulticaseData();
                }

                const data = {
                    version: "3.0",
                    type: "multicase-project",
                    exportedAt: new Date().toISOString(),
                    requirement: (req.info || {}),
                    cases: (req.cases || []).map(hardenCaseForExportHotfix),
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `proyecto_multicaso_${new Date().toISOString().split("T")[0]}.json`;
                // Mostrar mensaje de "Listo para guardar" antes de hacer click
                showInfo("Archivo JSON listo. Se abrirá el explorador para que elijas dónde guardarlo.", "Listo para guardar");
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log("✅ Exportación JSON v3 (hotfix) completada");
            } catch (e) {
                console.error("❌ exportProjectJSONv3 hotfix:", e);
                alert("❌ Error exportando JSON v3");
            }
        };
    }

    if (typeof window.importProjectJSONAuto !== 'function') {
        window.importProjectJSONAuto = function importProjectJSONAuto() {
            try {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        try {
                            const raw = JSON.parse(evt.target.result);
                            const v3 = normalizeToV3Hotfix(raw);
                            if (!v3) {
                                alert("❌ JSON inválido o incompatible (se esperaba formato multicase v3)");
                                return;
                            }
                            
                            // 🆕 SINCRONIZAR CON DASHBOARD DESPUÉS DE CARGAR
                            applyImportedV3Hotfix(v3, file.name);
                            
                            // Sincronizar con el dashboard después de cargar
        setTimeout(() => {
            if (typeof syncAppToDashboard === 'function') {
                console.log('🔄 Sincronizando con dashboard después de cargar JSON...');
                syncAppToDashboard();
            } else if (typeof syncFromAppToDashboard === 'function') {
                console.log('🔄 Usando syncFromAppToDashboard como fallback...');
                syncFromAppToDashboard();
            }
            
            // 🆕 FORZAR ACTUALIZACIÓN DEL HEADER
            setTimeout(() => {
                if (typeof createRequirementHeader === 'function') {
                    console.log('🔄 Forzando actualización del header después de cargar JSON...');
                    createRequirementHeader();
                }
            }, 200);
        }, 500);
                            
                        } catch (err) {
                            console.error("❌ Error parseando JSON:", err);
                            alert("❌ El archivo no es un JSON válido");
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            } catch (e) {
                console.error("❌ importProjectJSONAuto hotfix:", e);
                alert("❌ Error al cargar JSON");
            }
        };
    }

    // ---- Helpers ----
    function hardenCaseForExportHotfix(caseObj) {
        const c = { ...(caseObj || {}) };
        if (!c.id) c.id = `case_${Date.now()}_${Math.random()}`;
        if (!Array.isArray(c.scenarios)) c.scenarios = [];
        if (!Array.isArray(c.inputVariableNames) || !c.inputVariableNames.length) {
            c.inputVariableNames = ['Variable 1', 'Variable 2'];
        }
        c.scenarios = c.scenarios.map((s, idx) => {
            const sc = { ...(s || {}) };
            if (!sc.id) sc.id = Date.now() + idx;
            return sc;
        });
        return c;
    }

    function ensureCaseDefaultsHotfix(c) {
        const out = { ...(c || {}) };
        if (!out.id) out.id = `case_${Date.now()}_${Math.random()}`;
        if (!("title" in out)) out.title = "Caso";
        if (!("objective" in out)) out.objective = "";
        if (!("caseNumber" in out)) out.caseNumber = "1";
        if (!Array.isArray(out.inputVariableNames) || !out.inputVariableNames.length) {
            out.inputVariableNames = ['Variable 1', 'Variable 2'];
        }
        if (!Array.isArray(out.scenarios)) out.scenarios = [];
        out.scenarios = out.scenarios.map((s, idx) => {
            const sc = { ...(s || {}) };
            if (!sc.id) sc.id = Date.now() + idx;
            return sc;
        });
        return out;
    }

    function normalizeToV3Hotfix(data) {
        if (!data || typeof data !== "object") return null;

        // Ya es v3
        if (data.type === "multicase-project" && Array.isArray(data.cases)) {
            return {
                version: data.version === "3" ? "3.0" : (data.version || "3.0"),
                type: "multicase-project",
                exportedAt: data.exportedAt || new Date().toISOString(),
                requirement: data.requirement || {},
                cases: (data.cases || []).map(ensureCaseDefaultsHotfix)
            };
        }

        // Legacy v2: { version:"2.0", testCases:[...], requirementInfo, inputVariableNames }
        const looksV2 = (
            (data.version === "2.0" || data.version === "2") &&
            (Array.isArray(data.testCases) || Array.isArray(data.casos) || Array.isArray(data.escenarios))
        ) || (
                Array.isArray(data.testCases) && (data.requirementInfo || data.inputVariableNames)
            );

        if (looksV2) {
            console.log("🔁 Detectado JSON legacy v2 → migrando a v3 (hotfix)...");
            const reqInfo = data.requirementInfo || {};
            const legacyTC = Array.isArray(data.testCases) ? data.testCases : [];
            const varNames = Array.isArray(data.inputVariableNames) && data.inputVariableNames.length
                ? data.inputVariableNames : ['Variable 1', 'Variable 2'];

            const migratedCase = ensureCaseDefaultsHotfix({
                id: `case_${Date.now()}`,
                caseNumber: "1",
                title: reqInfo.titleCase || "Caso 1",
                objective: "Migrado desde JSON v2",
                inputVariableNames: varNames,
                scenarios: legacyTC.map((s, idx) => {
                    const sc = { ...(s || {}) };
                    if (!sc.id) sc.id = Date.now() + idx;
                    return sc;
                })
            });

            return {
                version: "3.0",
                type: "multicase-project",
                exportedAt: new Date().toISOString(),
                requirement: {
                    number: reqInfo.number || "",
                    name: reqInfo.name || "",
                    description: reqInfo.description || "",
                    caso: reqInfo.caso || "",
                    titleCase: reqInfo.titleCase || "",
                    tester: reqInfo.tester || "",
                    startDate: reqInfo.startDate || ""
                },
                cases: [migratedCase]
            };
        }

        return null;
    }

    function applyImportedV3Hotfix(v3, fileName) {
        // Reemplazar TODO
        try {
            if (typeof window.createEmptyRequirement === 'function') {
                window.currentRequirement = {
                    ...window.createEmptyRequirement(),
                    info: v3.requirement || {},
                    cases: (v3.cases || []).map(hardenCaseForExportHotfix)
                };
            } else {
                // Fallback muy básico
                window.currentRequirement = {
                    id: `req_${Date.now()}`,
                    version: "3.0-multicaso",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    info: v3.requirement || {},
                    cases: (v3.cases || []).map(hardenCaseForExportHotfix),
                    stats: { totalCases: 0, totalScenarios: 0, totalHours: 0, totalOK: 0, totalNO: 0, totalPending: 0, successRate: 0, activeCycles: [] }
                };
            }

            window.currentCaseId = (window.currentRequirement.cases?.[0]?.id) || null;
            window.multicaseMode = true;

            if (typeof window.updateRequirementStats === 'function') window.updateRequirementStats(window.currentRequirement);
            if (typeof window.saveMulticaseData === 'function') window.saveMulticaseData();

            if (typeof window.switchToCase === 'function' && window.currentCaseId) window.switchToCase(window.currentCaseId);

            if (typeof window.updateMulticaseUI === 'function') window.updateMulticaseUI();
        if (typeof window.renderTestCases === 'function') window.renderTestCases();
        if (typeof window.updateAppStats === 'function') window.updateAppStats();
        if (typeof window.updateFilters === 'function') window.updateFilters();
        if (typeof window.applyFilters === 'function') window.applyFilters();
        
        // 🧩 Asegurar filtros tras inicialización completa
        setTimeout(() => {
            console.log('🔍 CORE INIT: Aplicando filtros tras inicialización...');
            try {
                if (typeof window.ensureFiltersReady === 'function') {
                    window.ensureFiltersReady(10, 150);
                }
            } catch (e) {
                console.error('❌ Error en core init filters:', e);
            }
        }, 1000);
            if (typeof window.updateRequirementButtons === 'function') window.updateRequirementButtons();

            console.log(`✅ Proyecto importado (hotfix) desde ${fileName}`);
            alert(`✅ Proyecto importado exitosamente\n📂 Archivo: ${fileName}\n📁 Casos: ${window.currentRequirement.cases.length}`);
        } catch (e) {
            console.error("❌ applyImportedV3Hotfix:", e);
            alert("❌ Error aplicando datos del JSON");
        }
    }

// ===============================================
// 🧹 OPTIMIZACIÓN DE DATOS - ELIMINAR DUPLICACIÓN
// ===============================================

/**
 * Optimiza y consolida datos en localStorage para reducir duplicación
 */
function optimizeLocalStorageData() {
    console.log('🧹 INICIANDO OPTIMIZACIÓN DE DATOS...');
    
    try {
        // 1. Verificar si hay datos duplicados
        const multicaseData = localStorage.getItem('multicaseData');
        const dashboardData = localStorage.getItem('dashboardData');
        const dashboardRequirements = localStorage.getItem('dashboardRequirements');
        
        let spaceSaved = 0;
        
        // 2. Eliminar dashboardRequirements completamente (ya no se usa)
        if (dashboardRequirements) {
            try {
                const size = new Blob([dashboardRequirements]).size;
                localStorage.removeItem('dashboardRequirements');
                spaceSaved += size;
                console.log(`✅ Eliminado dashboardRequirements (obsoleto): ${(size / 1024).toFixed(2)} KB`);
            } catch (e) {
                console.log('⚠️ No se pudo eliminar dashboardRequirements');
            }
        }
        
        // 3. Limpiar datos temporales y de respaldo
        const keysToClean = [
            'currentRequirement_backup',
            'testCases_backup',
            'debugLogs',
            'tempData',
            'cache',
            'sessionData',
            'oldData',
            'backup',
            'logs'
        ];
        
        keysToClean.forEach(key => {
            if (localStorage.getItem(key)) {
                const size = new Blob([localStorage.getItem(key)]).size;
                localStorage.removeItem(key);
                spaceSaved += size;
                console.log(`✅ Eliminado ${key}: ${(size / 1024).toFixed(2)} KB`);
            }
        });
        
        console.log(`🧹 OPTIMIZACIÓN COMPLETADA: ${(spaceSaved / 1024).toFixed(2)} KB liberados`);
        return { spaceSaved, cleanedItems: keysToClean.length };
        
    } catch (error) {
        console.error('❌ Error en optimización:', error);
        return { spaceSaved: 0, cleanedItems: 0 };
    }
}

// ===============================================
// 🚨 FUNCIONES DE EMERGENCIA - LOCALSTORAGE LLENO
// ===============================================

/**
 * 🚨 DIAGNÓSTICO DE LOCALSTORAGE - SOLUCIÓN DE EMERGENCIA
 */
function diagnoseLocalStorage() {
    console.log('🔍 DIAGNÓSTICO DE LOCALSTORAGE:');
    console.log('=====================================');
    
    let totalSize = 0;
    const items = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;
        
        totalSize += size;
        items.push({
            key: key,
            size: size,
            sizeKB: (size / 1024).toFixed(2),
            preview: value.substring(0, 100) + (value.length > 100 ? '...' : '')
        });
    }
    
    // Ordenar por tamaño (mayores primero)
    items.sort((a, b) => b.size - a.size);
    
    console.log(`📊 TOTAL: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 LÍMITE APROX: ~5-10 MB`);
    console.log('📋 ITEMS (ordenados por tamaño):');
    
    items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.key}: ${item.sizeKB} KB`);
        console.log(`   Preview: ${item.preview}`);
    });
    
    return { totalSize, items };
}

/**
 * 🧹 LIMPIEZA DE LOCALSTORAGE - SOLUCIÓN DE EMERGENCIA
 */
function cleanupLocalStorage() {
    console.log('🧹 INICIANDO LIMPIEZA DE LOCALSTORAGE...');
    
    const diagnosis = diagnoseLocalStorage();
    
    // Lista de claves a limpiar (datos temporales, logs, etc.)
    const keysToClean = [
        'debugLogs',
        'tempData',
        'cache',
        'dashboardRequirements', // Eliminar obsoleto
        'currentRequirement',    // Eliminar duplicado
        'testCases',            // Eliminar duplicado
        'sessionData',
        'oldData',
        'backup',
        'logs'
    ];
    
    let cleanedCount = 0;
    let cleanedSize = 0;
    
    keysToClean.forEach(key => {
        if (localStorage.getItem(key)) {
            const size = new Blob([localStorage.getItem(key)]).size;
            localStorage.removeItem(key);
            cleanedCount++;
            cleanedSize += size;
            console.log(`✅ Eliminado: ${key} (${(size / 1024).toFixed(2)} KB)`);
        }
    });
    
    console.log(`🧹 LIMPIEZA COMPLETADA:`);
    console.log(`   - Items eliminados: ${cleanedCount}`);
    console.log(`   - Espacio liberado: ${(cleanedSize / 1024).toFixed(2)} KB`);
    
    return { cleanedCount, cleanedSize };
}

/**
 * 🧹 LIMPIEZA AGRESIVA DE LOCALSTORAGE
 */
function aggressiveCleanup() {
    console.log('🧹 INICIANDO LIMPIEZA AGRESIVA...');
    
    const keysToKeep = [
        'testCases',
        'inputVariableNames', 
        'requirementInfo',
        'multicaseData',
        'dashboardRequirements',
        'dashboardData'
    ];
    
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
    }
    
    let cleanedCount = 0;
    let cleanedSize = 0;
    
    allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
            const size = new Blob([localStorage.getItem(key)]).size;
            localStorage.removeItem(key);
            cleanedCount++;
            cleanedSize += size;
            console.log(`🗑️ Eliminado: ${key} (${(size / 1024).toFixed(2)} KB)`);
        }
    });
    
    console.log(`🧹 LIMPIEZA AGRESIVA COMPLETADA:`);
    console.log(`   - Items eliminados: ${cleanedCount}`);
    console.log(`   - Espacio liberado: ${(cleanedSize / 1024).toFixed(2)} KB`);
    
    return { cleanedCount, cleanedSize };
}

// Exponer funciones globalmente para diagnóstico
window.diagnoseLocalStorage = diagnoseLocalStorage;
window.cleanupLocalStorage = cleanupLocalStorage;
window.aggressiveCleanup = aggressiveCleanup;

})();

