// ===============================================
// DOM-OPTIMIZER.JS - Optimización de operaciones DOM con batch updates
// ===============================================

window.GestorCP = window.GestorCP || {};

/**
 * Sistema de optimización DOM con batch updates y virtual DOM
 */
GestorCP.DOMOptimizer = {
    // Cola de operaciones DOM pendientes
    operationQueue: [],
    
    // Flag para indicar si hay operaciones pendientes
    hasPendingOperations: false,
    
    // Configuración
    config: {
        batchDelay: 16, // ~60fps
        maxBatchSize: 100,
        useDocumentFragment: true,
        useRequestAnimationFrame: true
    },
    
    // Estadísticas
    stats: {
        operationsBatched: 0,
        operationsExecuted: 0,
        batchesProcessed: 0,
        timeSaved: 0
    },
    
    /**
     * Inicializar el optimizador DOM
     */
    init: function() {
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('⚡ DOM Optimizer inicializado');
        }
    },
    
    /**
     * Agregar operación a la cola
     */
    queueOperation: function(operation) {
        this.operationQueue.push({
            ...operation,
            timestamp: Date.now()
        });
        
        this.stats.operationsBatched++;
        
        if (!this.hasPendingOperations) {
            this.scheduleBatch();
        }
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`📋 Operación DOM encolada: ${operation.type}`, operation);
        }
    },
    
    /**
     * Programar procesamiento de lote
     */
    scheduleBatch: function() {
        this.hasPendingOperations = true;
        
        if (this.config.useRequestAnimationFrame) {
            requestAnimationFrame(() => this.processBatch());
        } else {
            setTimeout(() => this.processBatch(), this.config.batchDelay);
        }
    },
    
    /**
     * Procesar lote de operaciones
     */
    processBatch: function() {
        const startTime = performance.now();
        const operations = this.operationQueue.splice(0, this.config.maxBatchSize);
        
        if (operations.length === 0) {
            this.hasPendingOperations = false;
            return;
        }
        
        // Agrupar operaciones por tipo para optimización
        const groupedOperations = this.groupOperations(operations);
        
        // Ejecutar operaciones agrupadas
        this.executeGroupedOperations(groupedOperations);
        
        this.stats.operationsExecuted += operations.length;
        this.stats.batchesProcessed++;
        
        const endTime = performance.now();
        const batchTime = endTime - startTime;
        this.stats.timeSaved += Math.max(0, operations.length * 2 - batchTime); // Estimación
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`⚡ Batch procesado: ${operations.length} operaciones en ${batchTime.toFixed(2)}ms`);
        }
        
        // Si quedan operaciones, programar siguiente lote
        if (this.operationQueue.length > 0) {
            this.scheduleBatch();
        } else {
            this.hasPendingOperations = false;
        }
    },
    
    /**
     * Agrupar operaciones por tipo
     */
    groupOperations: function(operations) {
        const groups = {
            create: [],
            update: [],
            delete: [],
            append: [],
            remove: [],
            style: [],
            attribute: [],
            event: []
        };
        
        operations.forEach(op => {
            if (groups[op.type]) {
                groups[op.type].push(op);
            } else {
                groups.update.push(op); // Fallback
            }
        });
        
        return groups;
    },
    
    /**
     * Ejecutar operaciones agrupadas
     */
    executeGroupedOperations: function(groups) {
        // Ejecutar en orden optimizado
        this.executeCreateOperations(groups.create);
        this.executeUpdateOperations(groups.update);
        this.executeAttributeOperations(groups.attribute);
        this.executeStyleOperations(groups.style);
        this.executeAppendOperations(groups.append);
        this.executeRemoveOperations(groups.remove);
        this.executeDeleteOperations(groups.delete);
        this.executeEventOperations(groups.event);
    },
    
    /**
     * Ejecutar operaciones de creación
     */
    executeCreateOperations: function(operations) {
        if (operations.length === 0) return;
        
        const fragment = this.config.useDocumentFragment ? document.createDocumentFragment() : null;
        const createdElements = [];
        
        operations.forEach(op => {
            const element = this.createElement(op);
            if (element) {
                createdElements.push({ element, operation: op });
                
                if (fragment) {
                    fragment.appendChild(element);
                }
            }
        });
        
        // Aplicar estilos y atributos en lote
        createdElements.forEach(({ element, operation }) => {
            this.applyElementProperties(element, operation);
        });
        
        // Agregar todos los elementos al DOM de una vez
        if (fragment && operations[0]?.parent) {
            operations[0].parent.appendChild(fragment);
        } else if (!fragment) {
            createdElements.forEach(({ element, operation }) => {
                if (operation.parent) {
                    operation.parent.appendChild(element);
                }
            });
        }
    },
    
    /**
     * Ejecutar operaciones de actualización
     */
    executeUpdateOperations: function(operations) {
        if (operations.length === 0) return;
        
        // Agrupar por elemento para evitar actualizaciones múltiples
        const elementUpdates = new Map();
        
        operations.forEach(op => {
            if (!elementUpdates.has(op.element)) {
                elementUpdates.set(op.element, []);
            }
            elementUpdates.get(op.element).push(op);
        });
        
        // Aplicar todas las actualizaciones de cada elemento de una vez
        elementUpdates.forEach((updates, element) => {
            this.applyBatchUpdates(element, updates);
        });
    },
    
    /**
     * Ejecutar operaciones de atributos
     */
    executeAttributeOperations: function(operations) {
        if (operations.length === 0) return;
        
        const elementAttributes = new Map();
        
        operations.forEach(op => {
            if (!elementAttributes.has(op.element)) {
                elementAttributes.set(op.element, {});
            }
            elementAttributes.get(op.element)[op.attribute] = op.value;
        });
        
        // Aplicar todos los atributos de cada elemento de una vez
        elementAttributes.forEach((attributes, element) => {
            Object.entries(attributes).forEach(([name, value]) => {
                if (value === null) {
                    element.removeAttribute(name);
                } else {
                    element.setAttribute(name, value);
                }
            });
        });
    },
    
    /**
     * Ejecutar operaciones de estilos
     */
    executeStyleOperations: function(operations) {
        if (operations.length === 0) return;
        
        const elementStyles = new Map();
        
        operations.forEach(op => {
            if (!elementStyles.has(op.element)) {
                elementStyles.set(op.element, {});
            }
            elementStyles.get(op.element)[op.property] = op.value;
        });
        
        // Aplicar todos los estilos de cada elemento de una vez
        elementStyles.forEach((styles, element) => {
            Object.assign(element.style, styles);
        });
    },
    
    /**
     * Ejecutar operaciones de agregar
     */
    executeAppendOperations: function(operations) {
        if (operations.length === 0) return;
        
        const parentChildren = new Map();
        
        operations.forEach(op => {
            if (!parentChildren.has(op.parent)) {
                parentChildren.set(op.parent, []);
            }
            parentChildren.get(op.parent).push(op.child);
        });
        
        // Agregar todos los hijos de cada padre de una vez
        parentChildren.forEach((children, parent) => {
            if (this.config.useDocumentFragment && children.length > 1) {
                const fragment = document.createDocumentFragment();
                children.forEach(child => fragment.appendChild(child));
                parent.appendChild(fragment);
            } else {
                children.forEach(child => parent.appendChild(child));
            }
        });
    },
    
    /**
     * Ejecutar operaciones de remover
     */
    executeRemoveOperations: function(operations) {
        if (operations.length === 0) return;
        
        operations.forEach(op => {
            if (op.child && op.child.parentNode) {
                op.child.parentNode.removeChild(op.child);
            }
        });
    },
    
    /**
     * Ejecutar operaciones de eliminación
     */
    executeDeleteOperations: function(operations) {
        if (operations.length === 0) return;
        
        operations.forEach(op => {
            if (op.element && op.element.parentNode) {
                op.element.parentNode.removeChild(op.element);
            }
        });
    },
    
    /**
     * Ejecutar operaciones de eventos
     */
    executeEventOperations: function(operations) {
        if (operations.length === 0) return;
        
        operations.forEach(op => {
            if (op.eventType === 'add') {
                op.element.addEventListener(op.event, op.handler, op.options);
            } else if (op.eventType === 'remove') {
                op.element.removeEventListener(op.event, op.handler, op.options);
            }
        });
    },
    
    /**
     * Crear elemento
     */
    createElement: function(operation) {
        try {
            const element = document.createElement(operation.tagName || 'div');
            
            if (operation.id) element.id = operation.id;
            if (operation.className) element.className = operation.className;
            if (operation.innerHTML) element.innerHTML = operation.innerHTML;
            if (operation.textContent) element.textContent = operation.textContent;
            
            return element;
        } catch (error) {
            console.error('❌ Error creando elemento:', error);
            return null;
        }
    },
    
    /**
     * Aplicar propiedades del elemento
     */
    applyElementProperties: function(element, operation) {
        if (operation.attributes) {
            Object.entries(operation.attributes).forEach(([name, value]) => {
                element.setAttribute(name, value);
            });
        }
        
        if (operation.styles) {
            Object.assign(element.style, operation.styles);
        }
        
        if (operation.dataset) {
            Object.entries(operation.dataset).forEach(([key, value]) => {
                element.dataset[key] = value;
            });
        }
    },
    
    /**
     * Aplicar actualizaciones en lote a un elemento
     */
    applyBatchUpdates: function(element, updates) {
        updates.forEach(update => {
            switch (update.updateType) {
                case 'innerHTML':
                    element.innerHTML = update.value;
                    break;
                case 'textContent':
                    element.textContent = update.value;
                    break;
                case 'className':
                    element.className = update.value;
                    break;
                case 'id':
                    element.id = update.value;
                    break;
                case 'dataset':
                    if (update.key) {
                        element.dataset[update.key] = update.value;
                    }
                    break;
            }
        });
    },
    
    /**
     * API simplificada para operaciones comunes
     */
    api: {
        /**
         * Crear elemento
         */
        create: function(tagName, options = {}) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'create',
                tagName,
                ...options
            });
        },
        
        /**
         * Actualizar elemento
         */
        update: function(element, updateType, value) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'update',
                element,
                updateType,
                value
            });
        },
        
        /**
         * Agregar hijo
         */
        append: function(parent, child) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'append',
                parent,
                child
            });
        },
        
        /**
         * Remover hijo
         */
        remove: function(parent, child) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'remove',
                parent,
                child
            });
        },
        
        /**
         * Establecer atributo
         */
        setAttribute: function(element, attribute, value) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'attribute',
                element,
                attribute,
                value
            });
        },
        
        /**
         * Establecer estilo
         */
        setStyle: function(element, property, value) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'style',
                element,
                property,
                value
            });
        },
        
        /**
         * Agregar event listener
         */
        addEventListener: function(element, event, handler, options) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'event',
                eventType: 'add',
                element,
                event,
                handler,
                options
            });
        },
        
        /**
         * Remover event listener
         */
        removeEventListener: function(element, event, handler, options) {
            GestorCP.DOMOptimizer.queueOperation({
                type: 'event',
                eventType: 'remove',
                element,
                event,
                handler,
                options
            });
        }
    },
    
    /**
     * Obtener estadísticas
     */
    getStats: function() {
        return {
            ...this.stats,
            queueSize: this.operationQueue.length,
            hasPendingOperations: this.hasPendingOperations,
            averageBatchSize: this.stats.operationsExecuted / Math.max(1, this.stats.batchesProcessed),
            estimatedTimeSaved: this.stats.timeSaved.toFixed(2) + 'ms'
        };
    },
    
    /**
     * Limpiar cola de operaciones
     */
    clearQueue: function() {
        this.operationQueue = [];
        this.hasPendingOperations = false;
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('🧹 Cola de operaciones DOM limpiada');
        }
    }
};

