// ===============================================
// DASHBOARD-STORAGE.JS - Sistema de almacenamiento del dashboard
// ===============================================

// ===============================================
// FUNCIONES DE ALMACENAMIENTO
// ===============================================

/**
 * Guarda los datos del dashboard en localStorage
 */
function saveDashboardData() {
    try {
        const data = {
            requirements: requirementsList,
            settings: {
                currentFilter: currentFilter,
                currentSort: currentSort,
                searchQuery: searchQuery
            },
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('dashboardData', JSON.stringify(data));
        console.log('✅ Datos del dashboard guardados');
        return true;
    } catch (error) {
        console.error('❌ Error guardando datos del dashboard:', error);
        return false;
    }
}

/**
 * Carga los datos del dashboard desde localStorage
 */
function loadDashboardData() {
    try {
        const saved = localStorage.getItem('dashboardData');
        if (saved) {
            const data = JSON.parse(saved);
            
            // Cargar requerimientos
            if (data.requirements && Array.isArray(data.requirements)) {
                requirementsList = data.requirements;
            }
            
            // Cargar configuraciones
            if (data.settings) {
                currentFilter = data.settings.currentFilter || 'all';
                currentSort = data.settings.currentSort || 'priority';
                searchQuery = data.settings.searchQuery || '';
            }
            
            console.log('✅ Datos del dashboard cargados');
            return true;
        }
    } catch (error) {
        console.error('❌ Error cargando datos del dashboard:', error);
    }
    
    return false;
}

/**
 * Exporta los datos del dashboard a JSON
 */
function exportDashboardData() {
    try {
        const data = {
            version: '1.0',
            type: 'dashboard-export',
            exportedAt: new Date().toISOString(),
            requirements: requirementsList,
            stats: calculateDashboardStats()
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Dashboard exportado');
        return true;
    } catch (error) {
        console.error('❌ Error exportando dashboard:', error);
        return false;
    }
}

/**
 * Importa datos del dashboard desde JSON
 */
function importDashboardData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validar estructura
                if (!data.requirements || !Array.isArray(data.requirements)) {
                    throw new Error('Formato de archivo inválido');
                }
                
                // Confirmar importación
                const confirmed = confirm(
                    `¿Estás seguro de que deseas importar ${data.requirements.length} requerimientos?\n\nEsto reemplazará todos los datos actuales.`
                );
                
                if (confirmed) {
                    requirementsList = data.requirements;
                    saveDashboardData();
                    updateDashboard();
                    showNotification('Dashboard importado exitosamente', 'success');
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (error) {
                console.error('❌ Error importando dashboard:', error);
                showNotification('Error al importar el archivo', 'error');
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Error leyendo el archivo'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Limpia todos los datos del dashboard
 */
function clearDashboardData() {
    const confirmed = confirm(
        '¿Estás seguro de que deseas eliminar TODOS los datos del dashboard?\n\nEsta acción no se puede deshacer.'
    );
    
    if (confirmed) {
        requirementsList = [];
        currentFilter = 'all';
        currentSort = 'priority';
        searchQuery = '';
        
        localStorage.removeItem('dashboardData');
        updateDashboard();
        
        showNotification('Datos del dashboard eliminados', 'success');
        return true;
    }
    
    return false;
}

// ===============================================
// FUNCIONES DE BACKUP AUTOMÁTICO
// ===============================================

/**
 * Crea un backup automático
 */
function createAutomaticBackup() {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            requirements: requirementsList,
            stats: calculateDashboardStats()
        };
        
        localStorage.setItem('dashboardBackup', JSON.stringify(backup));
        console.log('💾 Backup automático creado');
        return true;
    } catch (error) {
        console.error('❌ Error creando backup automático:', error);
        return false;
    }
}

/**
 * Restaura desde el backup automático
 */
function restoreFromBackup() {
    try {
        const backup = localStorage.getItem('dashboardBackup');
        if (backup) {
            const data = JSON.parse(backup);
            
            const confirmed = confirm(
                `¿Restaurar desde backup del ${new Date(data.timestamp).toLocaleString()}?\n\nEsto reemplazará todos los datos actuales.`
            );
            
            if (confirmed) {
                requirementsList = data.requirements || [];
                saveDashboardData();
                updateDashboard();
                showNotification('Backup restaurado exitosamente', 'success');
                return true;
            }
        } else {
            showNotification('No hay backup disponible', 'error');
        }
    } catch (error) {
        console.error('❌ Error restaurando backup:', error);
        showNotification('Error al restaurar backup', 'error');
    }
    
    return false;
}

// ===============================================
// FUNCIONES DE SINCRONIZACIÓN
// ===============================================

/**
 * Sincroniza con el sistema de casos de prueba
 */
function syncWithTestCaseSystem() {
    try {
        // Obtener datos del sistema de casos
        const multicaseData = localStorage.getItem('multicaseData');
        if (multicaseData) {
            const data = JSON.parse(multicaseData);
            
            // Actualizar estadísticas de requerimientos
            if (data.currentRequirement) {
                const requirement = getRequirement(data.currentRequirement.id);
                if (requirement) {
                    updateRequirementStats(requirement.id);
                }
            }
            
            console.log('✅ Sincronización con sistema de casos completada');
            return true;
        }
    } catch (error) {
        console.error('❌ Error sincronizando con sistema de casos:', error);
    }
    
    return false;
}

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

/**
 * Obtiene el tamaño de los datos almacenados
 */
function getStorageSize() {
    try {
        const data = localStorage.getItem('dashboardData');
        if (data) {
            const sizeInBytes = new Blob([data]).size;
            const sizeInKB = (sizeInBytes / 1024).toFixed(2);
            return `${sizeInKB} KB`;
        }
    } catch (error) {
        console.error('❌ Error calculando tamaño de almacenamiento:', error);
    }
    
    return '0 KB';
}

/**
 * Verifica la integridad de los datos
 */
function verifyDataIntegrity() {
    try {
        const issues = [];
        
        // Verificar requerimientos
        requirementsList.forEach((req, index) => {
            if (!req.id) issues.push(`Requerimiento ${index}: Sin ID`);
            if (!req.name) issues.push(`Requerimiento ${index}: Sin nombre`);
            if (!req.number) issues.push(`Requerimiento ${index}: Sin número`);
            if (req.priority < 1 || req.priority > 6) {
                issues.push(`Requerimiento ${index}: Prioridad inválida (${req.priority})`);
            }
        });
        
        if (issues.length === 0) {
            console.log('✅ Integridad de datos verificada');
            return true;
        } else {
            console.warn('⚠️ Problemas de integridad encontrados:', issues);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando integridad:', error);
        return false;
    }
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

/**
 * Inicializa el sistema de almacenamiento
 */
function initializeDashboardStorage() {
    console.log('💾 Inicializando sistema de almacenamiento...');
    
    // Cargar datos
    loadDashboardData();
    
    // Verificar integridad
    verifyDataIntegrity();
    
    // Crear backup automático cada 5 minutos
    setInterval(createAutomaticBackup, 5 * 60 * 1000);
    
    // Sincronizar con sistema de casos
    syncWithTestCaseSystem();
    
    console.log('✅ Sistema de almacenamiento inicializado');
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.saveDashboardData = saveDashboardData;
window.loadDashboardData = loadDashboardData;
window.exportDashboardData = exportDashboardData;
window.importDashboardData = importDashboardData;
window.clearDashboardData = clearDashboardData;
window.createAutomaticBackup = createAutomaticBackup;
window.restoreFromBackup = restoreFromBackup;
window.syncWithTestCaseSystem = syncWithTestCaseSystem;
window.getStorageSize = getStorageSize;
window.verifyDataIntegrity = verifyDataIntegrity;
window.initializeDashboardStorage = initializeDashboardStorage;
