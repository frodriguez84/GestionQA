// ===============================================
// UTILS.JS - Funciones de utilidad centralizadas
// ===============================================

/**
 * Función centralizada para formatear fechas de visualización
 * Convierte de yyyy-mm-dd a dd-mm-aaaa para mostrar
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

/**
 * Función centralizada para formatear fechas para almacenamiento
 * Convierte de dd-mm-aaaa a yyyy-mm-dd para guardar
 */
function formatDateForStorage(dateString) {
    if (!dateString || dateString.trim() === '') return '';
    
    try {
        // Si ya está en formato yyyy-mm-dd, devolverlo tal como está
        if (dateString.includes('-') && dateString.length === 10 && dateString.split('-')[0].length === 4) {
            return dateString;
        }
        
        // Convertir de dd-mm-aaaa a yyyy-mm-dd
        if (dateString.includes('-') && dateString.split('-')[0].length === 2) {
            const [day, month, year] = dateString.split('-');
            return `${year}-${month}-${day}`;
        }
        
        return dateString;
    } catch (e) {
        console.error('Error convirtiendo fecha:', e);
        return dateString;
    }
}

/**
 * Función centralizada para generar IDs únicos
 */
function generateUniqueId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * Función centralizada para validar si un objeto está vacío
 */
function isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

/**
 * Función centralizada para hacer copias profundas de objetos
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

/**
 * Función centralizada para formatear tiempo en horas y minutos
 */
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    } else {
        return `${mins}m`;
    }
}

/**
 * Función centralizada para formatear tiempo en formato extendido
 */
function formatExtendedTime(minutes) {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = Math.floor(minutes % 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
        return `${hours}h ${mins}m`;
    } else {
        return `${mins}m`;
    }
}

/**
 * Función centralizada para debounce
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

/**
 * Función centralizada para throttle
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Escapa caracteres peligrosos para evitar XSS en inserciones HTML
 */
function escapeHtml(text) {
    try {
        if (text === null || text === undefined) return '';
        const str = String(text);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    } catch (_) {
        return '';
    }
}
/**
 * Función centralizada para guardar datos con manejo de errores unificado
 */
function saveData(key, data, useCompression = true) {
    try {
        let dataToSave = data;
        
        // Comprimir si es necesario y está disponible
        if (useCompression && typeof compressData === 'function') {
            dataToSave = compressData(data);
        } else if (typeof JSON.stringify === 'function') {
            dataToSave = JSON.stringify(data);
        }
        
        localStorage.setItem(key, dataToSave);
        return true;
    } catch (error) {
        console.error(`Error guardando ${key}:`, error);
        
        // Manejo de QuotaExceededError
        if (error.name === 'QuotaExceededError') {
            console.log('🚨 QuotaExceededError detectado, aplicando solución de emergencia...');
            
            // Intentar limpieza automática si está disponible
            if (typeof cleanupLocalStorage === 'function') {
                const cleaned = cleanupLocalStorage();
                if (cleaned) {
                    // Reintentar guardado después de limpieza
                    try {
                        localStorage.setItem(key, dataToSave);
                        return true;
                    } catch (retryError) {
                        console.error('Error en reintento después de limpieza:', retryError);
                    }
                }
            }
        }
        
        return false;
    }
}

/**
 * Función centralizada para cargar datos con manejo de errores unificado
 */
function loadData(key, useDecompression = true) {
    try {
        const rawData = localStorage.getItem(key);
        if (!rawData) return null;
        
        // Intentar descomprimir si es necesario y está disponible
        if (useDecompression && typeof decompressData === 'function') {
            return decompressData(rawData);
        } else {
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error(`Error cargando ${key}:`, error);
        return null;
    }
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones globalmente para compatibilidad
window.formatDateForDisplay = formatDateForDisplay;
window.formatDateForStorage = formatDateForStorage;
window.generateUniqueId = generateUniqueId;
window.isEmpty = isEmpty;
window.deepClone = deepClone;
window.formatTime = formatTime;
window.formatExtendedTime = formatExtendedTime;
window.debounce = debounce;
window.throttle = throttle;
window.saveData = saveData;
window.loadData = loadData;
window.escapeHtml = escapeHtml;
