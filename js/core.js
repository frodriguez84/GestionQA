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

function saveToStorage() {
    try {
        localStorage.setItem('testCases', JSON.stringify(testCases));
        localStorage.setItem('inputVariableNames', JSON.stringify(inputVariableNames));
        localStorage.setItem('requirementInfo', JSON.stringify(requirementInfo));
        console.log('✅ Datos guardados en localStorage');
    } catch (e) {
        console.error('❌ Error guardando en localStorage:', e);
        alert('Error al guardar datos. Espacio de almacenamiento lleno.');
    }
}

function loadFromStorage() {
    try {
        // Cargar casos de prueba
        const savedCases = localStorage.getItem('testCases');
        if (savedCases) {
            testCases = JSON.parse(savedCases);
        }

        // Cargar variables de entrada
        const savedVars = localStorage.getItem('inputVariableNames');
        if (savedVars) {
            inputVariableNames = JSON.parse(savedVars);
        }

        // Cargar información del requerimiento
        const savedReqInfo = localStorage.getItem('requirementInfo');
        if (savedReqInfo) {
            requirementInfo = JSON.parse(savedReqInfo);
        }

        // Asegurar que filteredCases esté inicializado
        filteredCases = [...testCases];

        console.log('✅ Datos cargados desde localStorage');
        // console.log(`📊 ${testCases.length} casos cargados`);

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
 * Carga un requerimiento desde el dashboard
 */
function loadRequirementFromDashboard(requirementId) {
    try {
        // Obtener datos del dashboard
        const dashboardData = localStorage.getItem('dashboardData');
        if (!dashboardData) {
            console.warn('⚠️ No hay datos del dashboard disponibles');
            return false;
        }
        
        const data = JSON.parse(dashboardData);
        const requirement = data.requirements.find(req => req.id === requirementId);
        
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
            cases: requirement.cases || [],
            createdAt: requirement.createdAt,
            updatedAt: requirement.updatedAt
        };
        
        // Establecer como requerimiento activo
        currentRequirement = multicaseRequirement;
        currentCaseId = multicaseRequirement.cases.length > 0 ? multicaseRequirement.cases[0].id : null;
        multicaseMode = true;
        
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
        
        // Actualizar la interfaz multicaso con delay
        setTimeout(() => {
            if (typeof updateMulticaseUI === 'function') {
                updateMulticaseUI();
            }
            
            // Forzar actualización del header
            if (typeof createRequirementHeader === 'function') {
                createRequirementHeader();
            }
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
    const backBtn = document.getElementById('btnBackToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Sincronizar datos antes de regresar
            syncWithDashboard();
            // Redirigir al dashboard
            window.location.href = 'dashboard.html';
        });
    }
    
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
    console.log('🚀 Inicializando aplicación...');
    
    // 🎯 PASO 1: Verificar si hay un requerimiento activo del dashboard
    const activeRequirementId = localStorage.getItem('activeRequirementId');
    console.log('🔍 ID de requerimiento activo:', activeRequirementId);
    
    if (activeRequirementId) {
        console.log('📥 Cargando requerimiento desde dashboard...');
        // Sincronizar requerimiento desde el dashboard
        if (typeof syncDashboardToApp === 'function') {
            console.log('✅ Usando syncDashboardToApp');
            syncDashboardToApp(activeRequirementId);
        } else {
            console.log('⚠️ Usando fallback loadRequirementFromDashboard');
            // Fallback al método anterior
            loadRequirementFromDashboard(activeRequirementId);
        }
        // Limpiar el ID activo
        localStorage.removeItem('activeRequirementId');
        console.log('🧹 ID de requerimiento activo limpiado');
    } else {
        console.log('📂 No hay requerimiento activo, cargando datos existentes...');
        // 🎯 PASO 2: Cargar datos multicaso existentes
        const loaded = loadMulticaseData();

        if (!loaded) {
            // Si no hay datos multicaso, crear uno vacío
            console.log('🆕 Creando nuevo requerimiento multicaso...');
            enableMulticaseMode();
        }
    }
    
    console.log('📊 Estado después de carga:', {
        currentRequirement: currentRequirement ? 'Existe' : 'No existe',
        currentCaseId: currentCaseId,
        multicaseMode: multicaseMode
    });
    
    // Verificar si hay requerimiento activo después de la sincronización
    if (activeRequirementId && currentRequirement) {
        console.log('✅ Requerimiento cargado correctamente desde dashboard');
    } else if (activeRequirementId && !currentRequirement) {
        console.error('❌ Error: Se intentó cargar requerimiento pero no se estableció');
    }

    // 🎯 PASO 3: Inicializar proxies legacy (compatibilidad)
    if (typeof initializeLegacyProxies === 'function') {
        initializeLegacyProxies();
    }

    // 🎯 PASO 4: Sincronizar datos legacy si existen
    if (typeof syncLegacyToMulticase === 'function') {
        syncLegacyToMulticase();
    }

    // 🎯 PASO 3: Configurar event listeners esenciales SOLO para multicaso
    setupEssentialEventListeners();
    
    // 🎯 PASO 4: Configurar botón de regreso al dashboard
    setupDashboardNavigation();
    
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
        if (typeof updateFilters === 'function') {
            updateFilters();
            console.log('✅ Filtros actualizados automáticamente después de inicialización');
        }
    }, 50);

    console.log('✅ Aplicación inicializada en modo multicaso únicamente');
}

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

    console.log('✅ Interfaz original ocultada');
}

function setupEssentialEventListeners() {
    // Event listeners para filtros
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (typeof applyFilters === 'function') applyFilters();
        });
    }

    const testerFilter = document.getElementById('testerFilter');
    if (testerFilter) {
        testerFilter.addEventListener('change', () => {
            if (typeof applyFilters === 'function') applyFilters();
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            if (typeof applyFilters === 'function') applyFilters();
        });
    }

    const dateFromFilter = document.getElementById('dateFromFilter');
    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', () => {
            if (typeof applyFilters === 'function') applyFilters();
        });
    }

    const dateToFilter = document.getElementById('dateToFilter');
    if (dateToFilter) {
        dateToFilter.addEventListener('change', () => {
            if (typeof applyFilters === 'function') applyFilters();
        });
    }

    // Event listeners para botones principales
    const btnAddCase = document.getElementById('btnAddCase');
    if (btnAddCase) {
        btnAddCase.addEventListener('click', () => {
            if (typeof openAddModal === 'function') openAddModal();
        });
    }

    const btnClearAll = document.getElementById('btnClearAll');
    if (btnClearAll) {
        btnClearAll.addEventListener('click', clearAllData);
    }

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
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log("✅ Exportación JSON v3 (hotfix) completada");
                alert("✅ Proyecto exportado en formato JSON v3");
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
                            applyImportedV3Hotfix(v3, file.name);
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
            if (typeof window.updateStats === 'function') window.updateStats();
            if (typeof window.updateRequirementButtons === 'function') window.updateRequirementButtons();

            console.log(`✅ Proyecto importado (hotfix) desde ${fileName}`);
            alert(`✅ Proyecto importado exitosamente\n📂 Archivo: ${fileName}\n📁 Casos: ${window.currentRequirement.cases.length}`);
        } catch (e) {
            console.error("❌ applyImportedV3Hotfix:", e);
            alert("❌ Error aplicando datos del JSON");
        }
    }

})();

