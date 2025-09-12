// ===============================================
// MULTICASE-UI.JS - Interfaz de Usuario Multicaso
// ===============================================

/**
 * Función temporal para formatear fechas (hasta que cases.js se cargue)
 */
function formatDateForDisplay(dateString) {
    if (!dateString || dateString.trim() === '') return '';
    
    try {
        // Si ya está en formato dd-mm-aaaa, devolverlo tal como está
        if (dateString.includes('/') || (dateString.includes('-') && dateString.split('-')[0].length === 2)) {
            return dateString;
        }
        
        // Convertir de yyyy-mm-dd a dd-mm-aaaa
        if (dateString.includes('-') && dateString.length === 10) {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        
        return dateString;
    } catch (e) {
        return dateString;
    }
}

// ===============================================
// FUNCIONES DE INTEGRACIÓN CON DASHBOARD
// ===============================================

/**
 * Obtiene datos del requerimiento desde el dashboard
 */
function getDashboardRequirementData(requirementId) {
    try {
        const dashboardData = localStorage.getItem('dashboardData');
        if (!dashboardData) return null;
        
        const data = JSON.parse(dashboardData);
        const requirement = data.requirements.find(req => req.id === requirementId);
        
        return requirement || null;
    } catch (error) {
        console.error('❌ Error obteniendo datos del dashboard:', error);
        return null;
    }
}

/**
 * Va al dashboard para editar el requerimiento
 */
function goToDashboard() {
    console.log('🚀 goToDashboard() llamada');
    
    // Guardar logs en localStorage para debug entre navegaciones
    const debugLogs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    debugLogs.push({
        timestamp: new Date().toISOString(),
        source: 'APP',
        action: 'goToDashboard',
        message: 'Función llamada'
    });
    
    if (!currentRequirement) {
        console.log('❌ No hay currentRequirement');
        debugLogs.push({
            timestamp: new Date().toISOString(),
            source: 'APP',
            action: 'goToDashboard',
            message: 'ERROR: No hay currentRequirement'
        });
        localStorage.setItem('debugLogs', JSON.stringify(debugLogs));
        alert('❌ No hay requerimiento activo para editar');
        return;
    }
    
    /* console.log('🔄 Sincronizando datos antes de ir al dashboard...');
    console.log('📊 Casos actuales:', currentRequirement.cases?.length || 0);
    console.log('📊 currentRequirement completo:', currentRequirement); */
    
    // Guardar información crítica en localStorage
    debugLogs.push({
        timestamp: new Date().toISOString(),
        source: 'APP',
        action: 'goToDashboard',
        message: `Casos actuales: ${currentRequirement.cases?.length || 0}`,
        data: {
            casesCount: currentRequirement.cases?.length || 0,
            requirementId: currentRequirement.id,
            requirementName: currentRequirement.info?.name,
            windowCurrentRequirementCases: window.currentRequirement?.cases?.length || 0
        }
    });
    
    // CRÍTICO: Sincronizar window.currentRequirement con currentRequirement
    if (typeof window !== 'undefined') {
        window.currentRequirement = currentRequirement;
        /* console.log('🔄 Sincronizando window.currentRequirement con currentRequirement'); */
        debugLogs.push({
            timestamp: new Date().toISOString(),
            source: 'APP',
            action: 'goToDashboard',
            message: 'Sincronizando window.currentRequirement',
            data: {
                beforeSync: window.currentRequirement?.cases?.length || 0,
                afterSync: currentRequirement.cases?.length || 0
            }
        });
    }
    
    if (currentRequirement.cases && currentRequirement.cases.length > 0) {
        /* console.log('📊 Primer caso:', currentRequirement.cases[0].name);
        console.log('📊 Escenarios del primer caso:', currentRequirement.cases[0].scenarios?.length || 0); */
        
        debugLogs.push({
            timestamp: new Date().toISOString(),
            source: 'APP',
            action: 'goToDashboard',
            message: `Primer caso: ${currentRequirement.cases[0].name}, Escenarios: ${currentRequirement.cases[0].scenarios?.length || 0}`,
            data: {
                firstCase: currentRequirement.cases[0].name,
                firstCaseScenarios: currentRequirement.cases[0].scenarios?.length || 0
            }
        });
    }
    
    localStorage.setItem('debugLogs', JSON.stringify(debugLogs));
    
    // Forzar sincronización completa antes de ir al dashboard
    if (typeof forceFullSync === 'function') {
        forceFullSync();
    }
    
    // Sincronizar datos antes de ir al dashboard
    if (typeof syncAppToDashboard === 'function') {
        const syncResult = syncAppToDashboard();
        /* console.log('📊 Resultado de sincronización:', syncResult ? 'Éxito' : 'Falló'); */
    }
    
    // Pequeño delay para asegurar que la sincronización se complete
    setTimeout(() => {
        console.log('🚀 Navegando al dashboard...');
        window.location.href = 'dashboard.html';
    }, 100);
}

// ===============================================
// COMPONENTE: REQUIREMENT HEADER
// ===============================================

/**
 * Crea y actualiza el header principal del requerimiento (MEJORADO)
 */
function createRequirementHeader() {
    /* console.log('🎨 Creando header del requerimiento...'); */
    /* console.log('📊 Estado actual:', {
        hasActiveRequirement: hasActiveRequirement(),
        currentRequirement: currentRequirement ? 'Existe' : 'No existe',
        multicaseMode: multicaseMode
    }); */
    
    if (!hasActiveRequirement()) {
        console.log('⚠️ No hay requerimiento activo, ocultando header');
        // Si no hay requerimiento, ocultar header existente
        const headerContainer = document.getElementById('requirementHeader');
        if (headerContainer) {
            headerContainer.style.display = 'none';
        }
        return;
    }
    
    /* console.log('✅ Creando header para requerimiento:', currentRequirement.info.name); */

    let headerContainer = document.getElementById('requirementHeader');

    if (!headerContainer) {
        headerContainer = document.createElement('div');
        headerContainer.id = 'requirementHeader';
        headerContainer.className = 'requirement-header-multicaso';

        // Insertar después del header actual
        const currentHeader = document.querySelector('.header');
        if (currentHeader) {
            currentHeader.parentNode.insertBefore(headerContainer, currentHeader.nextSibling);
        }

        // OCULTAR la card vieja para evitar duplicación
        const oldRequirementInfo = document.getElementById('requirementInfo');
        if (oldRequirementInfo) {
            oldRequirementInfo.style.display = 'none';
        }
    } else {
        // Asegurar que esté visible cuando hay requerimiento
        headerContainer.style.display = 'block';
    }

    const requirement = currentRequirement;
    if (!requirement) return;

    const stats = requirement.stats || { totalCases: 0, totalScenarios: 0, totalHours: 0, successRate: 0 };
    const currentCase = getCurrentCase();

    // Calcular fecha del primer escenario ejecutado del caso actual
    const firstExecutionDate = currentCase ? getFirstExecutionDate(currentCase) : null;

    // Obtener datos del dashboard si están disponibles
    const dashboardData = getDashboardRequirementData(requirement.id);
    const displayData = dashboardData || requirement.info;
    
    headerContainer.innerHTML = `
        <div class="requirement-header-content">
            <!-- SECCIÓN SUPERIOR: DATOS DEL REQUERIMIENTO -->
            <div class="requirement-title-section">
                <div class="requirement-icon">📋</div>
                <div class="requirement-info">
                    <h2 class="requirement-title">${displayData.name || 'Requerimiento Sin Nombre'}</h2>
                    <div class="requirement-meta">
                        <span class="requirement-number">📋 ${displayData.number || 'Sin número'}</span>
                        <span class="requirement-separator">•</span>
                        <span class="requirement-tester">👤 ${displayData.tester || 'Sin tester principal'}</span>
                        <span class="requirement-separator">•</span>
                        <span class="requirement-date">📅 ${formatDateForDisplay(displayData.startDate || displayData.createdAt) || 'Sin fecha'}</span>
                        ${dashboardData ? `<span class="requirement-separator">•</span><span class="requirement-priority">🎯 Prioridad ${dashboardData.priority}</span>` : ''}
                    </div>
                    ${displayData.description ? `<p class="requirement-description">${displayData.description}</p>` : ''}
                </div>
            </div>
            
            <div class="requirement-stats">
                <div class="stat-item">
                    <div class="stat-number">${stats.totalCases}</div>
                    <div class="stat-label">Casos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${stats.totalScenarios}</div>
                    <div class="stat-label">Escenarios</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${Number(stats.totalHours || 0).toFixed(1)}h</div>
                    <div class="stat-label">Tiempo</div>
                </div>
                <div class="stat-item stat-success">
                    <div class="stat-number">${stats.successRate}%</div>
                    <div class="stat-label">Éxito</div>
                </div>
            </div>
        </div>
        
        <!-- SECCIÓN INFERIOR: DATOS DEL CASO ACTIVO -->
        <div class="current-case-details-section">
            <div class="case-details-grid">
                <div class="case-detail-group">
                    <div class="case-detail-item">
                        <span class="case-detail-label">N° Caso Actual</span>
                        <span class="case-detail-value">${currentCase ? extractCaseNumber(currentCase) : '-'}</span>
                    </div>
                    <div class="case-detail-item">
                        <span class="case-detail-label">Título Caso</span>
                        <span class="case-detail-value">${currentCase ? currentCase.title : 'Sin caso activo'}</span>
                    </div>
                </div>
                <div class="case-detail-group">
                    <div class="case-detail-item">
                        <span class="case-detail-label">Prerequisitos/Requisitos</span>
                        <span class="case-detail-value">${currentCase ? (currentCase.prerequisites || 'A completar por tester') : '-'}</span>
                    </div>
                    <div class="case-detail-item">
                        <span class="case-detail-label">Fecha de inicio</span>
                        <span class="case-detail-value">${firstExecutionDate ? formatDateForDisplay(firstExecutionDate) : 'Sin ejecuciones'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="requirement-actions">
            <button class="btn btn-success btn-small" onclick="openNewCaseModal()">
                ➕ Nuevo Caso
            </button>
            <button class="btn btn-info btn-small" onclick="openRequirementReports()">
                📊 Reportes
            </button>
            <button class="btn btn-warning btn-small" onclick="goToDashboard()">
                ✏️ Editar Requerimiento
            </button>
            <button class="btn btn-primary btn-small" onclick="openRequirementSaveLoad()" style="display: none;">
                💾 Guardar/Cargar
            </button>
        </div>
    `;

}

/**
 * Extrae el número del caso (ahora usa el campo caseNumber)
 */
function extractCaseNumber(caseObj) {
    if (!caseObj) return '-';

    // Usar el campo caseNumber si existe, sino extraer del título
    if (caseObj.caseNumber) {
        return caseObj.caseNumber;
    }

    // Fallback: extraer del título
    const match = caseObj.title.match(/(?:caso|case)\s*(\d+)/i) || caseObj.title.match(/^(\d+)$/);
    return match ? match[1] : caseObj.title;
}

/**
 * Obtiene la fecha del primer escenario ejecutado (OK/NO) del caso
 */
function getFirstExecutionDate(caseObj) {
    if (!caseObj || !caseObj.scenarios) return null;

    // Filtrar solo escenarios ejecutados (OK o NO)
    const executedScenarios = caseObj.scenarios.filter(scenario =>
        scenario.status === 'OK' || scenario.status === 'NO'
    );

    if (executedScenarios.length === 0) return null;

    // Ordenar por fecha de ejecución y tomar el primero
    executedScenarios.sort((a, b) => {
        const dateA = new Date(a.executionDate || '9999-12-31');
        const dateB = new Date(b.executionDate || '9999-12-31');
        return dateA - dateB;
    });

    return executedScenarios[0].executionDate;
}

// ===============================================
// COMPONENTE: CASE NAVIGATION TABS
// ===============================================

/**
 * Crea y actualiza la navegación entre casos
 */
function createCaseNavigation() {
    let navigationContainer = document.getElementById('caseNavigation');

    if (!navigationContainer) {
        navigationContainer = document.createElement('div');
        navigationContainer.id = 'caseNavigation';
        navigationContainer.className = 'case-navigation';

        const requirementHeader = document.getElementById('requirementHeader');
        if (requirementHeader) {
            requirementHeader.parentNode.insertBefore(navigationContainer, requirementHeader.nextSibling);
        }
    }

    const requirement = currentRequirement;
    if (!requirement || !Array.isArray(requirement.cases)) {
        navigationContainer.innerHTML = '';
        navigationContainer.style.display = 'none';
        return;
    }

    const caseTabs = requirement.cases.map(caseObj => {
        const isActive = caseObj.id === currentCaseId;
        const scenarios = Array.isArray(caseObj.scenarios) ? caseObj.scenarios.length : 0;
        const stats = caseObj.stats || { totalHours: 0, successRate: 0 };
        const hours = Number(stats.totalHours || 0).toFixed(1);

        return `
            <div class="case-tab ${isActive ? 'case-tab-active' : ''}" 
                 onclick="switchToCaseUI('${caseObj.id}')" 
                 data-case-id="${caseObj.id}">
                <div class="case-tab-header">
                    <span class="case-tab-icon">📁</span>
                    <span class="case-tab-title"> Caso ${caseObj.caseNumber}</span>
                    <div class="case-tab-actions">
                        <button class="case-tab-edit" onclick="editCaseUI('${caseObj.id}', event)" title="Editar caso">⚙️</button>
                        <button class="case-tab-close" onclick="deleteCaseUI('${caseObj.id}', event)" title="Eliminar caso">✕</button>
                    </div>
                </div>
                <div class="case-tab-stats">
                    <span class="case-stat">${scenarios} escenarios</span>
                    <span class="case-separator">•</span>
                    <span class="case-stat">${hours}h</span>
                    <span class="case-separator">•</span>
                    <span class="case-stat case-success">${stats.successRate || 0}%</span>
                </div>
                <div class="case-tab-objective">${caseObj.objective || 'Sin objetivo definido'}</div>
            </div>
        `;
    }).join('');

    navigationContainer.innerHTML = `
        <div class="case-navigation-content">
            <div class="case-tabs-container">
                ${caseTabs}
                <div class="case-tab case-tab-add" onclick="openNewCaseModal()">
                    <div class="case-add-icon">➕</div>
                    <div class="case-add-text">Nuevo Caso</div>
                </div>
            </div>
        </div>
    `;
    navigationContainer.style.display = 'block';
}


// ===============================================
// FUNCIONES DE INTERACCIÓN
// ===============================================

/**
 * Cambia a un caso específico desde la UI
 */
function switchToCaseUI(caseId) {

    const success = switchToCase(caseId);
    if (success) {
        // Actualizar navegación
        updateCaseNavigation();

        // 🆕 ACTUALIZAR HEADER DEL REQUERIMIENTO (para "N° Caso Actual")
        createRequirementHeader();

        // Actualizar contenido del caso
        updateCurrentCaseContent();

        // Actualizar estadísticas
        if (typeof updateStats === 'function') {
            updateStats();
        }

        // Actualizar tabla de escenarios
        if (typeof renderTestCases === 'function') {
            renderTestCases();
        }
        
        // 🆕 ACTUALIZAR VISIBILIDAD DE TIMER BARS
        if (typeof updateTimerBarsVisibility === 'function') {
            updateTimerBarsVisibility();
        }

    }
}

/**
 * Elimina un caso desde la UI
 */
/**
 * Elimina un caso desde la UI (con stopPropagation + fix de currentCaseId real)
 */
function deleteCaseUI(caseId, event) {
    // Evitar que el click burbujee al contenedor (que hace switchToCaseUI)
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // Usar el requirement REAL (no solo window.*)
    const req = (typeof currentRequirement !== 'undefined' && currentRequirement) ? currentRequirement : window.currentRequirement;
    if (!req || !Array.isArray(req.cases)) return;

    const caseObj = req.cases.find(c => c.id === caseId);
    if (!caseObj) {
        console.warn('⚠️ Caso a eliminar no encontrado:', caseId);
        return;
    }

    // Mostrar toast de confirmación SIN auto-ocultado
    const confirmationToast = toastSystem.show(
        `¿Eliminar el caso "${caseObj.title || 'Sin título'}" y sus escenarios? Esta acción no se puede deshacer.`,
        'warning',
        'Confirmar eliminación',
        0  // 0 = NO auto-ocultado
    );
    
    // Crear botones de confirmación
    setTimeout(() => {
        const toasts = document.querySelectorAll('.toast.show');
        const toast = toasts[toasts.length - 1];
        
        if (toast) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin-top: 12px;
                justify-content: flex-end;
            `;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.style.cssText = `
                background: #6c757d;
                color: white;
                border: none;
                padding: 6px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                font-weight: 500;
            `;
            
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Sí, eliminar';
            confirmBtn.style.cssText = `
                background: #f44336;
                color: white;
                border: none;
                padding: 6px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                font-weight: 500;
            `;
            
            confirmBtn.onclick = () => {
                toastSystem.hide(toast);
                
                const deletingActive = (typeof currentCaseId !== 'undefined' ? currentCaseId : window.currentCaseId) === caseId;

                // Quitar el caso
                req.cases = req.cases.filter(c => c.id !== caseId);

                // Elegir nuevo activo si borramos el actual
                if (deletingActive) {
                    const newActiveId = req.cases[0]?.id || null;
                    if (typeof currentCaseId !== 'undefined') {
                        currentCaseId = newActiveId;
                    }
                    window.currentCaseId = newActiveId;

                    // Hidratar proxies cambiando de caso (si hay alguno)
                    if (newActiveId && typeof switchToCase === 'function') {
                        switchToCase(newActiveId);
                    }
                } else {
                    // Si no borramos el activo, garantizamos que los proxies sigan OK
                    if (typeof ensureTestCasesProxy === 'function') ensureTestCasesProxy();
                }

                // Persistir y refrescar UI/Stats/Header
                if (typeof saveMulticaseData === 'function') saveMulticaseData();
                if (typeof updateMulticaseUI === 'function') updateMulticaseUI();
                if (typeof renderTestCases === 'function') renderTestCases();
                if (typeof updateStats === 'function') updateStats();
                if (typeof updateRequirementButtons === 'function') updateRequirementButtons();
                
                showSuccess('Caso eliminado correctamente', 'Eliminación exitosa');
            };
            
            cancelBtn.onclick = () => {
                toastSystem.hide(toast);
            };
            
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            
            const toastContent = toast.querySelector('.toast-content');
            if (toastContent) {
                toastContent.appendChild(buttonContainer);
            }
            
            // Ocultar el botón X del toast
            const closeBtn = toast.querySelector('.toast-close');
            if (closeBtn) {
                closeBtn.style.display = 'none';
            }
        }
    }, 150);
}



/**
 * Edita un caso desde la UI
 */
function editCaseUI(caseId, event) {
    // Prevenir propagación para que no active el switch
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const caseObj = currentRequirement.cases.find(c => c.id === caseId);
    if (!caseObj) return;

    openEditCaseModal(caseObj);
}

/**
 * Actualiza solo la navegación de casos
 */
function updateCaseNavigation() {
    createCaseNavigation();
}

/**
 * Actualiza el contenido del caso actual
 */
function updateCurrentCaseContent() {
    const currentCase = getCurrentCase();
    if (!currentCase) return;

    // Actualizar título del caso en algún lugar visible
    updateCurrentCaseHeader(currentCase);
}

/**
 * Actualiza el header del caso actual
 */
function updateCurrentCaseHeader(caseObj) {
    let caseHeader = document.getElementById('currentCaseHeader');

    if (!caseHeader) {
        caseHeader = document.createElement('div');
        caseHeader.id = 'currentCaseHeader';
        caseHeader.className = 'current-case-header';

        const filters = document.querySelector('.filters');
        if (filters) {
            filters.parentNode.insertBefore(caseHeader, filters);
        }
    }

    const stats = (caseObj && caseObj.stats) ? caseObj.stats : { totalHours: 0, successRate: 0 };
    const escenarios = Array.isArray(caseObj?.scenarios) ? caseObj.scenarios.length : 0;

    caseHeader.innerHTML = `
        <div class="current-case-info">
            <h3 class="current-case-title">📁 Caso ${caseObj.caseNumber}</h3>
            <p class="current-case-objective">${caseObj.title || 'Sin objetivo definido'}</p>
        </div>
        <div class="current-case-stats">
            <span class="case-stat">${escenarios} escenarios</span>
            <span class="case-separator">•</span>
            <span class="case-stat">${Number(stats.totalHours || 0).toFixed(1)} horas</span>
            <span class="case-separator">•</span>
            <span class="case-stat">${stats.successRate || 0}% éxito</span>
        </div>
    `;
}



// ===============================================
// MODAL: NUEVO CASO
// ===============================================

/**
 * Abre modal para crear nuevo caso
 */
function openNewCaseModal() {
    // Crear modal si no existe
    let modal = document.getElementById('newCaseModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'newCaseModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>📁 Nuevo Caso de Prueba</h2>
                    <span class="close" onclick="closeNewCaseModal()">&times;</span>
                </div>
                <form id="newCaseForm">
                    <div class="form-group">
                        <label>N° del Caso: *</label>
                        <input type="text" id="newCaseNumber" placeholder="Ej: 1, 2, 3..." required>
                    </div>
                    <div class="form-group">
                        <label>Título del Caso: *</label>
                        <input type="text" id="newCaseTitle" placeholder="Ej: Validación de formularios" required>
                    </div>
                    <div class="form-group">
                        <label>Objetivo:</label>
                        <textarea id="newCaseObjective" rows="3" 
                                placeholder="Describe qué se va a probar en este caso..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Prerequisitos/Requisitos:</label>
                        <textarea id="newCasePrerequisites" rows="2" 
                                placeholder="Condiciones previas, configuraciones necesarias, datos requeridos..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Variables de Entrada Iniciales:</label>
                        <input type="text" id="newCaseVariables" 
                               placeholder="Variable 1, Variable 2, Variable 3..." 
                               value="Variable 1, Variable 2">
                        <small>Separadas por comas. Se pueden modificar después.</small>
                    </div>
                    <div class="controls">
                        <button type="submit" class="btn btn-success">📁 Crear Caso</button>
                        <button type="button" class="btn" onclick="closeNewCaseModal()">❌ Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Agregar event listener al formulario
        document.getElementById('newCaseForm').addEventListener('submit', handleNewCaseSubmit);
    }

    // Limpiar formulario
    document.getElementById('newCaseNumber').value = '';
    document.getElementById('newCaseTitle').value = '';
    document.getElementById('newCaseObjective').value = '';
    document.getElementById('newCasePrerequisites').value = '';
    document.getElementById('newCaseVariables').value = 'Variable 1, Variable 2';

    // Mostrar modal
    modal.style.display = 'block';

    // Focus en título
    setTimeout(() => {
        document.getElementById('newCaseTitle').focus();
    }, 100);
}

/**
 * Abre modal para editar caso existente
 */
function openEditCaseModal(caseObj) {
    // Crear modal si no existe
    let modal = document.getElementById('editCaseModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editCaseModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>⚙️ Editar Caso de Prueba</h2>
                    <span class="close" onclick="closeEditCaseModal()">&times;</span>
                </div>
                <form id="editCaseForm">
                    <input type="hidden" id="editCaseId">
                    <div class="form-group">
                        <label>N° del Caso: *</label>
                        <input type="text" id="editCaseNumber" required>
                    </div>
                    <div class="form-group">
                        <label>Título del Caso: *</label>
                        <input type="text" id="editCaseTitle" required>
                    </div>
                    <div class="form-group">
                        <label>Objetivo:</label>
                        <textarea id="editCaseObjective" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Prerequisitos/Requisitos:</label>
                        <textarea id="editCasePrerequisites" rows="2"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Variables de Entrada:</label>
                        <input type="text" id="editCaseVariables">
                        <small>Separadas por comas.</small>
                    </div>
                    <div class="controls">
                        <button type="submit" class="btn btn-success">💾 Guardar Cambios</button>
                        <button type="button" class="btn" onclick="closeEditCaseModal()">❌ Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Agregar event listener al formulario
        document.getElementById('editCaseForm').addEventListener('submit', handleEditCaseSubmit);
    }

    // Llenar formulario con datos del caso
    document.getElementById('editCaseId').value = caseObj.id;
    document.getElementById('editCaseNumber').value = caseObj.caseNumber || '';
    document.getElementById('editCaseTitle').value = caseObj.title || '';
    document.getElementById('editCaseObjective').value = caseObj.objective || '';
    document.getElementById('editCasePrerequisites').value = caseObj.prerequisites || '';
    document.getElementById('editCaseVariables').value = (caseObj.inputVariableNames || []).join(', ');

    // Mostrar modal
    modal.style.display = 'block';

    // Focus en número
    setTimeout(() => {
        document.getElementById('editCaseNumber').focus();
    }, 100);
}

/**
 * Cierra modal de editar caso
 */
function closeEditCaseModal() {
    const modal = document.getElementById('editCaseModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Maneja envío del formulario de editar caso
 */
function handleEditCaseSubmit(e) {
    e.preventDefault();

    const caseId = document.getElementById('editCaseId').value;
    const caseNumber = document.getElementById('editCaseNumber').value.trim();
    const title = document.getElementById('editCaseTitle').value.trim();
    const objective = document.getElementById('editCaseObjective').value.trim();
    const prerequisites = document.getElementById('editCasePrerequisites').value.trim();
    const variablesText = document.getElementById('editCaseVariables').value.trim();

    if (!caseNumber) {
        alert('⚠️ El N° del Caso es obligatorio');
        document.getElementById('editCaseNumber').focus();
        return;
    }

    if (!title) {
        alert('⚠️ El título del caso es obligatorio');
        document.getElementById('editCaseTitle').focus();
        return;
    }

    // Encontrar el caso a editar
    const caseObj = currentRequirement.cases.find(c => c.id === caseId);
    if (!caseObj) {
        alert('❌ Error: Caso no encontrado');
        return;
    }

    // Procesar variables
    const variables = variablesText ?
        variablesText.split(',').map(v => v.trim()).filter(v => v) :
        ['Variable 1', 'Variable 2'];

    // Actualizar caso
    caseObj.caseNumber = caseNumber;
    caseObj.title = title;
    caseObj.objective = objective;
    caseObj.prerequisites = prerequisites || 'A completar por tester';
    caseObj.inputVariableNames = variables;
    caseObj.updatedAt = new Date().toISOString();

    // Si estamos editando el caso activo, actualizar variables globales
    if (currentCaseId === caseId) {
        inputVariableNames = variables;
    }

    // Guardar cambios
    saveMulticaseData();

    // Actualizar UI
    updateMulticaseUI();

    // Cerrar modal
    closeEditCaseModal();

    showSuccess(`Caso "${caseNumber}: ${title}" actualizado exitosamente`, 'Caso actualizado');
}

/**
 * Maneja envío del formulario de nuevo caso
 */
function handleNewCaseSubmit(e) {
    e.preventDefault();

    const caseNumber = document.getElementById('newCaseNumber').value.trim();
    const title = document.getElementById('newCaseTitle').value.trim();
    const objective = document.getElementById('newCaseObjective').value.trim();
    const prerequisites = document.getElementById('newCasePrerequisites').value.trim();
    const variablesText = document.getElementById('newCaseVariables').value.trim();

    if (!caseNumber) {
        showWarning('El N° del Caso es obligatorio', 'Campo requerido');
        document.getElementById('newCaseNumber').focus();
        return;
    }

    if (!title) {
        showWarning('El título del caso es obligatorio', 'Campo requerido');
        document.getElementById('newCaseTitle').focus();
        return;
    }

    // Procesar variables
    const variables = variablesText ?
        variablesText.split(',').map(v => v.trim()).filter(v => v) :
        ['Variable 1', 'Variable 2'];

    // Crear nuevo caso
    const newCase = addNewCase(title, objective, caseNumber);
    if (newCase) {
        // Configurar campos adicionales del nuevo caso
        newCase.inputVariableNames = variables;
        newCase.prerequisites = prerequisites || 'A completar por tester';

        // Cambiar al nuevo caso
        switchToCaseUI(newCase.id);

        // Actualizar UI
        updateMulticaseUI();

        // Cerrar modal
        closeNewCaseModal();

        showSuccess(`Caso "${caseNumber}: ${title}" creado exitosamente`, 'Caso creado');
    }
}

// ===============================================
// FUNCIONES PRINCIPALES DE UI
// ===============================================

/**
 * Actualiza toda la UI multicaso
 */
function updateMulticaseUI() {
    if (!isMulticaseMode()) return;

    createRequirementHeader(); // 🆕 Actualiza info completa incluyendo "N° Caso Actual"
    createCaseNavigation();
    updateCurrentCaseContent();

    // 🆕 Actualizar estadísticas si existe la función
    if (typeof updateStats === 'function') {
        updateStats();
    }
}

/**
 * Inicializa la UI multicaso
 */
function initializeMulticaseUI() {

    if (!isMulticaseMode()) {
        return;
    }

    // Crear componentes principales
    updateMulticaseUI();

    // Configurar event listeners adicionales
    setupMulticaseEventListeners();

}

/**
 * Configura event listeners específicos del modo multicaso
 */
function setupMulticaseEventListeners() {
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function (event) {
        const modals = ['newCaseModal', 'editCaseModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// ===============================================
// FUNCIONES TEMPORALES PARA BOTONES DEL HEADER
// ===============================================

/**
 * Abre reportes a nivel requerimiento
 */
function openRequirementReports() {
    if (typeof openGlobalReportPreview === 'function') {
        openGlobalReportPreview();
    } else {
        alert('❌ Reporte global no disponible (falta reports.js actualizado)');
    }
}

/**
 * Abre configuración a nivel requerimiento
 */
function openRequirementConfig() {
    alert('🚧 Configuración de requerimiento - Próximamente en Fase 3');
}

/**
 * Abre guardar/cargar a nivel requerimiento
 */
function openRequirementSaveLoad() {
    console.log('💾 Abriendo modal de Guardar/Cargar...');
    
    // Crear modal si no existe
    let modal = document.getElementById('saveLoadModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'saveLoadModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💾 Guardar/Cargar Requerimiento</h3>
                    <button class="modal-close" onclick="closeSaveLoadModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="save-load-section">
                        <h4>📤 Guardar Requerimiento Actual</h4>
                        <p>Exporta el requerimiento actual con todos sus casos y escenarios a un archivo JSON.</p>
                        <button class="btn btn-success" onclick="saveCurrentRequirement()">
                            💾 Guardar como JSON
                        </button>
                    </div>
                    
                    <div class="save-load-section">
                        <h4>📥 Cargar Requerimiento</h4>
                        <p>Importa un requerimiento desde un archivo JSON (reemplazará el requerimiento actual).</p>
                        <input type="file" id="loadRequirementFile" accept=".json" style="display: none;" onchange="loadRequirementFromFile(event)">
                        <button class="btn btn-primary" onclick="document.getElementById('loadRequirementFile').click()">
                            📂 Seleccionar Archivo JSON
                        </button>
                    </div>
                    
                    <div class="save-load-section">
                        <h4>⚠️ Advertencia</h4>
                        <p class="warning-text">
                            <strong>Cargar un requerimiento reemplazará completamente el requerimiento actual</strong>, 
                            incluyendo todos sus casos y escenarios. Esta acción no se puede deshacer.
                        </p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeSaveLoadModal()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Mostrar modal
    modal.style.display = 'block';
}

// ===============================================
// FUNCIONES DE GUARDAR/CARGAR
// ===============================================

/**
 * Cierra el modal de guardar/cargar
 */
function closeSaveLoadModal() {
    const modal = document.getElementById('saveLoadModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Guarda el requerimiento actual como JSON
 */
function saveCurrentRequirement() {
    if (!hasActiveRequirement()) {
        alert('❌ No hay requerimiento activo para guardar');
        return;
    }
    
    try {
        const requirement = currentRequirement;
        const exportData = {
            requirement: {
                id: requirement.id,
                info: requirement.info,
                stats: requirement.stats
            },
            cases: requirement.cases || [],
            scenarios: requirement.scenarios || [],
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // Crear y descargar archivo
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `requerimiento_${requirement.info.number || requirement.id}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Requerimiento guardado exitosamente');
        closeSaveLoadModal();
        
    } catch (error) {
        console.error('❌ Error guardando requerimiento:', error);
        alert('❌ Error al guardar el requerimiento');
    }
}

/**
 * Carga un requerimiento desde archivo JSON
 */
function loadRequirementFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validar estructura del archivo
            if (!data.requirement || !data.cases) {
                throw new Error('Formato de archivo inválido');
            }
            
            // Confirmar reemplazo
            const confirmMessage = `¿Estás seguro de que quieres reemplazar el requerimiento actual "${currentRequirement?.info?.name || 'Sin nombre'}" con "${data.requirement.info.name}"?\n\nEsta acción no se puede deshacer.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Cargar el nuevo requerimiento
            loadRequirementData(data);
            
            alert('✅ Requerimiento cargado exitosamente');
            closeSaveLoadModal();
            
        } catch (error) {
            console.error('❌ Error cargando requerimiento:', error);
            alert('❌ Error al cargar el archivo. Verifica que sea un archivo JSON válido.');
        }
    };
    
    reader.readAsText(file);
}

/**
 * Carga los datos del requerimiento y sincroniza con el dashboard
 */
function loadRequirementData(data) {
    try {
        /* console.log('🔄 Cargando datos del requerimiento:', data.requirement.info.name); */
        
        // 1. Actualizar el requerimiento actual en memoria
        if (currentRequirement) {
            currentRequirement.id = data.requirement.id;
            currentRequirement.info = data.requirement.info;
            currentRequirement.stats = data.requirement.stats;
            currentRequirement.cases = data.cases || [];
            currentRequirement.scenarios = data.scenarios || [];
        }
        
        // 2. Guardar en localStorage de la app
        saveMulticaseData();
        
        // 3. Sincronizar con el dashboard
        if (typeof syncAppToDashboard === 'function') {
            syncAppToDashboard();
        }
        
        // 4. Actualizar la interfaz
        createRequirementHeader();
        renderCaseTabs();
        renderCurrentCase();
        
        /* console.log('✅ Requerimiento cargado y sincronizado exitosamente'); */
        
    } catch (error) {
        console.error('❌ Error cargando datos del requerimiento:', error);
        throw error;
    }
}

// ===============================================
// FUNCIÓN FALTANTE - CERRAR MODAL
// ===============================================

function closeNewCaseModal() {
    const modal = document.getElementById('newCaseModal');
    if (modal) {
        modal.style.display = 'none';

        // Limpiar formulario
        const form = document.getElementById('newCaseForm');
        if (form) {
            form.reset();
        }

    }
}

/**
 * Actualiza automáticamente la UI multicaso después de cambios en escenarios
 */
function autoUpdateMulticaseUI() {
    if (!isMulticaseMode()) return;


    // 1. Actualizar estadísticas del requerimiento
    if (typeof updateRequirementStats === 'function' && currentRequirement) {
        updateRequirementStats(currentRequirement);
    }

    // 2. Actualizar header del requerimiento
    if (typeof createRequirementHeader === 'function') {
        createRequirementHeader();
    }

    // 3. Actualizar navegación/tarjetas de casos
    if (typeof createCaseNavigation === 'function') {
        createCaseNavigation();
    }

    // 4. Guardar cambios actualizados
    if (typeof saveMulticaseData === 'function') {
        saveMulticaseData();
    }

}

// ===============================================
// FUNCIÓN DE DEBUG PARA LOGS PERSISTENTES
// ===============================================

/**
 * Muestra los logs de debug guardados en localStorage
 */
function showDebugLogs() {
    const debugLogs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    
    if (debugLogs.length === 0) {
        console.log('📋 No hay logs de debug guardados');
        return;
    }
    
    console.log('📋 === LOGS DE DEBUG PERSISTENTES ===');
    debugLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp}] ${log.source} - ${log.action}: ${log.message}`);
        if (log.data) {
            console.log('   Datos:', log.data);
        }
    });
    console.log('📋 === FIN DE LOGS ===');
}

