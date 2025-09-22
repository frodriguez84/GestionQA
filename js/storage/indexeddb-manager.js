// ===============================================
// INDEXEDDB-MANAGER.JS - Gestión de IndexedDB
// VERSIÓN: 20250113d - COMPATIBLE CON SISTEMA ACTUAL
// ===============================================

/**
 * 🔧 INDEXEDDB MANAGER - Sistema de almacenamiento empresarial
 * 
 * Migra automáticamente desde localStorage y proporciona fallback
 * Compatible con el sistema de persistencia existente
 */

// Configuración de la base de datos
const DB_NAME = 'GestorCP_DB';
const DB_VERSION = 2; // ⬆️ Bump para agregar nuevas stores (evidences)
const STORE_NAMES = {
    REQUIREMENTS: 'requirements',     // Requerimientos del dashboard
    CASES: 'cases',                  // Casos de prueba
    SCENARIOS: 'scenarios',          // Escenarios individuales
    SETTINGS: 'settings',            // Configuraciones de la app
    BACKUPS: 'backups',              // Backups automáticos
    METADATA: 'metadata',            // Metadatos del sistema
    EVIDENCES: 'evidences'           // 🆕 Evidencias (binarios/base64)
};

// Variables globales
let db = null;
let isInitialized = false;
let migrationCompleted = false;

// ===============================================
// FUNCIONES PRINCIPALES
// ===============================================

/**
 * 🏗️ Inicializa IndexedDB y migra datos desde localStorage
 */
async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        if (isInitialized && db) {
            console.log('✅ IndexedDB ya inicializado');
            resolve(db);
            return;
        }

        console.log('🏗️ Inicializando IndexedDB...');
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('🔄 Creando/actualizando Object Stores...');

            // Crear Object Stores
            createObjectStores(db);
        };

        request.onblocked = () => {
            console.warn('⚠️ IndexedDB upgrade bloqueado por otra pestaña. Usando fallback sin bloquear UI.');
            try { request.result && request.result.close && request.result.close(); } catch {}
            isInitialized = false;
            migrationCompleted = false;
            resolve(null);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            isInitialized = true;
            migrationCompleted = true; // mantenemos migración apagada para evitar duplicaciones
            console.log('✅ IndexedDB inicializado');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('❌ Error inicializando IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        // Fallback de seguridad para no bloquear carga: 1500ms
        setTimeout(() => {
            if (!isInitialized) {
                console.warn('⏱️ Timeout inicializando IndexedDB, usando fallback');
                try { request.result && request.result.close && request.result.close(); } catch {}
                resolve(null);
            }
        }, 1500);
    });
}

/**
 * 🏗️ Crea los Object Stores necesarios
 */
function createObjectStores(database) {
    const stores = [
        {
            name: STORE_NAMES.REQUIREMENTS,
            keyPath: 'id',
            indexes: [
                { name: 'name', keyPath: 'info.name', unique: false },
                { name: 'number', keyPath: 'info.number', unique: false }
            ]
        },
        {
            name: STORE_NAMES.CASES,
            keyPath: 'id',
            indexes: [
                { name: 'requirementId', keyPath: 'requirementId', unique: false },
                { name: 'caseNumber', keyPath: 'caseNumber', unique: false }
            ]
        },
        {
            name: STORE_NAMES.SCENARIOS,
            keyPath: 'id',
            indexes: [
                { name: 'caseId', keyPath: 'caseId', unique: false },
                { name: 'requirementId', keyPath: 'requirementId', unique: false },
                { name: 'status', keyPath: 'result', unique: false }
            ]
        },
        {
            name: STORE_NAMES.SETTINGS,
            keyPath: 'key'
        },
        {
            name: STORE_NAMES.BACKUPS,
            keyPath: 'timestamp',
            indexes: [
                { name: 'type', keyPath: 'type', unique: false }
            ]
        },
        {
            name: STORE_NAMES.METADATA,
            keyPath: 'key'
        },
        {
            name: STORE_NAMES.EVIDENCES,
            keyPath: 'id',
            indexes: [
                { name: 'mime', keyPath: 'mime', unique: false },
                { name: 'createdAt', keyPath: 'createdAt', unique: false }
            ]
        }
    ];

    stores.forEach(store => {
        if (!database.objectStoreNames.contains(store.name)) {
            const objectStore = database.createObjectStore(store.name, { keyPath: store.keyPath });
            
            // Crear índices
            if (store.indexes) {
                store.indexes.forEach(index => {
                    objectStore.createIndex(index.name, index.keyPath, { unique: index.unique || false });
                });
            }
            
            console.log(`✅ Object Store '${store.name}' creado`);
        }
    });
}