/**
 * Utilidades de optimización DOM
 */
GestorCP.DOMUtils = {
    /**
     * Crear elemento con propiedades en una sola operación
     */
    createElement: function(tagName, properties = {}) {
        const element = document.createElement(tagName);
        
        // Aplicar todas las propiedades de una vez
        Object.entries(properties).forEach(([key, value]) => {
            if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'className') {
                element.className = value;
            } else if (key === 'id') {
                element.id = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([k, v]) => {
                    element.dataset[k] = v;
                });
            } else if (key === 'style') {
                Object.assign(element.style, value);
            } else if (key === 'attributes') {
                Object.entries(value).forEach(([k, v]) => {
                    element.setAttribute(k, v);
                });
            } else if (key === 'children') {
                value.forEach(child => {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else {
                        element.appendChild(child);
                    }
                });
            }
        });
        
        return element;
    },
    
    /**
     * Actualizar múltiples elementos de una vez
     */
    batchUpdate: function(updates) {
        const fragment = document.createDocumentFragment();
        
        updates.forEach(update => {
            if (update.element && update.updates) {
                Object.entries(update.updates).forEach(([key, value]) => {
                    if (key === 'innerHTML') {
                        update.element.innerHTML = value;
                    } else if (key === 'textContent') {
                        update.element.textContent = value;
                    } else if (key === 'className') {
                        update.element.className = value;
                    } else if (key === 'style') {
                        Object.assign(update.element.style, value);
                    }
                });
            }
        });
    },
    
    /**
     * Medir tiempo de operación DOM
     */
    measureDOMOperation: function(operation, iterations = 1) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            operation();
            const end = performance.now();
            times.push(end - start);
        }
        
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        return {
            average: avgTime,
            min: minTime,
            max: maxTime,
            total: times.reduce((sum, time) => sum + time, 0)
        };
    }
};

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.GestorCP = GestorCP;
window.DOMOptimizer = GestorCP.DOMOptimizer;
window.DOMUtils = GestorCP.DOMUtils;

// Inicializar automáticamente
if (typeof GestorCP.DOMOptimizer.init === 'function') {
    GestorCP.DOMOptimizer.init();
}
