// ===============================================
// SEARCH-OPTIMIZER.JS - Sistema de búsqueda y filtrado optimizado
// ===============================================

window.GestorCP = window.GestorCP || {};

/**
 * Sistema de búsqueda y filtrado optimizado con índices y caché
 */
GestorCP.SearchOptimizer = {
    // Índices para búsquedas rápidas
    indices: {
        scenarios: new Map(),
        cases: new Map(),
        requirements: new Map()
    },
    
    // Caché de resultados de búsqueda
    searchCache: new Map(),
    
    // Configuración
    config: {
        maxCacheSize: 100,
        cacheExpiry: 300000, // 5 minutos
        debounceDelay: 300,
        minSearchLength: 2,
        maxResults: 1000
    },
    
    /**
     * Construir índices para búsquedas rápidas
     */
    buildIndices: function(data) {
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('🔍 Construyendo índices de búsqueda...');
        }
        
        // Limpiar índices existentes
        this.indices.scenarios.clear();
        this.indices.cases.clear();
        this.indices.requirements.clear();
        
        // Indexar escenarios
        if (data.scenarios) {
            data.scenarios.forEach((scenario, index) => {
                this.indexScenario(scenario, index);
            });
        }
        
        // Indexar casos
        if (data.cases) {
            data.cases.forEach((caseItem, index) => {
                this.indexCase(caseItem, index);
            });
        }
        
        // Indexar requerimientos
        if (data.requirements) {
            data.requirements.forEach((req, index) => {
                this.indexRequirement(req, index);
            });
        }
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('✅ Índices construidos:', {
                scenarios: this.indices.scenarios.size,
                cases: this.indices.cases.size,
                requirements: this.indices.requirements.size
            });
        }
    },
    
    /**
     * Indexar un escenario
     */
    indexScenario: function(scenario, index) {
        const searchableText = [
            scenario.description || '',
            scenario.obtainedResult || '',
            scenario.tester || '',
            scenario.status || '',
            scenario.scenarioNumber?.toString() || '',
            scenario.cycleNumber?.toString() || ''
        ].join(' ').toLowerCase();
        
        // Crear índice por palabras
        const words = searchableText.split(/\s+/).filter(word => word.length > 1);
        words.forEach(word => {
            if (!this.indices.scenarios.has(word)) {
                this.indices.scenarios.set(word, []);
            }
            this.indices.scenarios.get(word).push({
                index,
                scenario,
                relevance: this.calculateRelevance(word, searchableText)
            });
        });
        
        // Índice por ID para búsquedas exactas
        this.indices.scenarios.set(scenario.id, [{
            index,
            scenario,
            relevance: 1.0
        }]);
    },
    
    /**
     * Indexar un caso
     */
    indexCase: function(caseItem, index) {
        const searchableText = [
            caseItem.title || '',
            caseItem.objective || '',
            caseItem.caseNumber?.toString() || ''
        ].join(' ').toLowerCase();
        
        const words = searchableText.split(/\s+/).filter(word => word.length > 1);
        words.forEach(word => {
            if (!this.indices.cases.has(word)) {
                this.indices.cases.set(word, []);
            }
            this.indices.cases.get(word).push({
                index,
                case: caseItem,
                relevance: this.calculateRelevance(word, searchableText)
            });
        });
    },
    
    /**
     * Indexar un requerimiento
     */
    indexRequirement: function(req, index) {
        const searchableText = [
            req.info?.name || '',
            req.info?.description || '',
            req.id || ''
        ].join(' ').toLowerCase();
        
        const words = searchableText.split(/\s+/).filter(word => word.length > 1);
        words.forEach(word => {
            if (!this.indices.requirements.has(word)) {
                this.indices.requirements.set(word, []);
            }
            this.indices.requirements.get(word).push({
                index,
                requirement: req,
                relevance: this.calculateRelevance(word, searchableText)
            });
        });
    },
    
    /**
     * Calcular relevancia de una palabra en el texto
     */
    calculateRelevance: function(word, text) {
        const wordCount = (text.match(new RegExp(word, 'g')) || []).length;
        const textLength = text.length;
        const wordLength = word.length;
        
        // Fórmula de relevancia: más apariciones y palabras más largas = mayor relevancia
        return (wordCount * wordLength) / textLength;
    },
    
    /**
     * Buscar escenarios con filtros optimizados
     */
    searchScenarios: function(query, filters = {}) {
        const cacheKey = `scenarios:${query}:${JSON.stringify(filters)}`;
        
        // Verificar caché
        if (this.searchCache.has(cacheKey)) {
            const cached = this.searchCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
                if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
                    console.log('🎯 Resultado de caché para búsqueda:', query);
                }
                return cached.results;
            }
        }
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('🔍 Buscando escenarios:', query);
        }
        
        let results = [];
        
        if (query && query.length >= this.config.minSearchLength) {
            // Búsqueda por palabras clave
            const words = query.toLowerCase().split(/\s+/);
            const wordResults = new Map();
            
            words.forEach(word => {
                if (this.indices.scenarios.has(word)) {
                    this.indices.scenarios.get(word).forEach(item => {
                        const key = item.scenario.id;
                        if (!wordResults.has(key)) {
                            wordResults.set(key, {
                                scenario: item.scenario,
                                relevance: 0
                            });
                        }
                        wordResults.get(key).relevance += item.relevance;
                    });
                }
            });
            
            results = Array.from(wordResults.values())
                .sort((a, b) => b.relevance - a.relevance)
                .map(item => item.scenario);
        } else {
            // Sin búsqueda de texto, devolver todos los escenarios
            results = Array.from(this.indices.scenarios.values())
                .flat()
                .map(item => item.scenario)
                .filter((scenario, index, self) => 
                    self.findIndex(s => s.id === scenario.id) === index
                );
        }
        
        // Aplicar filtros
        results = this.applyFilters(results, filters);
        
        // Limitar resultados
        if (results.length > this.config.maxResults) {
            results = results.slice(0, this.config.maxResults);
        }
        
        // Guardar en caché
        this.cacheResult(cacheKey, results);
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('✅ Búsqueda completada:', {
                query,
                resultsCount: results.length,
                filters
            });
        }
        
        return results;
    },
    
    /**
     * Aplicar filtros a los resultados
     */
    applyFilters: function(results, filters) {
        return results.filter(scenario => {
            // Filtro por estado
            if (filters.status && scenario.status !== filters.status) {
                return false;
            }
            
            // Filtro por tester
            if (filters.tester && scenario.tester !== filters.tester) {
                return false;
            }
            
            // Filtro por rango de fechas
            if (filters.startDate && scenario.executionDate) {
                const scenarioDate = new Date(scenario.executionDate);
                const startDate = new Date(filters.startDate);
                if (scenarioDate < startDate) return false;
            }
            
            if (filters.endDate && scenario.executionDate) {
                const scenarioDate = new Date(scenario.executionDate);
                const endDate = new Date(filters.endDate);
                if (scenarioDate > endDate) return false;
            }
            
            // Filtro por tiempo de ejecución
            if (filters.minTime && scenario.testTime) {
                if (scenario.testTime < filters.minTime) return false;
            }
            
            if (filters.maxTime && scenario.testTime) {
                if (scenario.testTime > filters.maxTime) return false;
            }
            
            // Filtro por timer activo
            if (filters.hasActiveTimer !== undefined) {
                const hasTimer = scenario.testingTimer?.state === 'RUNNING' || 
                               scenario.bugfixingTimer?.state === 'RUNNING';
                if (hasTimer !== filters.hasActiveTimer) return false;
            }
            
            return true;
        });
    },
    
    /**
     * Buscar casos
     */
    searchCases: function(query, filters = {}) {
        const cacheKey = `cases:${query}:${JSON.stringify(filters)}`;
        
        if (this.searchCache.has(cacheKey)) {
            const cached = this.searchCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
                return cached.results;
            }
        }
        
        let results = [];
        
        if (query && query.length >= this.config.minSearchLength) {
            const words = query.toLowerCase().split(/\s+/);
            const wordResults = new Map();
            
            words.forEach(word => {
                if (this.indices.cases.has(word)) {
                    this.indices.cases.get(word).forEach(item => {
                        const key = item.case.id;
                        if (!wordResults.has(key)) {
                            wordResults.set(key, {
                                case: item.case,
                                relevance: 0
                            });
                        }
                        wordResults.get(key).relevance += item.relevance;
                    });
                }
            });
            
            results = Array.from(wordResults.values())
                .sort((a, b) => b.relevance - a.relevance)
                .map(item => item.case);
        } else {
            results = Array.from(this.indices.cases.values())
                .flat()
                .map(item => item.case)
                .filter((caseItem, index, self) => 
                    self.findIndex(c => c.id === caseItem.id) === index
                );
        }
        
        this.cacheResult(cacheKey, results);
        return results;
    },
    
    /**
     * Buscar requerimientos
     */
    searchRequirements: function(query, filters = {}) {
        const cacheKey = `requirements:${query}:${JSON.stringify(filters)}`;
        
        if (this.searchCache.has(cacheKey)) {
            const cached = this.searchCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
                return cached.results;
            }
        }
        
        let results = [];
        
        if (query && query.length >= this.config.minSearchLength) {
            const words = query.toLowerCase().split(/\s+/);
            const wordResults = new Map();
            
            words.forEach(word => {
                if (this.indices.requirements.has(word)) {
                    this.indices.requirements.get(word).forEach(item => {
                        const key = item.requirement.id;
                        if (!wordResults.has(key)) {
                            wordResults.set(key, {
                                requirement: item.requirement,
                                relevance: 0
                            });
                        }
                        wordResults.get(key).relevance += item.relevance;
                    });
                }
            });
            
            results = Array.from(wordResults.values())
                .sort((a, b) => b.relevance - a.relevance)
                .map(item => item.requirement);
        } else {
            results = Array.from(this.indices.requirements.values())
                .flat()
                .map(item => item.requirement)
                .filter((req, index, self) => 
                    self.findIndex(r => r.id === req.id) === index
                );
        }
        
        this.cacheResult(cacheKey, results);
        return results;
    },
    
    /**
     * Guardar resultado en caché
     */
    cacheResult: function(key, results) {
        // Limpiar caché si está lleno
        if (this.searchCache.size >= this.config.maxCacheSize) {
            const oldestKey = this.searchCache.keys().next().value;
            this.searchCache.delete(oldestKey);
        }
        
        this.searchCache.set(key, {
            results,
            timestamp: Date.now()
        });
    },
    
    /**
     * Limpiar caché
     */
    clearCache: function() {
        this.searchCache.clear();
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('🧹 Caché de búsqueda limpiado');
        }
    },
    
    /**
     * Obtener estadísticas de búsqueda
     */
    getStats: function() {
        return {
            indices: {
                scenarios: this.indices.scenarios.size,
                cases: this.indices.cases.size,
                requirements: this.indices.requirements.size
            },
            cache: {
                size: this.searchCache.size,
                maxSize: this.config.maxCacheSize
            }
        };
    }
};

/**
 * Utilidades de búsqueda avanzada
 */
GestorCP.SearchUtils = {
    /**
     * Búsqueda difusa (fuzzy search)
     */
    fuzzySearch: function(query, items, threshold = 0.6) {
        const results = [];
        
        items.forEach(item => {
            const score = this.calculateSimilarity(query, item.searchableText || '');
            if (score >= threshold) {
                results.push({ item, score });
            }
        });
        
        return results.sort((a, b) => b.score - a.score).map(r => r.item);
    },
    
    /**
     * Calcular similitud entre dos strings
     */
    calculateSimilarity: function(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    },
    
    /**
     * Distancia de Levenshtein
     */
    levenshteinDistance: function(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    },
    
    /**
     * Búsqueda por expresiones regulares
     */
    regexSearch: function(pattern, items) {
        try {
            const regex = new RegExp(pattern, 'i');
            return items.filter(item => 
                regex.test(item.searchableText || '')
            );
        } catch (error) {
            console.error('❌ Error en búsqueda regex:', error);
            return [];
        }
    }
};

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.GestorCP = GestorCP;
window.SearchOptimizer = GestorCP.SearchOptimizer;
window.SearchUtils = GestorCP.SearchUtils;
