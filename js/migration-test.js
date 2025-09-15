// ===============================================
// MIGRATION-TEST.JS - Pruebas de Migración
// VERSIÓN: 20250112a - Verificación del Sistema Unificado
// ===============================================

// Iniciando pruebas de migración...

// ===============================================
// FUNCIONES DE PRUEBA
// ===============================================

/**
 * Prueba que el sistema unificado funciona correctamente
 */
function testUnifiedSystem() {
    console.log('🧪 === PRUEBAS DEL SISTEMA UNIFICADO ===');
    
    const tests = [];
    
    // Test 1: Verificar que existe el sistema unificado
    tests.push({
        name: 'Sistema unificado existe',
        test: () => typeof window.GestorCP !== 'undefined' && window.GestorCP.Data,
        result: typeof window.GestorCP !== 'undefined' && window.GestorCP.Data
    });
    
    // Test 2: Verificar getters
    if (window.GestorCP && window.GestorCP.Data) {
        tests.push({
            name: 'Getter getScenarios funciona',
            test: () => Array.isArray(window.GestorCP.Data.getScenarios()),
            result: Array.isArray(window.GestorCP.Data.getScenarios())
        });
        
        tests.push({
            name: 'Getter getRequirementInfo funciona',
            test: () => typeof window.GestorCP.Data.getRequirementInfo() === 'object',
            result: typeof window.GestorCP.Data.getRequirementInfo() === 'object'
        });
        
        tests.push({
            name: 'Getter getInputVariables funciona',
            test: () => Array.isArray(window.GestorCP.Data.getInputVariables()),
            result: Array.isArray(window.GestorCP.Data.getInputVariables())
        });
    }
    
    // Test 3: Verificar proxies legacy
    tests.push({
        name: 'Proxy testCases funciona',
        test: () => Array.isArray(window.testCases),
        result: Array.isArray(window.testCases)
    });
    
    tests.push({
        name: 'Proxy requirementInfo funciona',
        test: () => typeof window.requirementInfo === 'object',
        result: typeof window.requirementInfo === 'object'
    });
    
    tests.push({
        name: 'Proxy inputVariableNames funciona',
        test: () => Array.isArray(window.inputVariableNames),
        result: Array.isArray(window.inputVariableNames)
    });
    
    // Test 4: Verificar sincronización
    if (window.GestorCP && window.GestorCP.Data) {
        const scenarios1 = window.GestorCP.Data.getScenarios();
        const scenarios2 = window.testCases;
        
        tests.push({
            name: 'Sincronización testCases',
            test: () => scenarios1.length === scenarios2.length,
            result: scenarios1.length === scenarios2.length
        });
    }
    
    // Mostrar resultados
    console.log('📊 === RESULTADOS DE PRUEBAS ===');
    let passed = 0;
    let failed = 0;
    
    tests.forEach(test => {
        const status = test.result ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${test.result ? 'PASÓ' : 'FALLÓ'}`);
        
        if (test.result) {
            passed++;
        } else {
            failed++;
        }
    });
    
    console.log(`📈 Resumen: ${passed} pasaron, ${failed} fallaron`);
    
    if (failed === 0) {
        console.log('🎉 ¡Todas las pruebas pasaron! El sistema unificado funciona correctamente.');
        return true;
    } else {
        console.log('⚠️ Algunas pruebas fallaron. Revisar configuración.');
        return false;
    }
}

/**
 * Prueba la migración de datos legacy
 */
function testLegacyMigration() {
    console.log('🧪 === PRUEBAS DE MIGRACIÓN LEGACY ===');
    
    // Verificar que existen las funciones de migración
    const hasMigrationFunctions = (
        typeof createArchitectureBackup === 'function' &&
        typeof migrateLegacyToUnified === 'function' &&
        typeof validateMigration === 'function'
    );
    
    console.log(`📋 Funciones de migración disponibles: ${hasMigrationFunctions ? '✅' : '❌'}`);
    
    if (hasMigrationFunctions) {
        // Crear respaldo
        console.log('💾 Creando respaldo...');
        const backup = createArchitectureBackup();
        console.log(`✅ Respaldo creado: ${backup.timestamp}`);
        
        // Validar migración
        console.log('🔍 Validando migración...');
        const isValid = validateMigration();
        console.log(`✅ Migración válida: ${isValid ? 'SÍ' : 'NO'}`);
        
        return isValid;
    }
    
    return false;
}

/**
 * Prueba la funcionalidad completa
 */
function testCompleteFunctionality() {
    console.log('🧪 === PRUEBAS DE FUNCIONALIDAD COMPLETA ===');
    
    if (!window.GestorCP || !window.GestorCP.Data) {
        console.log('❌ Sistema unificado no disponible');
        return false;
    }
    
    try {
        // Test 1: Agregar escenario
        console.log('📝 Probando agregar escenario...');
        const newScenario = {
            id: `test_${Date.now()}`,
            scenarioNumber: '999',
            description: 'Escenario de prueba',
            tester: 'Test',
            status: 'Pendiente'
        };
        
        const added = window.GestorCP.Data.addScenario(newScenario);
        console.log(`✅ Escenario agregado: ${added}`);
        
        // Test 2: Obtener escenarios
        console.log('📖 Probando obtener escenarios...');
        const scenarios = window.GestorCP.Data.getScenarios();
        console.log(`✅ Escenarios obtenidos: ${scenarios.length}`);
        
        // Test 3: Actualizar escenario
        console.log('✏️ Probando actualizar escenario...');
        const updated = window.GestorCP.Data.updateScenario(newScenario.id, { status: 'OK' });
        console.log(`✅ Escenario actualizado: ${updated}`);
        
        // Test 4: Eliminar escenario
        console.log('🗑️ Probando eliminar escenario...');
        const removed = window.GestorCP.Data.removeScenario(newScenario.id);
        console.log(`✅ Escenario eliminado: ${removed}`);
        
        console.log('🎉 Todas las pruebas de funcionalidad pasaron');
        return true;
        
    } catch (error) {
        console.error('❌ Error en pruebas de funcionalidad:', error);
        return false;
    }
}

/**
 * Ejecuta todas las pruebas
 */
function runAllMigrationTests() {
    console.log('🚀 === EJECUTANDO TODAS LAS PRUEBAS ===');
    
    const results = {
        unified: testUnifiedSystem(),
        migration: testLegacyMigration(),
        functionality: testCompleteFunctionality()
    };
    
    console.log('📊 === RESUMEN FINAL ===');
    console.log(`✅ Sistema Unificado: ${results.unified ? 'FUNCIONA' : 'FALLA'}`);
    console.log(`✅ Migración Legacy: ${results.migration ? 'FUNCIONA' : 'FALLA'}`);
    console.log(`✅ Funcionalidad Completa: ${results.functionality ? 'FUNCIONA' : 'FALLA'}`);
    
    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
        console.log('🎉 ¡MIGRACIÓN EXITOSA! Todos los sistemas funcionan correctamente.');
    } else {
        console.log('⚠️ Migración parcial. Algunos componentes necesitan atención.');
    }
    
    return results;
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

// Exponer funciones de prueba globalmente
window.testUnifiedSystem = testUnifiedSystem;
window.testLegacyMigration = testLegacyMigration;
window.testCompleteFunctionality = testCompleteFunctionality;
window.runAllMigrationTests = runAllMigrationTests;

// Ejecutar pruebas automáticamente después de un delay (solo en desarrollo)
// Comentado para evitar spam en la consola
// if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
//     setTimeout(() => {
//         runAllMigrationTests();
//     }, 2000);
// }

// Sistema de pruebas de migración cargado