/**
 * Limpia los logs de debug
 */
function clearDebugLogs() {
    localStorage.removeItem('debugLogs');
    console.log('🧹 Logs de debug limpiados');
}



// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones principales
window.initializeMulticaseUI = initializeMulticaseUI;
window.updateMulticaseUI = updateMulticaseUI;
window.createRequirementHeader = createRequirementHeader;
window.createCaseNavigation = createCaseNavigation;
window.switchToCaseUI = switchToCaseUI;
window.deleteCaseUI = deleteCaseUI;
window.editCaseUI = editCaseUI;
window.openNewCaseModal = openNewCaseModal;
window.closeNewCaseModal = closeNewCaseModal;
window.openEditCaseModal = openEditCaseModal;
window.closeEditCaseModal = closeEditCaseModal;
window.extractCaseNumber = extractCaseNumber;
window.getFirstExecutionDate = getFirstExecutionDate;
window.autoUpdateMulticaseUI = autoUpdateMulticaseUI;
window.getDashboardRequirementData = getDashboardRequirementData;
window.goToDashboard = goToDashboard;

// ===============================================
// AUTO-INICIALIZACIÓN
// ===============================================

// Inicializar UI cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    // Esperar un momento para que se carguen otros scripts
    setTimeout(() => {
        if (isMulticaseMode()) {
            initializeMulticaseUI();
        }
    }, 500);
});