/**
 * 🔄 Migra datos desde localStorage a IndexedDB
 */
async function migrateFromLocalStorage() {
    // 🚨 CRÍTICO: Migración DESHABILITADA
    console.log('⚠️ Migración DESHABILITADA - IndexedDB no disponible');
    return true;
    
        // console.log('🔄 Iniciando migración desde localStorage...');

    try {
        // 1. Migrar requerimientos (dashboard)
        await migrateRequirements();

        // 2. Migrar casos y escenarios (multicaso)
        await migrateCasesAndScenarios();

        // 3. Migrar configuraciones
        await migrateSettings();

        // 4. Crear metadatos de migración
        await createMigrationMetadata();

        console.log('✅ Migración completada exitosamente');
        return true;

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        return false;
    }
}

/**
 * 📊 Migra requerimientos desde dashboard
 */
async function migrateRequirements() {
    try {
        // 🚨 CRÍTICO: Verificar si ya hay requerimientos en IndexedDB para evitar duplicación
        const existingRequirements = await getAllData(STORE_NAMES.REQUIREMENTS);
        if (existingRequirements && existingRequirements.length > 0) {
            console.log('✅ Requerimientos ya existen en IndexedDB, saltando migración');
            return;
        }

        const dashboardData = localStorage.getItem('dashboardData');
        if (!dashboardData) return;

        const data = JSON.parse(dashboardData);
        if (!data.requirements || !Array.isArray(data.requirements)) return;

        console.log(`📊 Migrando ${data.requirements.length} requerimientos...`);

        for (const requirement of data.requirements) {
            await putData(STORE_NAMES.REQUIREMENTS, requirement);
        }

        console.log('✅ Requerimientos migrados');
    } catch (error) {
        console.error('❌ Error migrando requerimientos:', error);
    }
}

/**
 * 📋 Migra casos y escenarios desde multicaso
 */
async function migrateCasesAndScenarios() {
    try {
        // 🚨 CRÍTICO: Verificar si ya hay casos en IndexedDB para evitar duplicación
        const existingCases = await getAllData(STORE_NAMES.CASES);
        if (existingCases && existingCases.length > 0) {
            console.log('✅ Casos ya existen en IndexedDB, saltando migración');
            return;
        }

        // Verificar si hay datos en el sistema unificado
        const unifiedData = localStorage.getItem('gestorcp_unified_data');
        if (unifiedData) {
            await migrateFromUnifiedData(unifiedData);
            return;
        }

        // Verificar datos legacy
        const currentRequirement = localStorage.getItem('currentRequirement');
        if (!currentRequirement) return;

        const requirement = JSON.parse(currentRequirement);
        if (!requirement.cases || !Array.isArray(requirement.cases)) return;

        console.log(`📋 Migrando ${requirement.cases.length} casos...`);

        for (const case_ of requirement.cases) {
            // Guardar caso
            await putData(STORE_NAMES.CASES, case_);

            // Guardar escenarios del caso
            if (case_.scenarios && Array.isArray(case_.scenarios)) {
                for (const scenario of case_.scenarios) {
                    await putData(STORE_NAMES.SCENARIOS, scenario);
                }
            }
        }

        console.log('✅ Casos y escenarios migrados');
    } catch (error) {
        console.error('❌ Error migrando casos y escenarios:', error);
    }
}

/**
 * 🔄 Migra desde datos unificados
 */
