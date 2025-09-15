// ===============================================
// LAZY-LOADER.JS - Carga diferida de componentes pesados
// ===============================================

window.GestorCP = window.GestorCP || {};

/**
 * Sistema de lazy loading para optimizar la carga inicial
 */
GestorCP.LazyLoader = {
    // Componentes registrados para carga diferida
    components: new Map(),
    
    // Componentes ya cargados
    loadedComponents: new Set(),
    
    // Configuración por defecto
    config: {
        loadingDelay: 100, // Delay mínimo antes de cargar
        intersectionThreshold: 0.1, // Porcentaje visible para cargar
        preloadDistance: 200 // Píxeles antes de ser visible para precargar
    },
    
    /**
     * Registrar un componente para carga diferida
     */
    register: function(name, loader, options = {}) {
        this.components.set(name, {
            loader,
            options: { ...this.config, ...options },
            element: null,
            loaded: false,
            loading: false
        });
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`📦 Componente registrado para lazy loading: ${name}`);
        }
    },
    
    /**
     * Inicializar lazy loading en un elemento
     */
    init: function(element, componentName) {
        const component = this.components.get(componentName);
        if (!component) {
            console.error(`❌ Componente no registrado: ${componentName}`);
            return;
        }
        
        component.element = element;
        
        // Crear placeholder
        this.createPlaceholder(element, componentName);
        
        // Configurar intersection observer
        this.setupIntersectionObserver(element, componentName);
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`🔄 Lazy loading inicializado para: ${componentName}`);
        }
    },
    
    /**
     * Crear placeholder mientras se carga el componente
     */
    createPlaceholder: function(element, componentName) {
        const component = this.components.get(componentName);
        const placeholder = document.createElement('div');
        
        placeholder.className = 'lazy-placeholder';
        placeholder.innerHTML = `
            <div class="lazy-loading-spinner">
                <div class="spinner"></div>
                <span>Cargando ${componentName}...</span>
            </div>
        `;
        
        // Estilos del placeholder
        placeholder.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            background: var(--bg-secondary, #f5f5f5);
            border-radius: 8px;
            margin: 10px 0;
        `;
        
        element.appendChild(placeholder);
    },
    
    /**
     * Configurar intersection observer para detectar visibilidad
     */
    setupIntersectionObserver: function(element, componentName) {
        const component = this.components.get(componentName);
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !component.loaded && !component.loading) {
                    this.loadComponent(componentName);
                }
            });
        }, {
            threshold: component.options.intersectionThreshold,
            rootMargin: `${component.options.preloadDistance}px`
        });
        
        observer.observe(element);
        
        // Guardar observer para cleanup
        component.observer = observer;
    },
    
    /**
     * Cargar componente cuando sea necesario
     */
    loadComponent: async function(componentName) {
        const component = this.components.get(componentName);
        if (!component || component.loaded || component.loading) return;
        
        component.loading = true;
        
        try {
            if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
                console.log(`🔄 Cargando componente: ${componentName}`);
            }
            
            // Delay mínimo para evitar cargas muy rápidas
            await new Promise(resolve => setTimeout(resolve, component.options.loadingDelay));
            
            // Cargar el componente
            const result = await component.loader();
            
            // Reemplazar placeholder con contenido real
            if (component.element) {
                const placeholder = component.element.querySelector('.lazy-placeholder');
                if (placeholder) {
                    placeholder.remove();
                }
                
                if (typeof result === 'string') {
                    component.element.innerHTML = result;
                } else if (result instanceof HTMLElement) {
                    component.element.appendChild(result);
                } else if (typeof result === 'function') {
                    result(component.element);
                }
            }
            
            component.loaded = true;
            component.loading = false;
            this.loadedComponents.add(componentName);
            
            // Emitir evento de carga completada
            if (GestorCP.Events) {
                GestorCP.Events.emit('lazy:component_loaded', componentName);
            }
            
            if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
                console.log(`✅ Componente cargado: ${componentName}`);
            }
            
        } catch (error) {
            console.error(`❌ Error cargando componente ${componentName}:`, error);
            component.loading = false;
            
            // Mostrar error en placeholder
            const placeholder = component.element?.querySelector('.lazy-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <div class="lazy-error">
                        <span>❌ Error cargando ${componentName}</span>
                        <button onclick="GestorCP.LazyLoader.retry('${componentName}')">Reintentar</button>
                    </div>
                `;
            }
        }
    },
    
    /**
     * Reintentar carga de componente
     */
    retry: function(componentName) {
        const component = this.components.get(componentName);
        if (component) {
            component.loaded = false;
            component.loading = false;
            this.loadComponent(componentName);
        }
    },
    
    /**
     * Precargar componente (cargar inmediatamente)
     */
    preload: function(componentName) {
        const component = this.components.get(componentName);
        if (component && !component.loaded && !component.loading) {
            this.loadComponent(componentName);
        }
    },
    
    /**
     * Verificar si componente está cargado
     */
    isLoaded: function(componentName) {
        return this.loadedComponents.has(componentName);
    },
    
    /**
     * Obtener estadísticas de carga
     */
    getStats: function() {
        return {
            totalComponents: this.components.size,
            loadedComponents: this.loadedComponents.size,
            loadingProgress: (this.loadedComponents.size / this.components.size) * 100
        };
    },
    
    /**
     * Limpiar recursos
     */
    cleanup: function() {
        this.components.forEach(component => {
            if (component.observer) {
                component.observer.disconnect();
            }
        });
        
        this.components.clear();
        this.loadedComponents.clear();
    }
};

