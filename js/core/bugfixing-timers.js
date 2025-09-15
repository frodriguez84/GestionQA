// ===============================================
// BUGFIXING-TIMERS.JS - Funciones específicas para timers de bugfixing
// ===============================================

/**
 * Inicia un timer de bugfixing para un escenario específico
 */
function startBugfixingTimer(scenarioId) {
    console.log(`🔄 INICIANDO timer de bugfixing para escenario: ${scenarioId}`);
    
    const scenario = testCases.find(tc => tc.id === scenarioId);
    if (!scenario) {
        console.error('❌ Escenario no encontrado:', scenarioId);
        showError('Escenario no encontrado', 'Error de Timer');
        return false;
    }
    
    // Verificar que el escenario esté en estado NO
    if (scenario.status !== 'NO') {
        console.warn('⚠️ No se puede iniciar timer de bugfixing en escenario que no está en estado NO');
        showError('Solo se pueden iniciar timers de bugfixing en escenarios con estado NO', 'Estado incorrecto');
        return false;
    }
    
    // Verificar si ya tiene un timer de bugfixing activo
    if (scenario.bugfixingTimer && scenario.bugfixingTimer.state === 'RUNNING') {
        console.warn('⚠️ Timer de bugfixing ya está corriendo en este escenario');
        showError('Ya hay un timer de bugfixing activo en este escenario', 'Timer activo');
        return false;
    }
    
    // Verificar si tiene un timer de testing activo en el MISMO escenario
    if (scenario.timer && scenario.timer.isRunning) {
        const confirmStop = confirm(`El escenario ${scenario.scenarioNumber} - Ciclo ${scenario.cycleNumber} tiene un timer de testing activo.\n\n¿Deseas detenerlo y iniciar el timer de bugfixing?`);
        if (!confirmStop) {
            return false;
        }
        
        // Detener timer de testing
        stopTimer(scenarioId);
    }
    
    // Inicializar o reiniciar el timer de bugfixing
    scenario.bugfixingTimer = {
        start: Date.now(),
        accumulated: scenario.bugfixingTimer ? scenario.bugfixingTimer.accumulated : 0,
        state: 'RUNNING'
    };
    
    console.log(`🐛 Timer de bugfixing iniciado para Escenario ${scenario.scenarioNumber} - Ciclo ${scenario.cycleNumber}`);
    
    // Guardar inmediatamente en localStorage
    if (typeof saveToStorage === 'function') {
        saveToStorage();
        console.log(`✅ Timer de bugfixing GUARDADO para escenario: ${scenarioId}`);
    }
    
    // Sincronizar con el caso actual
    if (typeof syncScenariosWithCurrentCase === 'function') {
        syncScenariosWithCurrentCase();
    }
    
    // Actualizar botones de bugfixing
    if (typeof updateAllBugfixingButtons === 'function') {
        setTimeout(() => {
            updateAllBugfixingButtons();
        }, 100);
    }
    
    // 🎯 CRÍTICO: También guardar en multicaseData para preservar timers
    if (typeof saveMulticaseData === 'function') {
        saveMulticaseData();
        
        // 🆕 CRÍTICO: Sincronizar inmediatamente con el dashboard
        setTimeout(() => {
            if (typeof syncFromAppToDashboard === 'function') {
                syncFromAppToDashboard();
                
                // Actualizar estadísticas del dashboard
                setTimeout(() => {
                    if (typeof updateAllRequirementsStats === 'function') {
                        updateAllRequirementsStats();
                    }
                }, 500);
            }
        }, 100);
        
    }
    
    return true;
}

/**
 * Detiene un timer de bugfixing para un escenario específico
 */