async function migrateFromUnifiedData(unifiedDataString) {
    try {
        let unifiedData;
        
        // Intentar descomprimir primero si está disponible
        if (typeof decompressData === 'function') {
            try {
                unifiedData = decompressData(unifiedDataString);
                if (!unifiedData) {
                    // Si la descompresión falla, intentar JSON directo
                    unifiedData = JSON.parse(unifiedDataString);
                }
            } catch (decompressError) {
                console.log('⚠️ Error descomprimiendo, intentando JSON directo...');
                unifiedData = JSON.parse(unifiedDataString);
            }
        } else {
            // Fallback a JSON directo
            unifiedData = JSON.parse(unifiedDataString);
        }
        
        if (unifiedData.currentRequirement && unifiedData.currentRequirement.cases) {
            console.log(`🔄 Migrando desde datos unificados...`);
            
            for (const case_ of unifiedData.currentRequirement.cases) {
                await putData(STORE_NAMES.CASES, case_);
                
                if (case_.scenarios && Array.isArray(case_.scenarios)) {
                    for (const scenario of case_.scenarios) {
                        await putData(STORE_NAMES.SCENARIOS, scenario);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error migrando desde datos unificados:', error);
    }
}

/**
 * ⚙️ Migra configuraciones
 */
async function migrateSettings() {
    try {
        const settings = [
            'theme',
            'showHidden',
            'autoSave',
            'totalSaves',
            'activeRequirementId'
        ];

        for (const key of settings) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                await putData(STORE_NAMES.SETTINGS, { key, value });
            }
        }

        console.log('✅ Configuraciones migradas');
    } catch (error) {
        console.error('❌ Error migrando configuraciones:', error);
    }
}

/**
 * 📝 Crea metadatos de migración
 */
async function createMigrationMetadata() {
    try {
        const metadata = {
            key: 'migration_info',
            migratedAt: new Date().toISOString(),
            version: '20250113d',
            source: 'localStorage',
            recordsMigrated: {
                requirements: await countData(STORE_NAMES.REQUIREMENTS),
                cases: await countData(STORE_NAMES.CASES),
                scenarios: await countData(STORE_NAMES.SCENARIOS),
                settings: await countData(STORE_NAMES.SETTINGS)
            }
        };

        await putData(STORE_NAMES.METADATA, metadata);
        console.log('✅ Metadatos de migración creados');
    } catch (error) {
        console.error('❌ Error creando metadatos:', error);
    }
}

// ===============================================
// FUNCIONES DE OPERACIONES CRUD
// ===============================================

/**
 * 💾 Guarda datos en IndexedDB
 */
async function putData(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB no inicializado'));
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * 📖 Obtiene datos de IndexedDB
 */
async function getData(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB no inicializado'));
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * 📋 Obtiene todos los datos de un Object Store
 */
async function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB no inicializado'));
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * 🗑️ Elimina datos de IndexedDB
 */
async function deleteData(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB no inicializado'));
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * 📊 Cuenta registros en un Object Store
 */
async function countData(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB no inicializado'));
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * 📊 Obtiene estadísticas de uso
 */
async function getStorageStats() {
    if (!isInitialized) {
        console.warn('⚠️ IndexedDB no inicializado');
        return null;
    }

    try {
        const stats = {};
        for (const storeName of Object.values(STORE_NAMES)) {
            stats[storeName] = await countData(storeName);
        }
        
        console.log('📊 Estadísticas de IndexedDB:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return null;
    }
}

// ===============================================
// INTEGRACIÓN CON SISTEMA EXISTENTE
// ===============================================

/**
 * 🔄 Integra con el sistema de persistencia existente
 */
function integrateWithExistingSystem() {
    // Interceptar funciones de guardado existentes - SOLO IndexedDB para evitar duplicación
    if (typeof window.saveData === 'function') {
        const originalSaveData = window.saveData;
        window.saveData = async function(key, data) {
            try {
                // Mantener comportamiento actual para evitar duplicación con localStorage
                return originalSaveData(key, data);
                
                // SOLO guardar en IndexedDB para evitar duplicación en localStorage
                /* if (isInitialized) {
                    await saveToIndexedDB(key, data);
                    console.log(`✅ ${key} guardado en IndexedDB (sin duplicación en localStorage)`);
                    return true; // Indicar éxito sin duplicar en localStorage
                }
                
                // Fallback solo si IndexedDB no está disponible
                return originalSaveData(key, data); */
            } catch (error) {
                console.error('❌ Error en saveData integrado:', error);
                return originalSaveData(key, data);
            }
        };
    }

    // Interceptar funciones de carga existentes
    if (typeof window.loadData === 'function') {
        const originalLoadData = window.loadData;
        window.loadData = async function(key) {
            try {
                // Intentar cargar desde IndexedDB primero
                if (isInitialized) {
                    const data = await loadFromIndexedDB(key);
                    if (data !== null) {
                        return data;
                    }
                }
                
                // Fallback a localStorage
                return originalLoadData(key);
            } catch (error) {
                console.error('❌ Error en loadData integrado:', error);
                return originalLoadData(key);
            }
        };
    }
}

/**
 * 💾 Guarda datos específicos en IndexedDB
 */
async function saveToIndexedDB(key, data) {
    try {
        // Mapear claves a Object Stores con estructura correcta
        const storeMapping = {
            'testCases': STORE_NAMES.SCENARIOS,
            'currentRequirement': STORE_NAMES.CASES,
            'dashboardData': STORE_NAMES.REQUIREMENTS,
            'gestorcp_unified_data': STORE_NAMES.METADATA
        };

        const storeName = storeMapping[key];
        if (storeName) {
            // Crear estructura correcta según el Object Store
            let dataToSave;
            
            switch (storeName) {
                case STORE_NAMES.SCENARIOS:
                    // Para escenarios, guardar cada uno individualmente
                    if (Array.isArray(data)) {
                        for (const scenario of data) {
                            if (scenario && scenario.id) {
                                await putData(storeName, scenario);
                            }
                        }
                    }
                    break;
                    
                case STORE_NAMES.CASES:
                    // Para casos, guardar el caso actual
                    if (data && data.id) {
                        await putData(storeName, data);
                    }
                    break;
                    
                case STORE_NAMES.REQUIREMENTS:
                    // Para requerimientos, guardar la lista
                    if (data && data.requirements && Array.isArray(data.requirements)) {
                        for (const requirement of data.requirements) {
                            if (requirement && requirement.id) {
                                await putData(storeName, requirement);
                            }
                        }
                    }
                    break;
                    
                case STORE_NAMES.METADATA:
                    // Para metadatos, usar estructura simple
                    dataToSave = {
                        key: key,
                        data: data,
                        timestamp: new Date().toISOString()
                    };
                    await putData(storeName, dataToSave);
                    break;
                    
                default:
                    // Para otros casos, usar estructura genérica
                    dataToSave = {
                        key: key,
                        data: data,
                        timestamp: new Date().toISOString()
                    };
                    await putData(storeName, dataToSave);
            }
        }
    } catch (error) {
        console.error('❌ Error guardando en IndexedDB:', error);
    }
}

/**
 * 📖 Carga datos específicos desde IndexedDB
 */
async function loadFromIndexedDB(key) {
    try {
        const storeMapping = {
            'testCases': STORE_NAMES.SCENARIOS,
            'currentRequirement': STORE_NAMES.CASES,
            'dashboardData': STORE_NAMES.REQUIREMENTS,
            'gestorcp_unified_data': STORE_NAMES.METADATA
        };

        const storeName = storeMapping[key];
        if (storeName) {
            const result = await getData(storeName, key);
            return result ? result.data : null;
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error cargando desde IndexedDB:', error);
        return null;
    }
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones globalmente
window.IndexedDBManager = {
    init: initIndexedDB,
    putData,
    getData,
    getAllData,
    deleteData,
    countData,
    getStorageStats,
    isInitialized: () => isInitialized,
    migrationCompleted: () => migrationCompleted,
    STORE_NAMES,
    // Funciones de conveniencia - LOCALSTORAGE PURO
    saveToIndexedDB: async (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`✅ ${key} guardado en localStorage`);
            return true;
        } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
            return false;
        }
    },
    loadFromIndexedDB: async (key) => {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                console.log(`✅ ${key} cargado desde localStorage`);
                return parsed;
            }
            return null;
        } catch (error) {
            console.error('❌ Error cargando desde localStorage:', error);
            return null;
        }
    }
};

// DESHABILITADO: IndexedDB causaba problemas de sincronización
// Usando localStorage puro para máxima estabilidad
// console.log('✅ IndexedDB deshabilitado - usando localStorage puro');
integrateWithExistingSystem();

// console.log('🔧 IndexedDB Manager cargado - Versión 20250113d');
