// ===============================================
// TIMERS.JS - Sistema de cronómetros completo
// ===============================================

// ===============================================
// CRONÓMETROS EN FILAS - SISTEMA PRINCIPAL
// ===============================================

// ===============================================
// FUNCIONES DE FORMATEO DE TIEMPO
// ===============================================

// Función para formatear minutos a formato hh:mm
function formatTimeDisplay(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    // Formatear con ceros a la izquierda
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${hoursStr}:${minutesStr}`;
}

// Funcion iniciar cronometro en filas
function toggleRowTimer(id) {
    if (activeTimerId === id) {
        // Si es el mismo cronómetro → DETENER (no pausar)
        stopRowTimer();
        return;
    }

    // Verificar si el MISMO escenario ya tiene un timer de bugfixing activo
    const scenario = testCases.find(tc => tc.id === id);
    if (scenario) {
        const bugfixingTimer = initializeBugfixingTimer(scenario);
        if (bugfixingTimer.state === 'RUNNING') {
            if (!confirm(`⚠️ El Escenario ${scenario.scenarioNumber} ya tiene un timer de bugfixing activo.\n\n¿Detenerlo e iniciar timer de testing?`)) {
                return;
            }
            stopBugfixingTimer(id);
        }
    }

    if (activeTimerId !== null) {
        // Si hay otro activo → Confirmar cambio
        const activeCase = testCases.find(tc => tc.id === activeTimerId);
        const newCase = testCases.find(tc => tc.id === id);

        if (!confirm(`⏱️ Ya tienes un cronómetro activo en el Escenario ${activeCase?.scenarioNumber} - Ciclo ${activeCase?.cycleNumber}.
        \n¿Detenerlo y cambiar al Escenario ${newCase?.scenarioNumber} - Ciclo ${newCase?.cycleNumber}?`)) {
            return;
        }
        stopRowTimer();
    }

    // Iniciar NUEVO cronómetro (siempre desde cero)
    startNewTimer(id);
}

function startNewTimer(id) {
    // Limpiar timer anterior si existe
    if (rowTimerInterval) {
        clearInterval(rowTimerInterval);
        rowTimerInterval = null;
    }

    activeTimerId = id;
    timerPaused = false;
    pausedTime = 0;

    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) {
        console.error('❌ No se encontró el caso para iniciar timer:', id);
        return;
    }

    // Convertir horas existentes a minutos para cálculo interno
    rowTimerAccum = (parseFloat(testCase.testTime) || 0) * 60;
    rowTimerStartTime = Date.now();

    showTimerBar(testCase);
    updateAllTimerButtons();

    // Asegurar que el interval se crea correctamente
    rowTimerInterval = setInterval(() => {
        updateTimerDisplay();
    }, 1000);

    console.log(`⏱️ Cronómetro iniciado: Escenario ${testCase.scenarioNumber}, tiempo acumulado: ${testCase.testTime || 0} horas`);
    console.log(`🔗 Timer ID: ${activeTimerId}, Interval ID: ${rowTimerInterval}`);
}

function showTimerBar(testCase) {
    const timerBar = document.getElementById('timerBar');
    const scenarioEl = document.getElementById('timerScenario');
    const descriptionEl = document.getElementById('timerDescription');
    const pauseBtn = document.getElementById('pauseBtn');

    scenarioEl.textContent = `Escenario ${testCase.scenarioNumber}`;
    descriptionEl.textContent = testCase.description.substring(0, 80) + (testCase.description.length > 80 ? '...' : '');

    // RESETEAR botón de pausa cuando se muestra
    pauseBtn.innerHTML = '⏸️ Pausar';
    pauseBtn.className = 'btn btn-warning btn-small';

    timerBar.style.display = 'block';
}

function updateTimerDisplay() {
    if (!activeTimerId || timerPaused) return;

    // Calcular tiempo transcurrido en minutos
    const elapsed = (Date.now() - rowTimerStartTime) / 60000;
    const total = rowTimerAccum + elapsed;

    // Actualizar display visual
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = formatTimeDisplay(total);
    }

    // Debug para verificar que está funcionando
    if (total % 5 < 0.1) { // Log cada ~5 minutos para debug
        console.log(`⏱️ Timer activo: ${formatTimeDisplay(total)} (ID: ${activeTimerId})`);
    }
}

function pauseTimer() {
    if (!activeTimerId) return;

    const pauseBtn = document.getElementById('pauseBtn');

    if (timerPaused) {
        // Reanudar
        timerPaused = false;
        rowTimerStartTime = Date.now() - pausedTime;
        pauseBtn.innerHTML = '⏸️ Pausar';
        pauseBtn.className = 'btn btn-warning btn-small';
        console.log('⏱️ Cronómetro reanudado');
    } else {
        // Pausar
        timerPaused = true;
        pausedTime = Date.now() - rowTimerStartTime;
        pauseBtn.innerHTML = '▶️ Reanudar';
        pauseBtn.className = 'btn btn-success btn-small';
        console.log('⏸️ Cronómetro pausado');
    }
}

// Función detener cronómetro (guarda en horas)
// Función detener cronómetro (guarda en horas)
function stopRowTimer() {
    if (activeTimerId === null) {
        console.log('⏱️ No hay timer activo para detener');
        return;
    }

    // Limpiar interval
    if (rowTimerInterval) {
        clearInterval(rowTimerInterval);
        rowTimerInterval = null;
    }

    // Guardar tiempo final EN HORAS
    const testCase = testCases.find(tc => tc.id === activeTimerId);
    if (testCase) {
        const elapsed = timerPaused ? pausedTime / 60000 : (Date.now() - rowTimerStartTime) / 60000;
        let totalMinutes = rowTimerAccum + elapsed;

        // Convertir a horas y guardar con 2 decimales
        let totalHours = totalMinutes / 60;
        testCase.testTime = Math.round(totalHours * 100) / 100;

        console.log(`⏹️ Cronómetro detenido: ${totalHours.toFixed(2)} horas total (Escenario ${testCase.scenarioNumber})`);
    }

    // RESET COMPLETO
    const oldTimerId = activeTimerId;
    activeTimerId = null;
    timerPaused = false;
    pausedTime = 0;
    rowTimerAccum = 0;
    rowTimerStartTime = 0;

    // Ocultar barra y actualizar botones
    const timerBar = document.getElementById('timerBar');
    if (timerBar) {
        timerBar.style.display = 'none';
    }
    
    updateAllTimerButtons();

    // Guardar datos y actualizar interfaz
    saveToStorage();
    
    // Actualizar tabla si las funciones existen
    if (typeof renderTestCases === 'function') {
        renderTestCases();
    }
    if (typeof updateStats === 'function') {
        updateStats();
    }

    console.log(`✅ Timer ${oldTimerId} completamente detenido y guardado`);
}

function getScenarioNumber(id) {
    const testCase = testCases.find(tc => tc.id === id);
    return testCase ? testCase.scenarioNumber : '?';
}

function getCicleNumber(id) {
    const testCase = testCases.find(tc => tc.id === id);
    return testCase ? testCase.cycleNumber : '?';
}

function updateAllTimerButtons() {
    // Actualizar todos los botones de cronómetro en la tabla
    testCases.forEach(tc => {
        const btn = document.getElementById(`timerBtn-${tc.id}`);
        if (btn) {
            if (activeTimerId === tc.id) {
                btn.textContent = '⏹️';
                btn.title = 'Detener cronómetro';
                btn.className = 'btn btn-danger btn-small';
            } else {
                btn.textContent = '⏱️';
                btn.title = 'Iniciar cronómetro';
                btn.className = 'btn btn-info btn-small';
            }
        }
    });
    
    // También actualizar botones de bugfixing
    if (typeof updateAllBugfixingButtons === 'function') {
        updateAllBugfixingButtons();
    }
}


// ===============================================
// EDICIÓN MANUAL DE TIEMPO
// ===============================================

// Funcion para actualizar tiempo manualmente
window.updateManualTime = function (id, value) {
    const testCase = testCases.find(tc => tc.id === id);
    if (testCase) {
        const newTimeHours = Math.max(0, parseFloat(value) || 0);
        testCase.testTime = newTimeHours;

        // 🎯 NUEVO: Sincronizar con multicaso
        if (typeof syncScenariosWithCurrentCase === 'function') {
            syncScenariosWithCurrentCase();
        }
        
        // 🎯 NUEVO: Actualizar UI multicaso inmediatamente
        if (typeof autoUpdateMulticaseUI === 'function') {
            autoUpdateMulticaseUI();
        }

        // ACTUALIZACIÓN INMEDIATA (existente)
        saveToStorage();
        renderTestCases();
        updateStats();

        console.log(`⏱️ Tiempo actualizado manualmente: Escenario ${testCase.scenarioNumber} → ${newTimeHours} horas`);
    }
}


// ===============================================
// FUNCIONES PARA ESTADÍSTICAS SIMPLIFICADAS
// ===============================================

// Obtener tiempo total en horas (solo una función simple)
function getTotalTimeHours() {
    return testCases.reduce((total, tc) => {
        return total + (parseFloat(tc.testTime) || 0);
    }, 0);
}

// Obtener estadísticas simplificadas
function getTimeStatistics() {
    const casesWithTime = testCases.filter(tc => (tc.testTime || 0) > 0);
    const totalHours = getTotalTimeHours();
    
    return {
        casesWithTime: casesWithTime.length,
        totalCases: testCases.length,
        totalHours: totalHours,
        averageTimePerCase: casesWithTime.length > 0 ? totalHours / casesWithTime.length : 0
    };
}

// ===============================================
// TIMER DE BUGFIXING - SISTEMA CRÍTICO
// ===============================================

// Variables globales para bugfixing
let activeBugfixingTimerId = null;
let bugfixingTimerInterval = null;
let bugfixingStartTime = null;
let bugfixingAccumulatedTime = 0;

/**
 * Inicializa la estructura de timer de bugfixing en un escenario
 */
function initializeBugfixingTimer(scenario) {
    if (!scenario.bugfixingTimer) {
        scenario.bugfixingTimer = {
            start: null,
            accumulated: 0,
            state: 'PAUSED' // PAUSED, RUNNING
        };
    }
    return scenario.bugfixingTimer;
}

/**
 * Formatea tiempo de bugfixing - muestra días si > 24h
 */
function formatBugfixingTime(totalMinutes) {
    const totalHours = totalMinutes / 60;
    
    if (totalHours >= 24) {
        const days = Math.floor(totalHours / 24);
        const hours = Math.floor(totalHours % 24);
        return `${days}d ${hours}h`;
    } else {
        const hours = Math.floor(totalHours);
        const minutes = Math.floor(totalMinutes % 60);
        return `${hours}h ${minutes}m`;
    }
}

/**
 * Inicia el timer de bugfixing para un escenario
 */
function startBugfixingTimer(scenarioId) {
    const scenario = testCases.find(tc => tc.id === scenarioId);
    if (!scenario) {
        console.error('❌ No se encontró el escenario para iniciar bugfixing timer:', scenarioId);
        return false;
    }
    
    // console.log('🔄 INICIANDO timer de bugfixing para escenario:', scenario.scenarioNumber);

    // 🎯 CRÍTICO: Solo permitir timer de bugfixing en escenarios con estado "NO"
    if (scenario.status !== 'NO') {
        showError(`Solo se puede iniciar timer de bugfixing en escenarios con estado "NO". Estado actual: ${scenario.status}`, 'Estado incorrecto');
        return false;
    }

    // Verificar si el MISMO escenario ya tiene un timer de testing activo
    if (activeTimerId === scenarioId) {
        if (!confirm(`⚠️ El Escenario ${scenario.scenarioNumber} ya tiene un timer de testing activo.\n\n¿Detenerlo e iniciar timer de bugfixing?`)) {
            return false;
        }
        stopTimer(scenarioId);
    }
    
    // Verificar si el MISMO escenario ya tiene un timer de bugfixing activo
    const bugfixingTimer = initializeBugfixingTimer(scenario);
    // console.log('🔍 DEBUG startBugfixingTimer: Estado actual del timer:', bugfixingTimer.state, 'para escenario:', scenario.scenarioNumber);
    if (bugfixingTimer.state === 'RUNNING') {
        console.log('⚠️ Timer de bugfixing ya está corriendo en este escenario');
        return false;
    }
    
    // Configurar el timer de bugfixing para este escenario específico
    bugfixingTimer.state = 'RUNNING';
    bugfixingTimer.start = new Date().toISOString();
    
    // Si este es el primer timer de bugfixing activo, establecer como el activo global
    if (activeBugfixingTimerId === null) {
        activeBugfixingTimerId = scenarioId;
        bugfixingStartTime = Date.now();
        bugfixingAccumulatedTime = bugfixingTimer.accumulated || 0;
    } else {
        // Iniciar nuevo timer
        console.log('🆕 Iniciando nuevo timer de bugfixing...');
        activeBugfixingTimerId = scenarioId;
        bugfixingStartTime = Date.now();
        bugfixingAccumulatedTime = bugfixingTimer.accumulated || 0;
    }

    // Actualizar estado del escenario
    bugfixingTimer.start = new Date(bugfixingStartTime).toISOString();
    bugfixingTimer.state = 'RUNNING';

    // Iniciar interval de actualización
    if (bugfixingTimerInterval) {
        clearInterval(bugfixingTimerInterval);
    }
    
    bugfixingTimerInterval = setInterval(() => {
        updateBugfixingDisplay();
    }, 1000);

    console.log(`🐛 Timer de bugfixing iniciado para Escenario ${scenario.scenarioNumber} - Ciclo ${scenario.cycleNumber} `);
    
    // NO mostrar automáticamente la barra de bugfixing
    // Solo se mostrará cuando el usuario marque el checkbox del escenario
    // showBugfixingBar(scenario); // COMENTADO

    showSuccess(`Timer de bugfixing iniciado para Escenario ${scenario.scenarioNumber} - Ciclo ${scenario.cycleNumber}`, 'Bugfixing iniciado');
    
    // 🆕 Actualizar indicador visual inmediatamente (con pequeño delay para asegurar renderizado)
    setTimeout(() => {
        if (typeof updateAllBugfixingButtons === 'function') {
            updateAllBugfixingButtons();
        }
    }, 100);
    
    // 🎯 CRÍTICO: Guardar cambios inmediatamente para persistencia
    saveToStorage();
    if (typeof syncScenariosWithCurrentCase === 'function') {
        syncScenariosWithCurrentCase();
    }
    
    // 🎯 CRÍTICO: También guardar en multicaseData para preservar timers
    console.log('🔍 DEBUG startBugfixingTimer: saveMulticaseData disponible:', typeof saveMulticaseData === 'function');
    if (typeof saveMulticaseData === 'function') {
        console.log('🔄 startBugfixingTimer: Guardando en multicaseData...');
        saveMulticaseData();
        console.log('✅ startBugfixingTimer: Guardado en multicaseData completado');
    } else {
        console.warn('⚠️ startBugfixingTimer: saveMulticaseData no está disponible');
    }
    
    // console.log('✅ Timer de bugfixing GUARDADO para escenario:', scenario.scenarioNumber);
    
    return true;
}

/**
 * Detiene el timer de bugfixing para un escenario
 */
function stopBugfixingTimer(scenarioId) {
    const scenario = testCases.find(tc => tc.id === scenarioId);
    if (!scenario) {
        console.error('❌ No se encontró el escenario para detener bugfixing timer:', scenarioId);
        return false;
    }

    const bugfixingTimer = initializeBugfixingTimer(scenario);
    
    if (bugfixingTimer.state === 'RUNNING') {
        // Calcular tiempo total acumulado
        const timeSinceStart = bugfixingTimer.start ? (Date.now() - new Date(bugfixingTimer.start).getTime()) / 60000 : 0; // en minutos
        bugfixingTimer.accumulated += timeSinceStart;
        bugfixingTimer.state = 'PAUSED';
        bugfixingTimer.start = null;
        
        console.log(`⏹️ Timer de bugfixing detenido para Escenario ${scenario.scenarioNumber}`);
        console.log(`📊 Tiempo total acumulado: ${formatBugfixingTime(bugfixingTimer.accumulated)}`);
        
        // Mostrar toast solo si realmente se detuvo
        showSuccess(`Timer de bugfixing detenido para Escenario ${scenario.scenarioNumber}`, 'Bugfixing detenido');
    } else {
        // Si ya estaba detenido, mostrar mensaje diferente
        showInfo(`El timer de bugfixing para Escenario ${scenario.scenarioNumber} ya estaba detenido`, 'Timer ya detenido');
        return true;
    }

    // Limpiar timer activo si es el mismo
    if (activeBugfixingTimerId === scenarioId) {
        activeBugfixingTimerId = null;
        bugfixingStartTime = null;
        bugfixingAccumulatedTime = 0;
        
        if (bugfixingTimerInterval) {
            clearInterval(bugfixingTimerInterval);
            bugfixingTimerInterval = null;
        }
        
        // Ocultar la barra de bugfixing
        hideBugfixingBar();
    }

    // Actualizar botones
    if (typeof updateAllBugfixingButtons === 'function') {
        updateAllBugfixingButtons();
    }

    // Guardar cambios
    saveToStorage();
    if (typeof syncScenariosWithCurrentCase === 'function') {
        syncScenariosWithCurrentCase();
    }
    
    // 🎯 CRÍTICO: También guardar en multicaseData para preservar timers
    console.log('🔍 DEBUG stopBugfixingTimer: saveMulticaseData disponible:', typeof saveMulticaseData === 'function');
    if (typeof saveMulticaseData === 'function') {
        console.log('🔄 stopBugfixingTimer: Guardando en multicaseData...');
        saveMulticaseData();
        console.log('✅ stopBugfixingTimer: Guardado en multicaseData completado');
        
        // Verificar que realmente se guardó
        try {
            const compressedData = localStorage.getItem('multicaseData');
            if (compressedData) {
                const data = typeof decompressData === 'function' ? decompressData(compressedData) : JSON.parse(compressedData);
                console.log('🔍 DEBUG: multicaseData después de guardar:', {
                    existe: !!data,
                    tieneCases: !!(data && data.cases),
                    casosLength: data?.cases?.length || 0
                });
            }
        } catch (e) {
            console.warn('⚠️ Error verificando multicaseData:', e);
        }
    } else {
        console.warn('⚠️ stopBugfixingTimer: saveMulticaseData no está disponible');
    }

    return true;
}

/**
 * Actualiza el display del timer de bugfixing
 */
function updateBugfixingDisplay() {
    if (activeBugfixingTimerId === null) return;

    const scenario = testCases.find(tc => tc.id === activeBugfixingTimerId);
    if (!scenario) return;

    // Obtener el timer actual del escenario
    const bugfixingTimer = initializeBugfixingTimer(scenario);
    
    // Calcular tiempo total correctamente
    let totalTime = bugfixingTimer.accumulated || 0;
    
    if (bugfixingTimer.state === 'RUNNING' && bugfixingTimer.start) {
        const timeSinceStart = (Date.now() - new Date(bugfixingTimer.start).getTime()) / 60000; // en minutos
        totalTime += timeSinceStart;
    }

    // Actualizar display en el div rojo si existe
    const bugfixingDisplay = document.getElementById('bugfixingDisplay');
    if (bugfixingDisplay) {
        bugfixingDisplay.textContent = formatBugfixingTime(totalTime);
    }

    // Actualizar el botón en acciones
    const bugfixingBtn = document.getElementById(`bugfixingBtn-${activeBugfixingTimerId}`);
    if (bugfixingBtn) {
        bugfixingBtn.innerHTML = '⏹️';
        bugfixingBtn.title = `Detener bugfixing (${formatBugfixingTime(totalTime)})`;
    }
}

/**
 * Muestra la barra de bugfixing para un escenario
 */
function showBugfixingBar(scenario) {
    const bugfixingBar = document.getElementById('bugfixingBar');
    const scenarioEl = document.getElementById('bugfixingScenario');
    const descriptionEl = document.getElementById('bugfixingDescription');
    const displayEl = document.getElementById('bugfixingDisplay');

    if (bugfixingBar && scenarioEl && descriptionEl && displayEl) {
        scenarioEl.textContent = `Escenario ${scenario.scenarioNumber}`;
        descriptionEl.textContent = scenario.description.substring(0, 80) + (scenario.description.length > 80 ? '...' : '');
        
        // Calcular tiempo actual (acumulado + tiempo transcurrido desde start)
        const bugfixingTimer = initializeBugfixingTimer(scenario);
        let currentTime = bugfixingTimer.accumulated || 0;
        
        if (bugfixingTimer.state === 'RUNNING' && bugfixingTimer.start) {
            const timeSinceStart = (Date.now() - new Date(bugfixingTimer.start).getTime()) / 60000; // en minutos
            currentTime += timeSinceStart;
        }
        
        displayEl.textContent = formatBugfixingTime(currentTime);

        bugfixingBar.style.display = 'block';
        
        // Establecer como timer activo para actualización continua
        activeBugfixingTimerId = scenario.id;
        bugfixingStartTime = bugfixingTimer.start ? new Date(bugfixingTimer.start).getTime() : Date.now();
        bugfixingAccumulatedTime = bugfixingTimer.accumulated || 0;
        
        // Iniciar interval si no existe
        if (!bugfixingTimerInterval) {
            bugfixingTimerInterval = setInterval(() => {
                updateBugfixingDisplay();
            }, 1000);
        }
    }
}

/**
 * Oculta la barra de bugfixing
 */
function hideBugfixingBar() {
    const bugfixingBar = document.getElementById('bugfixingBar');
    if (bugfixingBar) {
        bugfixingBar.style.display = 'none';
    }
}

/**
 * Verifica y restaura timers de bugfixing al cargar la app
 */
function restoreBugfixingTimers() {
    let restoredCount = 0;
    testCases.forEach(scenario => {
        const bugfixingTimer = initializeBugfixingTimer(scenario);
        
        if (bugfixingTimer.state === 'RUNNING' && bugfixingTimer.start) {
            // Calcular tiempo transcurrido desde que se cerró la app
            const timeSinceStart = (Date.now() - new Date(bugfixingTimer.start).getTime()) / 60000;
            bugfixingTimer.accumulated += timeSinceStart;
            
            // Actualizar el start time para continuar el timer
            bugfixingTimer.start = new Date().toISOString();
            
            // Si es el primer timer restaurado, establecer como activo global
            if (activeBugfixingTimerId === null) {
                activeBugfixingTimerId = scenario.id;
                bugfixingStartTime = Date.now();
                bugfixingAccumulatedTime = bugfixingTimer.accumulated;
                
                // Iniciar interval si no existe
                if (!bugfixingTimerInterval) {
                    bugfixingTimerInterval = setInterval(() => {
                        updateBugfixingDisplay();
                    }, 1000);
                }
            }
            
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
 * Obtiene estadísticas de bugfixing
 */
function getBugfixingStatistics() {
    let totalBugfixingTime = 0;
    let activeTimers = 0;
    
    testCases.forEach(scenario => {
        const bugfixingTimer = initializeBugfixingTimer(scenario);
        
        if (bugfixingTimer.state === 'RUNNING') {
            activeTimers++;
            const timeSinceStart = (Date.now() - new Date(bugfixingTimer.start).getTime()) / 60000;
            totalBugfixingTime += bugfixingTimer.accumulated + timeSinceStart;
        } else {
            totalBugfixingTime += bugfixingTimer.accumulated || 0;
        }
    });
    
    return {
        totalTime: totalBugfixingTime,
        activeTimers: activeTimers,
        formattedTime: formatBugfixingTime(totalBugfixingTime)
    };
}

// ===============================================
// EXPOSICIÓN DE FUNCIONES GLOBALES
// ===============================================

// Hacer las funciones disponibles globalmente
window.toggleRowTimer = toggleRowTimer;
window.stopRowTimer = stopRowTimer;
window.pauseTimer = pauseTimer;
window.getTotalTimeHours = getTotalTimeHours;
window.getTimeStatistics = getTimeStatistics;
window.formatTimeDisplay = formatTimeDisplay;

// Funciones de bugfixing
window.startBugfixingTimer = startBugfixingTimer;
window.stopBugfixingTimer = stopBugfixingTimer;
window.restoreBugfixingTimers = restoreBugfixingTimers;
window.getBugfixingStatistics = getBugfixingStatistics;
window.formatBugfixingTime = formatBugfixingTime;
window.showBugfixingBar = showBugfixingBar;
window.hideBugfixingBar = hideBugfixingBar;

