// ===============================================
// VIRTUAL-SCROLL.JS - Renderizado optimizado para tablas grandes
// ===============================================

window.GestorCP = window.GestorCP || {};

/**
 * Sistema de scroll virtual para optimizar renderizado de tablas grandes
 */
GestorCP.VirtualScroll = {
    // Configuración por defecto
    config: {
        itemHeight: 50, // Altura de cada fila en px
        containerHeight: 400, // Altura del contenedor visible
        bufferSize: 5, // Número de elementos extra a renderizar fuera del viewport
        throttleDelay: 16 // Delay para throttling del scroll (60fps)
    },
    
    // Estado del scroll virtual
    state: {
        scrollTop: 0,
        startIndex: 0,
        endIndex: 0,
        visibleCount: 0,
        totalHeight: 0
    },
    
    /**
     * Inicializar scroll virtual en un contenedor
     */
    init: function(container, items, renderFunction, options = {}) {
        const config = { ...this.config, ...options };
        
        // Crear estructura HTML
        container.innerHTML = `
            <div class="virtual-scroll-container" style="height: ${config.containerHeight}px; overflow-y: auto; position: relative;">
                <div class="virtual-scroll-spacer" style="height: 0px;"></div>
                <div class="virtual-scroll-content"></div>
                <div class="virtual-scroll-spacer-bottom" style="height: 0px;"></div>
            </div>
        `;
        
        const scrollContainer = container.querySelector('.virtual-scroll-container');
        const contentContainer = container.querySelector('.virtual-scroll-content');
        const topSpacer = container.querySelector('.virtual-scroll-spacer');
        const bottomSpacer = container.querySelector('.virtual-scroll-spacer-bottom');
        
        // Calcular estado inicial
        this.state.totalHeight = items.length * config.itemHeight;
        this.state.visibleCount = Math.ceil(config.containerHeight / config.itemHeight);
        
        // Función para actualizar el renderizado
        const updateRender = () => {
            const { startIndex, endIndex } = this.calculateVisibleRange();
            
            // Actualizar espaciadores
            topSpacer.style.height = `${startIndex * config.itemHeight}px`;
            bottomSpacer.style.height = `${(items.length - endIndex) * config.itemHeight}px`;
            
            // Renderizar elementos visibles
            const visibleItems = items.slice(startIndex, endIndex);
            contentContainer.innerHTML = '';
            
            visibleItems.forEach((item, index) => {
                const element = renderFunction(item, startIndex + index);
                if (element) {
                    element.style.height = `${config.itemHeight}px`;
                    element.style.position = 'absolute';
                    element.style.top = `${index * config.itemHeight}px`;
                    element.style.width = '100%';
                    contentContainer.appendChild(element);
                }
            });
            
            this.state.startIndex = startIndex;
            this.state.endIndex = endIndex;
        };
        
        // Función throttled para el scroll
        const throttledScroll = this.throttle((event) => {
            this.state.scrollTop = event.target.scrollTop;
            updateRender();
        }, config.throttleDelay);
        
        // Event listeners
        scrollContainer.addEventListener('scroll', throttledScroll);
        
        // Renderizado inicial
        updateRender();
        
        // Retornar API para control
        return {
            updateItems: (newItems) => {
                items = newItems;
                this.state.totalHeight = items.length * config.itemHeight;
                updateRender();
            },
            
            scrollToIndex: (index) => {
                const scrollTop = index * config.itemHeight;
                scrollContainer.scrollTop = scrollTop;
                this.state.scrollTop = scrollTop;
                updateRender();
            },
            
            getVisibleRange: () => ({
                start: this.state.startIndex,
                end: this.state.endIndex
            }),
            
            destroy: () => {
                scrollContainer.removeEventListener('scroll', throttledScroll);
                container.innerHTML = '';
            }
        };
    },
    
    /**
     * Calcular el rango de elementos visibles
     */
    calculateVisibleRange: function() {
        const config = this.config;
        const scrollTop = this.state.scrollTop;
        const containerHeight = config.containerHeight;
        
        // Índice del primer elemento visible
        const startIndex = Math.max(0, Math.floor(scrollTop / config.itemHeight) - config.bufferSize);
        
        // Índice del último elemento visible
        const endIndex = Math.min(
            this.state.totalHeight / config.itemHeight,
            startIndex + this.state.visibleCount + (config.bufferSize * 2)
        );
        
        return { startIndex, endIndex };
    },
    
    /**
     * Función throttle para optimizar rendimiento
     */
    throttle: function(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function(...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    },
    
    /**
     * Función debounce para optimizar rendimiento
     */
    debounce: function(func, delay) {
        let timeoutId;
        
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
};

/**
 * Renderizador optimizado para tablas de escenarios
 */
GestorCP.TableRenderer = {
    /**
     * Renderizar tabla de escenarios con scroll virtual
     */
    renderScenariosTable: function(container, scenarios, options = {}) {
        const defaultOptions = {
            showCheckbox: true,
            showActions: true,
            showStatus: true,
            showTimer: true,
            showBugfixing: true
        };
        
        const config = { ...defaultOptions, ...options };
        
        return GestorCP.VirtualScroll.init(
            container,
            scenarios,
            (scenario, index) => this.renderScenarioRow(scenario, index, config),
            {
                itemHeight: 60, // Altura de fila para escenarios
                containerHeight: 400
            }
        );
    },
    
    /**
     * Renderizar una fila de escenario
     */
    renderScenarioRow: function(scenario, index, config) {
        const row = document.createElement('tr');
        row.className = 'scenario-row';
        row.setAttribute('data-scenario-id', scenario.id);
        
        let html = '';
        
        // Checkbox
        if (config.showCheckbox) {
            html += `
                <td class="checkbox-cell">
                    <input type="checkbox" class="scenario-checkbox" data-id="${scenario.id}">
                    ${scenario.bugfixingTimer && scenario.bugfixingTimer.state === 'RUNNING' ? '🐛' : ''}
                </td>
            `;
        }
        
        // Número de escenario y ciclo
        html += `
            <td class="scenario-number-cell">
                <strong>${scenario.scenarioNumber}</strong>
                ${scenario.cycleNumber ? `-${scenario.cycleNumber}` : ''}
            </td>
        `;
        
        // Descripción
        html += `
            <td class="description-cell">
                ${scenario.description || ''}
            </td>
        `;
        
        // Resultado obtenido
        html += `
            <td class="result-cell">
                ${scenario.obtainedResult || ''}
            </td>
        `;
        
        // Estado
        if (config.showStatus) {
            html += `
                <td class="status-cell">
                    <select class="status-select" data-id="${scenario.id}">
                        <option value="">Pendiente</option>
                        <option value="OK" ${scenario.status === 'OK' ? 'selected' : ''}>OK</option>
                        <option value="NO" ${scenario.status === 'NO' ? 'selected' : ''}>NO</option>
                    </select>
                </td>
            `;
        }
        
        // Fecha
        html += `
            <td class="date-cell">
                ${scenario.executionDate ? formatDateForDisplay(scenario.executionDate) : ''}
            </td>
        `;
        
        // Tester
        html += `
            <td class="tester-cell">
                ${scenario.tester || ''}
            </td>
        `;
        
        // Tiempo
        html += `
            <td class="time-cell">
                ${scenario.testTime ? formatTime(scenario.testTime * 60) : ''}
            </td>
        `;
        
        // Acciones
        if (config.showActions) {
            html += `
                <td class="actions-cell">
                    <button class="btn-edit" onclick="openEditModal('${scenario.id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-duplicate" onclick="duplicateTestCase('${scenario.id}')" title="Duplicar">
                        📋
                    </button>
                    <button class="btn-delete" onclick="deleteTestCase('${scenario.id}')" title="Eliminar">
                        🗑️
                    </button>
                    ${scenario.status === 'NO' ? `
                        <button class="btn-bugfixing" onclick="startBugfixingTimer('${scenario.id}')" title="Iniciar Bugfixing">
                            🐛
                        </button>
                    ` : ''}
                </td>
            `;
        }
        
        row.innerHTML = html;
        
        // Agregar event listeners
        this.attachRowEventListeners(row, scenario);
        
        return row;
    },
    
    /**
     * Adjuntar event listeners a una fila
     */
    attachRowEventListeners: function(row, scenario) {
        // Checkbox
        const checkbox = row.querySelector('.scenario-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.handleCheckboxChange(e, scenario);
            });
        }
        
        // Status select
        const statusSelect = row.querySelector('.status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.handleStatusChange(e, scenario);
            });
        }
    },
    
    /**
     * Manejar cambio de checkbox
     */
    handleCheckboxChange: function(event, scenario) {
        // Emitir evento de selección
        if (GestorCP.Events) {
            GestorCP.Events.emit('scenario:selected', {
                scenarioId: scenario.id,
                selected: event.target.checked
            });
        }
        
        // Actualizar visibilidad de timers
        if (typeof updateTimerBarsVisibility === 'function') {
            updateTimerBarsVisibility();
        }
    },
    
    /**
     * Manejar cambio de estado
     */
    handleStatusChange: function(event, scenario) {
        const newStatus = event.target.value;
        const oldStatus = scenario.status;
        
        scenario.status = newStatus;
        
        // Emitir evento de cambio de estado
        if (GestorCP.Events) {
            GestorCP.Events.emitCaseUpdated(scenario);
            GestorCP.Events.emitStatusChanged(scenario.id, oldStatus, newStatus);
        }
        
        // Actualizar fecha si es necesario
        if (newStatus && newStatus !== oldStatus && typeof updateStatusAndDate === 'function') {
            updateStatusAndDate(scenario.id, newStatus);
        }
    }
};

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.GestorCP = GestorCP;
window.VirtualScroll = GestorCP.VirtualScroll;
window.TableRenderer = GestorCP.TableRenderer;
