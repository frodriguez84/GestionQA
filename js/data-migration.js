// ===============================================
// DATA-MIGRATION.JS - Migración de datos existentes
// ===============================================

/**
 * Migra datos existentes de la app al dashboard
 */
function migrateExistingDataToDashboard() {
    console.log('🔄 Iniciando migración de datos existentes...');
    
    try {
        // Verificar si ya hay datos del dashboard
        const dashboardData = localStorage.getItem('dashboardData');
        if (dashboardData) {
            const data = JSON.parse(dashboardData);
            if (data.requirements && data.requirements.length > 0) {
                console.log('ℹ️ Ya existen datos del dashboard, omitiendo migración');
                return true;
            }
        }
        
        // Obtener datos de la app multicaso
        const appData = localStorage.getItem('multicaseData');
        if (!appData) {
            console.log('ℹ️ No hay datos de la app para migrar');
            return false;
        }
        
        const multicaseData = JSON.parse(appData);
        if (!multicaseData.currentRequirement) {
            console.log('ℹ️ No hay requerimiento activo para migrar');
            return false;
        }
        
        const requirement = multicaseData.currentRequirement;
        
        // Crear estructura para el dashboard
        const dashboardRequirement = {
            id: requirement.id || generateId(),
            number: requirement.info.number || 'REQ-001',
            name: requirement.info.name || 'Requerimiento Migrado',
            description: requirement.info.description || '',
            priority: 1, // Prioridad por defecto
            tester: requirement.info.tester || '',
            startDate: requirement.info.startDate || new Date().toISOString().split('T')[0],
            status: 'active',
            createdAt: requirement.createdAt || new Date().toISOString(),
            updatedAt: requirement.updatedAt || new Date().toISOString(),
            cases: requirement.cases || [],
            stats: calculateRealStats(requirement)
        };
        
        // Crear datos del dashboard
        const newDashboardData = {
            requirements: [dashboardRequirement],
            settings: {
                currentFilter: 'all',
                currentSort: 'priority',
                searchQuery: ''
            },
            lastSaved: new Date().toISOString()
        };
        
        // Guardar datos
        localStorage.setItem('dashboardData', JSON.stringify(newDashboardData));
        
        console.log('✅ Datos migrados al dashboard exitosamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error migrando datos:', error);
        return false;
    }
}

/**
 * Verifica si necesita migración
 */
function needsMigration() {
    try {
        const dashboardData = localStorage.getItem('dashboardData');
        if (!dashboardData) return true;
        
        const data = JSON.parse(dashboardData);
        return !data.requirements || data.requirements.length === 0;
    } catch (error) {
        return true;
    }
}

/**
 * Ejecuta migración si es necesaria
 */
function runMigrationIfNeeded() {
    if (needsMigration()) {
        console.log('🔄 Ejecutando migración automática...');
        return migrateExistingDataToDashboard();
    }
    return true;
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.migrateExistingDataToDashboard = migrateExistingDataToDashboard;
window.needsMigration = needsMigration;
window.runMigrationIfNeeded = runMigrationIfNeeded;