/**
 * Componentes específicos para lazy loading
 */
GestorCP.LazyComponents = {
    /**
     * Cargar tabla de escenarios
     */
    scenariosTable: async function() {
        // Simular carga de componente pesado
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return `
            <div class="scenarios-table-container">
                <div class="table-header">
                    <h3>Tabla de Escenarios</h3>
                    <div class="table-actions">
                        <button class="btn-add">+ Agregar Escenario</button>
                        <button class="btn-bulk">Acciones Masivas</button>
                    </div>
                </div>
                <div class="table-content">
                    <!-- La tabla se renderizará aquí -->
                </div>
            </div>
        `;
    },
    
    /**
     * Cargar panel de estadísticas
     */
    statsPanel: async function() {
        await new Promise(resolve => setTimeout(resolve, 150));
        
        return `
            <div class="stats-panel">
                <div class="stat-item">
                    <span class="stat-label">Total Escenarios</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Escenarios OK</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Escenarios NO</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Progreso</span>
                    <span class="stat-value">0%</span>
                </div>
            </div>
        `;
    },
    
    /**
     * Cargar panel de filtros
     */
    filtersPanel: async function() {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return `
            <div class="filters-panel">
                <div class="filter-group">
                    <label>Filtrar por Estado:</label>
                    <select class="status-filter">
                        <option value="">Todos</option>
                        <option value="OK">OK</option>
                        <option value="NO">NO</option>
                        <option value="">Pendiente</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Filtrar por Tester:</label>
                    <select class="tester-filter">
                        <option value="">Todos</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Buscar:</label>
                    <input type="text" class="search-input" placeholder="Buscar en descripción...">
                </div>
            </div>
        `;
    },
    
    /**
     * Cargar panel de timers
     */
    timersPanel: async function() {
        await new Promise(resolve => setTimeout(resolve, 120));
        
        return `
            <div class="timers-panel">
                <div class="timer-item testing-timer" style="display: none;">
                    <div class="timer-info">
                        <span class="timer-label">Testing</span>
                        <span class="timer-scenario">Escenario #</span>
                    </div>
                    <div class="timer-display">00:00</div>
                    <div class="timer-actions">
                        <button class="btn-pause">⏸️</button>
                        <button class="btn-stop">⏹️</button>
                    </div>
                </div>
                <div class="timer-item bugfixing-timer" style="display: none;">
                    <div class="timer-info">
                        <span class="timer-label">Bugfixing</span>
                        <span class="timer-scenario">Escenario #</span>
                    </div>
                    <div class="timer-display">00:00</div>
                    <div class="timer-actions">
                        <button class="btn-stop">⏹️</button>
                    </div>
                </div>
            </div>
        `;
    }
};

// ===============================================
// ESTILOS CSS PARA LAZY LOADING
// ===============================================

const lazyLoadingStyles = `
<style>
.lazy-loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--text-secondary, #666);
}

.spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #ddd);
    border-top: 3px solid var(--primary-color, #007bff);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.lazy-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--error-color, #dc3545);
}

.lazy-error button {
    padding: 8px 16px;
    background: var(--primary-color, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.lazy-error button:hover {
    background: var(--primary-hover, #0056b3);
}
</style>
`;

// Inyectar estilos
document.head.insertAdjacentHTML('beforeend', lazyLoadingStyles);

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.GestorCP = GestorCP;
window.LazyLoader = GestorCP.LazyLoader;
window.LazyComponents = GestorCP.LazyComponents;
