// ===============================================
// DASHBOARD-UI.JS - Interfaz de usuario del dashboard
// ===============================================

// ===============================================
// FUNCIONES DE RENDERIZADO
// ===============================================

/**
 * Actualiza toda la interfaz del dashboard
 */
function updateDashboard() {
    renderRequirementsList();
    updateStats();
    updateFilterButtons();
    
    // Restaurar estado de checkboxes después de renderizar
    setTimeout(() => {
        restoreCheckboxStates();
    }, 100);
}

/**
 * Actualiza solo las estadísticas sin refrescar la interfaz (para evitar parpadeos)
 */
function updateStatsOnly() {
    updateStats();
    // NO renderizar la lista ni restaurar checkboxes para evitar parpadeos
}

/**
 * Renderiza la lista de requerimientos
 */
function renderRequirementsList() {
    const container = document.getElementById('requirementsContainer');
    if (!container) return;
    
    const requirements = applyFilters();
    
    if (requirements.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No hay requerimientos</h3>
                <p>Comienza creando tu primer requerimiento</p>
                <button class="btn btn-primary" onclick="openNewRequirementModal()">
                    ➕ Crear Requerimiento
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = requirements.map(req => createRequirementCard(req)).join('');
    
    // Agregar event listeners a las tarjetas
    addRequirementCardListeners();
}

/**
 * Crea el HTML de una tarjeta de requerimiento
 */
function createRequirementCard(requirement) {
    const progress = calculateProgress(requirement);
    const priorityClass = `priority-${requirement.priority}`;
    const statusClass = requirement.status;
    
    // Debug: Verificar estadísticas
    console.log('📊 Creando tarjeta para requerimiento:', requirement.name);
    console.log('📊 Stats del requerimiento:', requirement.stats);
    console.log('📊 Progreso calculado:', progress);
    
    return `
        <div class="requirement-card-container">
            <input type="checkbox" class="requirement-checkbox" id="checkbox-${requirement.id}" data-requirement-id="${requirement.id}">
            <div class="requirement-card ${priorityClass}" data-requirement-id="${requirement.id}">
                <div class="priority-indicator"></div>
                
                <div class="requirement-header">
                    <div class="requirement-title-section">
                        <div class="requirement-title">${escapeHtml(requirement.name)}</div>
                        <div class="requirement-number">${escapeHtml(requirement.number)}</div>
                    </div>
                    <div class="requirement-actions">
                        <button class="btn-action" onclick="editRequirement('${requirement.id}')" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-action" onclick="deleteRequirementConfirm('${requirement.id}')" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </div>
            
            <div class="requirement-meta">
                <span class="priority-badge ${priorityClass}">
                    Prioridad ${requirement.priority}
                </span>
                <span class="status-badge ${statusClass}">
                    ${getStatusText(requirement.status)}
                </span>
                ${requirement.tester ? `<span class="tester-info">👤 ${escapeHtml(requirement.tester)}</span>` : ''}
            </div>
            
            ${requirement.description ? `
                <div class="requirement-description">
                    ${escapeHtml(requirement.description)}
                </div>
            ` : ''}
            
            <div class="progress-section">
                <div class="progress-info">
                    <span>Progreso: ${progress}%</span>
                    <span>|</span>
                    <span>Escenarios OK: ${requirement.stats.totalOK}/${requirement.stats.totalScenarios}</span>
                    <span>|</span>
                    <span>Tiempo: ${(requirement.stats.totalHours || 0).toFixed(1)} hs</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
                <div class="requirement-footer">
                    <div class="requirement-stats">
                        <span>📊 ${requirement.stats.totalCases} casos</span>
                        <span>✅ ${requirement.stats.completedCases} completados</span>
                    </div>
                    <div class="requirement-date">
                        Actualizado: ${formatDate(requirement.updatedAt)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Agrega event listeners a las tarjetas de requerimientos
 */
function addRequirementCardListeners() {
    const cards = document.querySelectorAll('.requirement-card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            // No navegar si se hace click en botones de acción
            if (e.target.closest('.btn-action')) return;
            
            const requirementId = card.dataset.requirementId;
            navigateToRequirement(requirementId);
        });
    });
}

/**
 * Actualiza las estadísticas del dashboard
 */
function updateStats() {
    const stats = calculateDashboardStats();
    
    updateStatElement('totalRequirements', stats.total);
    updateStatElement('completedRequirements', stats.completed);
    updateStatElement('activeRequirements', stats.active);
    updateStatElement('blockedRequirements', stats.blocked);
}

/**
 * Actualiza un elemento de estadística
 */
function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Actualiza los botones de filtro
 */
function updateFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
}

// ===============================================
// FUNCIONES DE MODAL
// ===============================================

/**
 * Abre el modal de nuevo requerimiento
 */
function openNewRequirementModal() {
    const modal = document.getElementById('newRequirementModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Limpiar formulario
        document.getElementById('newRequirementForm').reset();
        
        // Establecer fecha por defecto
        const dateInput = document.getElementById('reqStartDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Focus en el primer campo
        document.getElementById('reqNumber').focus();
    }
}

/**
 * Cierra el modal de nuevo requerimiento
 */
function closeNewRequirementModal() {
    const modal = document.getElementById('newRequirementModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

/**
 * Abre el modal de edición de requerimiento
 */
function openEditRequirementModal(requirement) {
    const modal = document.getElementById('editRequirementModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Llenar formulario con datos del requerimiento
        document.getElementById('editReqNumber').value = requirement.number || '';
        document.getElementById('editReqName').value = requirement.name || '';
        document.getElementById('editReqDescription').value = requirement.description || '';
        document.getElementById('editReqPriority').value = requirement.priority || 1;
        document.getElementById('editReqTester').value = requirement.tester || '';
        document.getElementById('editReqStartDate').value = requirement.startDate || '';
        document.getElementById('editReqStatus').value = requirement.status || 'active';
        
        // Guardar ID del requerimiento para la edición
        modal.dataset.requirementId = requirement.id;
        
        // Focus en el primer campo
        document.getElementById('editReqNumber').focus();
    }
}

/**
 * Cierra el modal de edición de requerimiento
 */
function closeEditRequirementModal() {
    const modal = document.getElementById('editRequirementModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        delete modal.dataset.requirementId;
    }
}

/**
 * Maneja el envío del formulario de nuevo requerimiento
 */
function handleNewRequirementSubmit(e) {
    e.preventDefault();
    
    const formData = {
        number: document.getElementById('reqNumber').value.trim(),
        name: document.getElementById('reqName').value.trim(),
        description: document.getElementById('reqDescription').value.trim(),
        priority: parseInt(document.getElementById('reqPriority').value),
        tester: document.getElementById('reqTester').value.trim(),
        startDate: document.getElementById('reqStartDate').value,
        status: document.getElementById('reqStatus').value
    };
    
    // Validar datos
    if (!formData.number || !formData.name) {
        alert('Por favor completa los campos obligatorios (Número y Nombre)');
        return;
    }
    
    // Verificar que el número no esté duplicado
    const existing = requirementsList.find(req => req.number === formData.number);
    if (existing) {
        alert('Ya existe un requerimiento con ese número');
        return;
    }
    
    // Crear requerimiento
    console.log('📝 Creando requerimiento con datos:', formData);
    const newRequirement = addRequirement(formData);
    console.log('✅ Requerimiento creado:', newRequirement);
    
    // Verificar que se guardó
    const saved = localStorage.getItem('dashboardData');
    console.log('💾 Datos guardados en localStorage:', saved ? 'Sí' : 'No');
    
    // Cerrar modal
    closeNewRequirementModal();
    
    // Mostrar mensaje de éxito
    showNotification('Requerimiento creado exitosamente', 'success');
}

/**
 * Maneja el envío del formulario de edición de requerimiento
 */
function handleEditRequirementSubmit(e) {
    e.preventDefault();
    
    const modal = document.getElementById('editRequirementModal');
    const requirementId = modal.dataset.requirementId;
    
    if (!requirementId) {
        alert('❌ Error: No se encontró el ID del requerimiento');
        return;
    }
    
    const formData = {
        number: document.getElementById('editReqNumber').value.trim(),
        name: document.getElementById('editReqName').value.trim(),
        description: document.getElementById('editReqDescription').value.trim(),
        priority: parseInt(document.getElementById('editReqPriority').value),
        tester: document.getElementById('editReqTester').value.trim(),
        startDate: document.getElementById('editReqStartDate').value,
        status: document.getElementById('editReqStatus').value
    };
    
    // Validar datos
    if (!formData.number || !formData.name) {
        alert('Por favor completa los campos obligatorios (Número y Nombre)');
        return;
    }
    
    // Verificar que el número no esté duplicado (excepto para el mismo requerimiento)
    const existing = requirementsList.find(req => req.number === formData.number && req.id !== requirementId);
    if (existing) {
        alert('Ya existe otro requerimiento con ese número');
        return;
    }
    
    // Actualizar requerimiento
    console.log('📝 Editando requerimiento:', requirementId, 'con datos:', formData);
    const updatedRequirement = updateRequirement(requirementId, formData);
    console.log('✅ Requerimiento actualizado:', updatedRequirement);
    
    // Cerrar modal
    closeEditRequirementModal();
    
    // Mostrar mensaje de éxito
    showNotification('Requerimiento actualizado exitosamente', 'success');
}

// ===============================================
// FUNCIONES DE FILTROS Y BÚSQUEDA
// ===============================================

/**
 * Maneja el cambio de filtro
 */
function handleFilterChange(filter) {
    currentFilter = filter;
    applyFilters();
    updateDashboard();
}

/**
 * Maneja la búsqueda
 */
function handleSearch() {
    const searchInput = document.getElementById('searchRequirements');
    if (searchInput) {
        searchQuery = searchInput.value;
        applyFilters();
        updateDashboard();
    }
}

/**
 * Maneja el cambio de ordenamiento
 */
function handleSortChange() {
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        currentSort = sortSelect.value;
        applyFilters();
        updateDashboard();
    }
}

// ===============================================
// FUNCIONES DE GESTIÓN DE REQUERIMIENTOS
// ===============================================

/**
 * Edita un requerimiento
 */
function editRequirement(id) {
    const requirement = getRequirement(id);
    if (!requirement) return;
    
    // Abrir modal de edición
    openEditRequirementModal(requirement);
}

/**
 * Confirma la eliminación de un requerimiento
 */
function deleteRequirementConfirm(id) {
    const requirement = getRequirement(id);
    if (!requirement) return;
    
    const confirmed = confirm(
        `¿Estás seguro de que deseas eliminar el requerimiento "${requirement.name}"?\n\nEsta acción no se puede deshacer.`
    );
    
    if (confirmed) {
        deleteRequirement(id);
        showNotification('Requerimiento eliminado', 'success');
    }
}

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Obtiene el texto del estado
 */
function getStatusText(status) {
    const statusTexts = {
        active: 'Activo',
        completed: 'Completado',
        paused: 'Pausado',
        blocked: 'Bloqueado'
    };
    return statusTexts[status] || status;
}

/**
 * Formatea una fecha
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Muestra una notificación
 */
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ===============================================
// EVENT LISTENERS
// ===============================================

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleFilterChange(btn.dataset.filter);
        });
    });
    
    // Búsqueda
    const searchInput = document.getElementById('searchRequirements');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Ordenamiento
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSortChange);
    }
    
    // Modal de nuevo requerimiento
    const newReqBtn = document.getElementById('btnNewRequirement');
    if (newReqBtn) {
        newReqBtn.addEventListener('click', openNewRequirementModal);
    }
    
    // Botón exportar proyecto
    const exportBtn = document.getElementById('btnExportProject');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportProject);
    }
    
    // Botón importar proyecto
    const importBtn = document.getElementById('btnImportProject');
    if (importBtn) {
        importBtn.addEventListener('click', handleImportProject);
    }
    
    // Botón generar reporte
    const reportBtn = document.getElementById('btnGenerateReport');
    if (reportBtn) {
        reportBtn.addEventListener('click', openReportModal);
    }
    
    // Controles del modal de reporte
    const selectAllBtn = document.getElementById('selectAllRequirements');
    const deselectAllBtn = document.getElementById('deselectAllRequirements');
    const closeReportBtn = document.getElementById('closeReportModal');
    
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllRequirements);
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAllRequirements);
    if (closeReportBtn) closeReportBtn.addEventListener('click', closeReportModal);
    
    // Cerrar modal de reporte
    const reportModal = document.getElementById('reportModal');
    if (reportModal) {
        const closeBtn = reportModal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeReportModal);
    }
    
    // Cerrar modal de nuevo requerimiento
    document.querySelectorAll('.modal-close, #cancelNewReq').forEach(btn => {
        btn.addEventListener('click', closeNewRequirementModal);
    });
    
    // Cerrar modal de edición
    document.querySelectorAll('#cancelEditReq').forEach(btn => {
        btn.addEventListener('click', closeEditRequirementModal);
    });
    
    // Formulario de nuevo requerimiento
    const newReqForm = document.getElementById('newRequirementForm');
    if (newReqForm) {
        newReqForm.addEventListener('submit', handleNewRequirementSubmit);
    }
    
    // Formulario de edición de requerimiento
    const editReqForm = document.getElementById('editRequirementForm');
    if (editReqForm) {
        editReqForm.addEventListener('submit', handleEditRequirementSubmit);
    }
    
    // Cerrar modal al hacer click fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal.id === 'newRequirementModal') {
                    closeNewRequirementModal();
                } else if (modal.id === 'editRequirementModal') {
                    closeEditRequirementModal();
                } else if (modal.id === 'reportModal') {
                    closeReportModal();
                }
            }
        });
    });
    
    // Event listeners para checkboxes de requerimientos
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('requirement-checkbox')) {
            saveCheckboxStates();
            updateSelectionCount();
            updateReportData();
        }
    });
}

/**
 * Debounce function para optimizar búsquedas
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

/**
 * Inicializa la interfaz de usuario
 */
function initializeDashboardUI() {
    console.log('🎨 Inicializando Dashboard UI...');
    
    // Ejecutar migración si es necesaria
    if (typeof runMigrationIfNeeded === 'function') {
        runMigrationIfNeeded();
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Inicializar dashboard
    initializeDashboard();
    
    // CRÍTICO: Configurar actualización automática de estadísticas
    setupStatsAutoUpdate();
    
    console.log('✅ Dashboard UI inicializado');
}

/**
 * Maneja la exportación de proyecto
 */
function handleExportProject() {
    try {
        const success = exportDashboardData();
        if (success) {
            showNotification('Proyecto exportado exitosamente', 'success');
        } else {
            showNotification('Error al exportar el proyecto', 'error');
        }
    } catch (error) {
        console.error('❌ Error exportando proyecto:', error);
        showNotification('Error al exportar el proyecto', 'error');
    }
}

/**
 * Maneja la importación de proyecto
 */
function handleImportProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            importDashboardData(file)
                .then(() => {
                    console.log('✅ Proyecto importado exitosamente');
                })
                .catch((error) => {
                    console.error('❌ Error importando proyecto:', error);
                });
        }
    };
    input.click();
}

/**
 * Abre el modal de reporte ejecutivo
 */
function openReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.add('show');
        updateReportData();
    }
}

/**
 * Cierra el modal de reporte ejecutivo
 */
function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    // Opcional: Limpiar selección al cerrar (comentado para mantener selección)
    // clearCheckboxStates();
}

/**
 * Selecciona todos los requerimientos
 */
function selectAllRequirements() {
    const checkboxes = document.querySelectorAll('.requirement-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    saveCheckboxStates();
    updateSelectionCount();
    updateReportData();
}

/**
 * Deselecciona todos los requerimientos
 */
function deselectAllRequirements() {
    const checkboxes = document.querySelectorAll('.requirement-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    saveCheckboxStates();
    updateSelectionCount();
    updateReportData();
}

/**
 * Actualiza el contador de selección
 */
function updateSelectionCount() {
    const selectedCheckboxes = document.querySelectorAll('.requirement-checkbox:checked');
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedCheckboxes.length;
    }
}

/**
 * Guarda el estado de los checkboxes seleccionados
 */
function saveCheckboxStates() {
    const selectedCheckboxes = document.querySelectorAll('.requirement-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.requirementId);
    localStorage.setItem('dashboardSelectedRequirements', JSON.stringify(selectedIds));
}

/**
 * Restaura el estado de los checkboxes seleccionados
 */
function restoreCheckboxStates() {
    try {
        const savedIds = localStorage.getItem('dashboardSelectedRequirements');
        if (savedIds) {
            const selectedIds = JSON.parse(savedIds);
            selectedIds.forEach(id => {
                const checkbox = document.getElementById(`checkbox-${id}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            updateSelectionCount();
        }
    } catch (error) {
        console.error('❌ Error restaurando estado de checkboxes:', error);
    }
}

