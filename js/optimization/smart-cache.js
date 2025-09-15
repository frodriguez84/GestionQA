// ===============================================
// SMART-CACHE.JS - Sistema de caché inteligente para datos frecuentes
// ===============================================

window.GestorCP = window.GestorCP || {};

/**
 * Sistema de caché inteligente con invalidación automática y predicción de acceso
 */
GestorCP.SmartCache = {
    // Caché principal
    cache: new Map(),
    
    // Metadatos de caché
    metadata: new Map(),
    
    // Configuración
    config: {
        maxSize: 50, // Máximo número de entradas
        defaultTTL: 300000, // 5 minutos por defecto
        cleanupInterval: 60000, // Limpiar cada minuto
        accessThreshold: 3, // Mínimo de accesos para considerar "frecuente"
        predictionWindow: 30000 // Ventana de predicción en ms
    },
    
    // Estadísticas
    stats: {
        hits: 0,
        misses: 0,
        evictions: 0,
        predictions: 0
    },
    
    /**
     * Inicializar el sistema de caché
     */
    init: function() {
        // Limpiar caché expirado periódicamente
        setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('🧠 Sistema de caché inteligente inicializado');
        }
    },
    
    /**
     * Obtener valor del caché
     */
    get: function(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        
        const meta = this.metadata.get(key);
        
        // Verificar si ha expirado
        if (meta && Date.now() > meta.expiresAt) {
            this.delete(key);
            this.stats.misses++;
            return null;
        }
        
        // Actualizar metadatos de acceso
        if (meta) {
            meta.accessCount++;
            meta.lastAccessed = Date.now();
            meta.accessPattern.push(Date.now());
            
            // Mantener solo los últimos 10 accesos
            if (meta.accessPattern.length > 10) {
                meta.accessPattern.shift();
            }
        }
        
        this.stats.hits++;
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`🎯 Cache hit: ${key}`, {
                accessCount: meta?.accessCount || 0,
                age: meta ? Date.now() - meta.createdAt : 0
            });
        }
        
        return entry;
    },
    
    /**
     * Guardar valor en caché
     */
    set: function(key, value, ttl = null) {
        const now = Date.now();
        const expiresAt = now + (ttl || this.config.defaultTTL);
        
        // Si el caché está lleno, evictar entrada menos útil
        if (this.cache.size >= this.config.maxSize) {
            this.evictLeastUseful();
        }
        
        // Guardar valor
        this.cache.set(key, value);
        
        // Guardar metadatos
        this.metadata.set(key, {
            createdAt: now,
            lastAccessed: now,
            expiresAt: expiresAt,
            accessCount: 0,
            accessPattern: [now],
            ttl: ttl || this.config.defaultTTL
        });
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`💾 Cache set: ${key}`, {
                ttl: ttl || this.config.defaultTTL,
                expiresAt: new Date(expiresAt).toLocaleTimeString()
            });
        }
    },
    
    /**
     * Eliminar entrada del caché
     */
    delete: function(key) {
        this.cache.delete(key);
        this.metadata.delete(key);
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`🗑️ Cache delete: ${key}`);
        }
    },
    
    /**
     * Evictar entrada menos útil
     */
    evictLeastUseful: function() {
        let leastUsefulKey = null;
        let leastUsefulScore = Infinity;
        
        this.metadata.forEach((meta, key) => {
            const score = this.calculateUsefulnessScore(meta);
            if (score < leastUsefulScore) {
                leastUsefulScore = score;
                leastUsefulKey = key;
            }
        });
        
        if (leastUsefulKey) {
            this.delete(leastUsefulKey);
            this.stats.evictions++;
            
            if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
                console.log(`🚮 Evicted least useful: ${leastUsefulKey}`, {
                    score: leastUsefulScore
                });
            }
        }
    },
    
    /**
     * Calcular puntuación de utilidad
     */
    calculateUsefulnessScore: function(meta) {
        const now = Date.now();
        const age = now - meta.createdAt;
        const timeSinceLastAccess = now - meta.lastAccessed;
        
        // Factores de utilidad:
        // 1. Frecuencia de acceso (más accesos = más útil)
        // 2. Tiempo desde último acceso (más reciente = más útil)
        // 3. Edad del elemento (más nuevo = más útil)
        // 4. Patrón de acceso (acceso regular = más útil)
        
        const frequencyScore = meta.accessCount * 10;
        const recencyScore = Math.max(0, 100 - (timeSinceLastAccess / 1000));
        const ageScore = Math.max(0, 100 - (age / 1000));
        const patternScore = this.analyzeAccessPattern(meta.accessPattern) * 50;
        
        // Puntuación final (menor = menos útil)
        return -(frequencyScore + recencyScore + ageScore + patternScore);
    },
    
    /**
     * Analizar patrón de acceso
     */
    analyzeAccessPattern: function(accessPattern) {
        if (accessPattern.length < 2) return 0;
        
        // Calcular regularidad del patrón de acceso
        const intervals = [];
        for (let i = 1; i < accessPattern.length; i++) {
            intervals.push(accessPattern[i] - accessPattern[i - 1]);
        }
        
        // Calcular varianza de los intervalos
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        
        // Menor varianza = patrón más regular = más útil
        return Math.max(0, 1 - (variance / (avgInterval * avgInterval)));
    },
    
    /**
     * Predecir y precargar datos
     */
    predictAndPreload: function(currentKey) {
        const predictions = this.generatePredictions(currentKey);
        
        predictions.forEach(prediction => {
            if (!this.cache.has(prediction.key)) {
                this.stats.predictions++;
                
                // Simular precarga (en implementación real, cargaría datos)
                if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
                    console.log(`🔮 Predicción: ${prediction.key}`, {
                        confidence: prediction.confidence,
                        reason: prediction.reason
                    });
                }
            }
        });
    },
    
    /**
     * Generar predicciones basadas en patrones de acceso
     */
    generatePredictions: function(currentKey) {
        const predictions = [];
        const currentMeta = this.metadata.get(currentKey);
        
        if (!currentMeta) return predictions;
        
        // Analizar patrones de acceso similares
        this.metadata.forEach((meta, key) => {
            if (key !== currentKey && this.areAccessPatternsSimilar(currentMeta.accessPattern, meta.accessPattern)) {
                predictions.push({
                    key: key,
                    confidence: this.calculatePatternSimilarity(currentMeta.accessPattern, meta.accessPattern),
                    reason: 'Patrón de acceso similar'
                });
            }
        });
        
        // Ordenar por confianza
        return predictions.sort((a, b) => b.confidence - a.confidence);
    },
    
    /**
     * Verificar si dos patrones de acceso son similares
     */
    areAccessPatternsSimilar: function(pattern1, pattern2) {
        if (pattern1.length < 2 || pattern2.length < 2) return false;
        
        // Calcular intervalos promedio
        const avg1 = this.calculateAverageInterval(pattern1);
        const avg2 = this.calculateAverageInterval(pattern2);
        
        // Si los intervalos promedio son similares (dentro del 20%)
        return Math.abs(avg1 - avg2) / Math.max(avg1, avg2) < 0.2;
    },
    
    /**
     * Calcular intervalo promedio
     */
    calculateAverageInterval: function(pattern) {
        if (pattern.length < 2) return 0;
        
        let totalInterval = 0;
        for (let i = 1; i < pattern.length; i++) {
            totalInterval += pattern[i] - pattern[i - 1];
        }
        
        return totalInterval / (pattern.length - 1);
    },
    
    /**
     * Calcular similitud entre patrones
     */
    calculatePatternSimilarity: function(pattern1, pattern2) {
        const avg1 = this.calculateAverageInterval(pattern1);
        const avg2 = this.calculateAverageInterval(pattern2);
        
        const maxAvg = Math.max(avg1, avg2);
        const minAvg = Math.min(avg1, avg2);
        
        return minAvg / maxAvg;
    },
    
    /**
     * Limpiar caché expirado
     */
    cleanup: function() {
        const now = Date.now();
        let cleanedCount = 0;
        
        this.metadata.forEach((meta, key) => {
            if (now > meta.expiresAt) {
                this.delete(key);
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0 && GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log(`🧹 Cache cleanup: ${cleanedCount} entradas expiradas eliminadas`);
        }
    },
    
    /**
     * Limpiar todo el caché
     */
    clear: function() {
        this.cache.clear();
        this.metadata.clear();
        
        if (GestorCP.Config?.get('UI', 'showDebugLogs')) {
            console.log('🧹 Cache completamente limpiado');
        }
    },
    
    /**
     * Obtener estadísticas del caché
     */
    getStats: function() {
        const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
        
        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitRate: hitRate.toFixed(2) + '%',
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            predictions: this.stats.predictions
        };
    },
    
    /**
     * Obtener entradas más accedidas
     */
    getMostAccessed: function(limit = 10) {
        const entries = Array.from(this.metadata.entries())
            .map(([key, meta]) => ({
                key,
                accessCount: meta.accessCount,
                lastAccessed: meta.lastAccessed,
                usefulness: this.calculateUsefulnessScore(meta)
            }))
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);
        
        return entries;
    }
};

