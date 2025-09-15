// ===============================================
// INPUT-OPTIMIZER.JS - Debouncing y optimización de inputs
// ===============================================

window.GestorCP = window.GestorCP || {};

/**
 * Sistema de optimización de inputs con debouncing, throttling y validación
 */
GestorCP.InputOptimizer = {
    // Instancias de debouncing/throttling activas
    activeInstances: new Map(),
    
    // Configuración por defecto
    config: {
        defaultDebounceDelay: 300,
        defaultThrottleDelay: 100,
        maxInputLength: 1000,
        minInputLength: 1,
        validationDelay: 500
    },
    
    // Estadísticas
    stats: {
        inputsOptimized: 0,
        searchesDebounced: 0,
        validationsSkipped: 0,
        performanceGains: 0
    },
    
    /**
     * Inicializar optimizador de inputs
     */
    init: function() {
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('⌨️ Input Optimizer inicializado');
        }
    },
    
    /**
     * Optimizar input con debouncing
     */
    debounceInput: function(input, callback, delay = null, options = {}) {
        const finalDelay = delay || this.config.defaultDebounceDelay;
        const inputId = input.id || `input_${Date.now()}_${Math.random()}`;
        
        // Limpiar instancia anterior si existe
        if (this.activeInstances.has(inputId)) {
            clearTimeout(this.activeInstances.get(inputId).timeoutId);
        }
        
        const instance = {
            input,
            callback,
            delay: finalDelay,
            timeoutId: null,
            lastValue: input.value,
            options: {
                immediate: false,
                maxWait: null,
                leading: false,
                trailing: true,
                ...options
            }
        };
        
        this.activeInstances.set(inputId, instance);
        
        // Crear función debounced
        const debouncedFunction = (event) => {
            const currentValue = input.value;
            const now = Date.now();
            
            // Validaciones básicas
            if (this.shouldSkipInput(currentValue, instance)) {
                this.stats.validationsSkipped++;
                return;
            }
            
            // Limpiar timeout anterior
            if (instance.timeoutId) {
                clearTimeout(instance.timeoutId);
            }
            
            // Ejecutar inmediatamente si es leading
            if (instance.options.leading && currentValue !== instance.lastValue) {
                this.executeCallback(instance, event, currentValue);
                instance.lastValue = currentValue;
            }
            
            // Programar ejecución
            instance.timeoutId = setTimeout(() => {
                if (instance.options.trailing) {
                    this.executeCallback(instance, event, currentValue);
                    instance.lastValue = currentValue;
                }
                instance.timeoutId = null;
            }, finalDelay);
            
            this.stats.searchesDebounced++;
        };
        
        // Agregar event listeners
        input.addEventListener('input', debouncedFunction);
        input.addEventListener('keyup', debouncedFunction);
        input.addEventListener('paste', debouncedFunction);
        
        // Retornar función de limpieza
        return () => {
            if (instance.timeoutId) {
                clearTimeout(instance.timeoutId);
            }
            this.activeInstances.delete(inputId);
            input.removeEventListener('input', debouncedFunction);
            input.removeEventListener('keyup', debouncedFunction);
            input.removeEventListener('paste', debouncedFunction);
        };
    },
    
    /**
     * Optimizar input con throttling
     */
    throttleInput: function(input, callback, delay = null, options = {}) {
        const finalDelay = delay || this.config.defaultThrottleDelay;
        const inputId = input.id || `throttle_${Date.now()}_${Math.random()}`;
        
        const instance = {
            input,
            callback,
            delay: finalDelay,
            lastExecuted: 0,
            pendingExecution: false,
            options: {
                leading: true,
                trailing: true,
                ...options
            }
        };
        
        this.activeInstances.set(inputId, instance);
        
        const throttledFunction = (event) => {
            const currentValue = input.value;
            const now = Date.now();
            
            if (this.shouldSkipInput(currentValue, instance)) {
                this.stats.validationsSkipped++;
                return;
            }
            
            const timeSinceLastExecution = now - instance.lastExecuted;
            
            // Ejecutar inmediatamente si es leading y ha pasado suficiente tiempo
            if (instance.options.leading && timeSinceLastExecution >= finalDelay) {
                this.executeCallback(instance, event, currentValue);
                instance.lastExecuted = now;
            } else if (instance.options.trailing && !instance.pendingExecution) {
                // Programar ejecución al final del período
                instance.pendingExecution = true;
                setTimeout(() => {
                    this.executeCallback(instance, event, input.value);
                    instance.lastExecuted = Date.now();
                    instance.pendingExecution = false;
                }, finalDelay - timeSinceLastExecution);
            }
        };
        
        input.addEventListener('input', throttledFunction);
        input.addEventListener('keyup', throttledFunction);
        
        return () => {
            this.activeInstances.delete(inputId);
            input.removeEventListener('input', throttledFunction);
            input.removeEventListener('keyup', throttledFunction);
        };
    },
    
    /**
     * Verificar si se debe omitir el input
     */
    shouldSkipInput: function(value, instance) {
        // Omitir si es muy corto
        if (value.length < this.config.minInputLength) {
            return true;
        }
        
        // Omitir si es muy largo
        if (value.length > this.config.maxInputLength) {
            return true;
        }
        
        // Omitir si no ha cambiado
        if (value === instance.lastValue) {
            return true;
        }
        
        // Omitir si solo contiene espacios
        if (value.trim().length === 0) {
            return true;
        }
        
        return false;
    },
    
    /**
     * Ejecutar callback con optimizaciones
     */
    executeCallback: function(instance, event, value) {
        const startTime = performance.now();
        
        try {
            // Ejecutar callback con contexto optimizado
            const result = instance.callback.call(instance.input, {
                value,
                event,
                input: instance.input,
                timestamp: Date.now()
            });
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            this.stats.performanceGains += Math.max(0, 10 - executionTime); // Estimación
            
            if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
                console.log(`⌨️ Input callback ejecutado: ${executionTime.toFixed(2)}ms`, {
                    value: value.substring(0, 50) + (value.length > 50 ? '...' : ''),
                    inputId: instance.input.id || 'sin-id'
                });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error en callback de input:', error);
        }
    },
    
    /**
     * Optimizar búsqueda en tiempo real
     */
    optimizeSearch: function(searchInput, searchCallback, options = {}) {
        const defaultOptions = {
            debounceDelay: 300,
            minLength: 2,
            maxResults: 100,
            cacheResults: true,
            showLoading: true,
            ...options
        };
        
        let isLoading = false;
        let lastSearchQuery = '';
        
        const searchFunction = (event) => {
            const query = searchInput.value.trim();
            
            // Validaciones
            if (query.length < defaultOptions.minLength) {
                searchCallback([]);
                return;
            }
            
            if (query === lastSearchQuery) {
                return; // Evitar búsquedas duplicadas
            }
            
            lastSearchQuery = query;
            
            // Mostrar loading si está habilitado
            if (defaultOptions.showLoading) {
                this.showSearchLoading(searchInput, true);
            }
            
            // Verificar caché si está habilitado
            if (defaultOptions.cacheResults && GestorCP.SmartCache) {
                const cachedResults = GestorCP.SmartCache.search.get(query, {});
                if (cachedResults) {
                    searchCallback(cachedResults);
                    if (defaultOptions.showLoading) {
                        this.showSearchLoading(searchInput, false);
                    }
                    return;
                }
            }
            
            // Ejecutar búsqueda
            const startTime = performance.now();
            
            // Simular búsqueda asíncrona (en implementación real sería una llamada a API)
            setTimeout(() => {
                try {
                    const results = this.performSearch(query, defaultOptions);
                    
                    // Guardar en caché si está habilitado
                    if (defaultOptions.cacheResults && GestorCP.SmartCache) {
                        GestorCP.SmartCache.search.set(query, {}, results);
                    }
                    
                    searchCallback(results);
                    
                    const endTime = performance.now();
                    const searchTime = endTime - startTime;
                    
                    if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
                        console.log(`🔍 Búsqueda completada: ${results.length} resultados en ${searchTime.toFixed(2)}ms`);
                    }
                } catch (error) {
                    console.error('❌ Error en búsqueda:', error);
                    searchCallback([]);
                } finally {
                    if (defaultOptions.showLoading) {
                        this.showSearchLoading(searchInput, false);
                    }
                }
            }, 50); // Simular delay de red
        };
        
        return this.debounceInput(searchInput, searchFunction, defaultOptions.debounceDelay);
    },
    
    /**
     * Realizar búsqueda (simulada)
     */
    performSearch: function(query, options) {
        // En implementación real, esto sería una llamada a SearchOptimizer
        const mockResults = [];
        const resultCount = Math.min(Math.floor(Math.random() * 50) + 1, options.maxResults);
        
        for (let i = 0; i < resultCount; i++) {
            mockResults.push({
                id: `result_${i}`,
                title: `Resultado ${i} para "${query}"`,
                description: `Descripción del resultado ${i}`,
                relevance: Math.random()
            });
        }
        
        return mockResults.sort((a, b) => b.relevance - a.relevance);
    },
    
    /**
     * Mostrar/ocultar indicador de carga
     */
    showSearchLoading: function(input, show) {
        const loadingIndicator = input.parentNode.querySelector('.search-loading') ||
                               this.createLoadingIndicator();
        
        if (!input.parentNode.querySelector('.search-loading')) {
            input.parentNode.appendChild(loadingIndicator);
        }
        
        loadingIndicator.style.display = show ? 'block' : 'none';
    },
    
    /**
     * Crear indicador de carga
     */
    createLoadingIndicator: function() {
        const indicator = document.createElement('div');
        indicator.className = 'search-loading';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Buscando...</span>
        `;
        indicator.style.cssText = `
            display: none;
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--text-secondary, #666);
            font-size: 12px;
        `;
        
        return indicator;
    },
    
    /**
     * Optimizar formulario completo
     */
    optimizeForm: function(form, options = {}) {
        const defaultOptions = {
            validateOnInput: true,
            debounceDelay: 300,
            showValidationFeedback: true,
            ...options
        };
        
        const inputs = form.querySelectorAll('input, textarea, select');
        const cleanupFunctions = [];
        
        inputs.forEach(input => {
            // Optimizar cada input
            const cleanup = this.debounceInput(input, (event) => {
                if (defaultOptions.validateOnInput) {
                    this.validateInput(input, defaultOptions.showValidationFeedback);
                }
            }, defaultOptions.debounceDelay);
            
            cleanupFunctions.push(cleanup);
        });
        
        // Retornar función de limpieza
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    },
    
    /**
     * Validar input
     */
    validateInput: function(input, showFeedback = true) {
        const value = input.value.trim();
        const inputType = input.type || 'text';
        let isValid = true;
        let errorMessage = '';
        
        // Validaciones básicas
        if (input.required && value.length === 0) {
            isValid = false;
            errorMessage = 'Este campo es requerido';
        } else if (inputType === 'email' && value.length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Email inválido';
            }
        } else if (inputType === 'number' && value.length > 0) {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                isValid = false;
                errorMessage = 'Número inválido';
            } else if (input.min && numValue < parseFloat(input.min)) {
                isValid = false;
                errorMessage = `Valor mínimo: ${input.min}`;
            } else if (input.max && numValue > parseFloat(input.max)) {
                isValid = false;
                errorMessage = `Valor máximo: ${input.max}`;
            }
        }
        
        // Mostrar feedback si está habilitado
        if (showFeedback) {
            this.showValidationFeedback(input, isValid, errorMessage);
        }
        
        return isValid;
    },
    
    /**
     * Mostrar feedback de validación
     */
    showValidationFeedback: function(input, isValid, errorMessage) {
        // Remover feedback anterior
        const existingFeedback = input.parentNode.querySelector('.validation-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Agregar nuevo feedback
        if (!isValid && errorMessage) {
            const feedback = document.createElement('div');
            feedback.className = 'validation-feedback error';
            feedback.textContent = errorMessage;
            feedback.style.cssText = `
                color: var(--error-color, #dc3545);
                font-size: 12px;
                margin-top: 4px;
            `;
            input.parentNode.appendChild(feedback);
        }
        
        // Actualizar estilos del input
        input.classList.toggle('invalid', !isValid);
        input.classList.toggle('valid', isValid && input.value.length > 0);
    },
    
    /**
     * Obtener estadísticas
     */
    getStats: function() {
        return {
            ...this.stats,
            activeInstances: this.activeInstances.size,
            inputsOptimized: this.stats.inputsOptimized,
            performanceGain: this.stats.performanceGains.toFixed(2) + 'ms'
        };
    },
    
    /**
     * Limpiar todas las instancias
     */
    cleanup: function() {
        this.activeInstances.forEach(instance => {
            if (instance.timeoutId) {
                clearTimeout(instance.timeoutId);
            }
        });
        
        this.activeInstances.clear();
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('🧹 Input Optimizer limpiado');
        }
    }
};

// ===============================================
// ESTILOS CSS PARA INPUTS OPTIMIZADOS
// ===============================================

const inputOptimizerStyles = `
<style>
.search-loading {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text-secondary, #666);
    font-size: 12px;
}

.loading-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--border-color, #ddd);
    border-top: 2px solid var(--primary-color, #007bff);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.validation-feedback {
    margin-top: 4px;
    font-size: 12px;
}

.validation-feedback.error {
    color: var(--error-color, #dc3545);
}

.validation-feedback.success {
    color: var(--success-color, #28a745);
}

input.invalid {
    border-color: var(--error-color, #dc3545);
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

input.valid {
    border-color: var(--success-color, #28a745);
    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
}
</style>
`;

// Inyectar estilos
document.head.insertAdjacentHTML('beforeend', inputOptimizerStyles);

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.GestorCP = GestorCP;
window.InputOptimizer = GestorCP.InputOptimizer;

// Inicializar automáticamente
if (typeof GestorCP.InputOptimizer.init === 'function') {
    GestorCP.InputOptimizer.init();
}