/**
 * Limpia el estado de los checkboxes guardado
 */
function clearCheckboxStates() {
    localStorage.removeItem('dashboardSelectedRequirements');
}

/**
 * Actualiza los datos del reporte
 */
function updateReportData() {
    const selectedCheckboxes = document.querySelectorAll('.requirement-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.requirementId);
    
    // Obtener requerimientos seleccionados
    const selectedRequirements = requirementsList.filter(req => selectedIds.includes(req.id));
    
    // Actualizar resumen ejecutivo
    updateExecutiveSummary(selectedRequirements);
    
    // Actualizar vista detallada
    updateDetailedView(selectedRequirements);
}

/**
 * Actualiza el resumen ejecutivo
 */
function updateExecutiveSummary(requirements) {
    const totalSelected = requirements.length;
    const totalTime = requirements.reduce((sum, req) => sum + (req.stats.totalHours || 0), 0);
    const totalScenarios = requirements.reduce((sum, req) => sum + (req.stats.totalScenarios || 0), 0);
    const totalOK = requirements.reduce((sum, req) => sum + (req.stats.totalOK || 0), 0);
    const successRate = totalScenarios > 0 ? Math.round((totalOK / totalScenarios) * 100) : 0;
    
    // Actualizar elementos
    const elements = {
        totalSelected: document.getElementById('totalSelected'),
        totalTime: document.getElementById('totalTime'),
        successRate: document.getElementById('successRate'),
        totalScenarios: document.getElementById('totalScenarios')
    };
    
    if (elements.totalSelected) elements.totalSelected.textContent = totalSelected;
    if (elements.totalTime) elements.totalTime.textContent = totalTime.toFixed(1);
    if (elements.successRate) elements.successRate.textContent = successRate + '%';
    if (elements.totalScenarios) elements.totalScenarios.textContent = totalScenarios;
}

/**
 * Actualiza la vista detallada
 */
function updateDetailedView(requirements) {
    const tableElement = document.getElementById('reportTable');
    if (!tableElement) return;
    
    // Crear header
    const headerHTML = `
        <div class="report-row header">
            <div class="report-cell">Requerimiento</div>
            <div class="report-cell">Nombre</div>
            <div class="report-cell">Prioridad</div>
            <div class="report-cell">Estado</div>
            <div class="report-cell">Progreso</div>
            <div class="report-cell">Tiempo</div>
        </div>
    `;
    
    // Crear filas de datos
    const rowsHTML = requirements.map(req => {
        // Usar la misma lógica que las tarjetas del dashboard
        const progress = req.stats.totalScenarios > 0 ? 
            Math.round((req.stats.completedScenarios / req.stats.totalScenarios) * 100) : 0;
        
        return `
            <div class="report-row">
                <div class="report-cell">${escapeHtml(req.number)}</div>
                <div class="report-cell">${escapeHtml(req.name)}</div>
                <div class="report-cell priority">
                    <div class="priority-dot priority-${req.priority}"></div>
                    ${req.priority}
                </div>
                <div class="report-cell">${getStatusText(req.status)}</div>
                <div class="report-cell">${progress}%</div>
                <div class="report-cell">${(req.stats.totalHours || 0).toFixed(1)} hs</div>
            </div>
        `;
    }).join('');
    
    tableElement.innerHTML = headerHTML + rowsHTML;
}

/**
 * Configura actualización automática de estadísticas
 */
function setupStatsAutoUpdate() {
    console.log('🔄 Configurando actualización automática de estadísticas...');
    
    // Actualizar estadísticas cada 10 segundos (menos agresivo)
    setInterval(() => {
        console.log('🔄 Actualizando estadísticas automáticamente...');
        
        // Solo actualizar datos, NO refrescar la interfaz completa
        if (typeof syncFromAppToDashboard === 'function') {
            syncFromAppToDashboard();
        }
        
        // Solo actualizar estadísticas, NO refrescar la interfaz
        if (typeof updateAllRequirementsStats === 'function') {
            updateAllRequirementsStats();
            updateStatsOnly(); // Solo actualizar estadísticas, no la interfaz completa
        }
    }, 10000); // Cambiado de 2 segundos a 10 segundos
    
    // Actualizar estadísticas cuando la página se vuelve visible (INMEDIATO)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('🔄 Página visible - actualizando estadísticas INMEDIATAMENTE...');
            
            // Sincronizar desde la app
            if (typeof syncFromAppToDashboard === 'function') {
                syncFromAppToDashboard();
            }
            
            // Actualizar estadísticas SIN refrescar la interfaz
            if (typeof updateAllRequirementsStats === 'function') {
                updateAllRequirementsStats();
                updateStatsOnly(); // Solo actualizar estadísticas, no la interfaz completa
            }
        }
    });
    
    // Actualizar estadísticas al hacer focus en la ventana
    window.addEventListener('focus', () => {
        console.log('🔄 Ventana con focus - actualizando estadísticas...');
        
        // Sincronizar desde la app
        if (typeof syncFromAppToDashboard === 'function') {
            syncFromAppToDashboard();
        }
        
        // Actualizar estadísticas SIN refrescar la interfaz
        if (typeof updateAllRequirementsStats === 'function') {
            updateAllRequirementsStats();
            updateStatsOnly(); // Solo actualizar estadísticas, no la interfaz completa
        }
    });
    
    console.log('✅ Actualización automática de estadísticas configurada');
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.openNewRequirementModal = openNewRequirementModal;
window.closeNewRequirementModal = closeNewRequirementModal;
window.handleNewRequirementSubmit = handleNewRequirementSubmit;
window.openEditRequirementModal = openEditRequirementModal;
window.closeEditRequirementModal = closeEditRequirementModal;
window.handleEditRequirementSubmit = handleEditRequirementSubmit;
window.handleFilterChange = handleFilterChange;
window.handleSearch = handleSearch;
window.handleSortChange = handleSortChange;
window.editRequirement = editRequirement;
window.deleteRequirementConfirm = deleteRequirementConfirm;
window.initializeDashboardUI = initializeDashboardUI;
window.setupStatsAutoUpdate = setupStatsAutoUpdate;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeDashboardUI);