/**
 * Caché especializado para diferentes tipos de datos
 */
GestorCP.SpecializedCache = {
    /**
     * Caché para estadísticas calculadas
     */
    stats: {
        cache: new Map(),
        
        get: function(key) {
            return GestorCP.SmartCache.get(`stats:${key}`);
        },
        
        set: function(key, value, ttl = 60000) { // 1 minuto por defecto
            GestorCP.SmartCache.set(`stats:${key}`, value, ttl);
        },
        
        invalidate: function(pattern) {
            GestorCP.SmartCache.cache.forEach((value, key) => {
                if (key.startsWith('stats:') && key.includes(pattern)) {
                    GestorCP.SmartCache.delete(key);
                }
            });
        }
    },
    
    /**
     * Caché para resultados de búsqueda
     */
    search: {
        cache: new Map(),
        
        get: function(query, filters) {
            const key = `search:${query}:${JSON.stringify(filters)}`;
            return GestorCP.SmartCache.get(key);
        },
        
        set: function(query, filters, results, ttl = 300000) { // 5 minutos
            const key = `search:${query}:${JSON.stringify(filters)}`;
            GestorCP.SmartCache.set(key, results, ttl);
        },
        
        invalidate: function() {
            GestorCP.SmartCache.cache.forEach((value, key) => {
                if (key.startsWith('search:')) {
                    GestorCP.SmartCache.delete(key);
                }
            });
        }
    },
    
    /**
     * Caché para datos de UI
     */
    ui: {
        cache: new Map(),
        
        get: function(key) {
            return GestorCP.SmartCache.get(`ui:${key}`);
        },
        
        set: function(key, value, ttl = 180000) { // 3 minutos
            GestorCP.SmartCache.set(`ui:${key}`, value, ttl);
        },
        
        invalidate: function(pattern) {
            GestorCP.SmartCache.cache.forEach((value, key) => {
                if (key.startsWith('ui:') && key.includes(pattern)) {
                    GestorCP.SmartCache.delete(key);
                }
            });
        }
    }
};

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.GestorCP = GestorCP;
window.SmartCache = GestorCP.SmartCache;
window.SpecializedCache = GestorCP.SpecializedCache;

// Inicializar automáticamente
if (typeof GestorCP.SmartCache.init === 'function') {
    GestorCP.SmartCache.init();
}