function stopBugfixingTimer(scenarioId) {
    console.log(`🔄 DETENIENDO timer de bugfixing para escenario: ${scenarioId}`);
    
    const scenario = testCases.find(tc => tc.id === scenarioId);
    if (!scenario) {
        console.error('❌ Escenario no encontrado:', scenarioId);
        return false;
    }
    
    if (!scenario.bugfixingTimer || scenario.bugfixingTimer.state !== 'RUNNING') {
        console.log('ℹ️ Timer de bugfixing ya estaba pausado');
        showInfo(`Timer de bugfixing ya estaba pausado para Escenario ${scenario.scenarioNumber}`, 'Timer pausado');
        return false;
    }
    
    // Calcular tiempo acumulado
    const now = Date.now();
    const sessionTime = (now - scenario.bugfixingTimer.start) / 1000 / 60; // en minutos
    scenario.bugfixingTimer.accumulated += sessionTime;
    scenario.bugfixingTimer.state = 'PAUSED';
    scenario.bugfixingTimer.start = null;
    
    const totalMinutes = scenario.bugfixingTimer.accumulated;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    console.log(`⏹️ Timer de bugfixing detenido para Escenario ${scenario.scenarioNumber}`);
    console.log(`📊 Tiempo total acumulado: ${hours}h ${minutes}m`);
    
    // Mostrar toast de éxito solo si realmente estaba corriendo
    showSuccess(`Timer de bugfixing detenido para Escenario ${scenario.scenarioNumber}`, 'Timer detenido');
    
    // Guardar inmediatamente
    if (typeof saveToStorage === 'function') {
        saveToStorage();
    }
    
    // Sincronizar con el caso actual
    if (typeof syncScenariosWithCurrentCase === 'function') {
        syncScenariosWithCurrentCase();
    }
    
    // Actualizar botones
    if (typeof updateAllBugfixingButtons === 'function') {
        updateAllBugfixingButtons();
    }
    
    // 🎯 CRÍTICO: También guardar en multicaseData para preservar timers
    if (typeof saveMulticaseData === 'function') {
        saveMulticaseData();
        
        // 🆕 CRÍTICO: Sincronizar inmediatamente con el dashboard
        setTimeout(() => {
            if (typeof syncFromAppToDashboard === 'function') {
                syncFromAppToDashboard();
                
                // Actualizar estadísticas del dashboard
                setTimeout(() => {
                    if (typeof updateAllRequirementsStats === 'function') {
                        updateAllRequirementsStats();
                    }
                }, 500);
            }
        }, 100);
        
    }
    
    return true;
}

/**
 * Restaura timers de bugfixing después de cargar datos
 */
function restoreBugfixingTimers() {
    if (!testCases || testCases.length === 0) return;
    
    let restoredCount = 0;
    
    testCases.forEach(scenario => {
        if (scenario.bugfixingTimer && scenario.bugfixingTimer.state === 'RUNNING') {
            // Calcular tiempo transcurrido desde la última vez que se guardó
            const now = Date.now();
            const timeSinceStart = (now - scenario.bugfixingTimer.start) / 1000 / 60; // en minutos
            
            // Actualizar tiempo acumulado
            scenario.bugfixingTimer.accumulated += timeSinceStart;
            
            // Reiniciar el timer
            scenario.bugfixingTimer.start = now;
            
            restoredCount++;
        }
    });
    
    if (restoredCount > 0) {
        // Solo mostrar el toast una vez por sesión para evitar spam
        if (!window.bugfixingTimersRestoredShown) {
            showInfo(`${restoredCount} timers de bugfixing activos`, 'Timers activos');
            window.bugfixingTimersRestoredShown = true;
        }
    }
}

/**
 * Obtiene estadísticas de bugfixing para el dashboard
 */
function getBugfixingStats() {
    let totalBugfixingTime = 0;
    let activeTimers = 0;
    let pausedTimers = 0;
    
    testCases.forEach(scenario => {
        if (scenario.bugfixingTimer) {
            if (scenario.bugfixingTimer.state === 'RUNNING') {
                // Calcular tiempo total incluyendo el tiempo transcurrido
                const now = Date.now();
                const sessionTime = (now - scenario.bugfixingTimer.start) / 1000 / 60;
                totalBugfixingTime += scenario.bugfixingTimer.accumulated + sessionTime;
                activeTimers++;
            } else if (scenario.bugfixingTimer.state === 'PAUSED') {
                totalBugfixingTime += scenario.bugfixingTimer.accumulated;
                pausedTimers++;
            }
        }
    });
    
    return {
        totalTime: totalBugfixingTime,
        activeTimers: activeTimers,
        pausedTimers: pausedTimers,
        totalTimers: activeTimers + pausedTimers
    };
}

// ===============================================
// EXPOSICIÓN GLOBAL
// ===============================================

window.startBugfixingTimer = startBugfixingTimer;
window.stopBugfixingTimer = stopBugfixingTimer;
window.restoreBugfixingTimers = restoreBugfixingTimers;
window.getBugfixingStats = getBugfixingStats;
