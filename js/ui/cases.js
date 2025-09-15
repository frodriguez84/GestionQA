// ===============================================
// SCRIPT-CASES.JS - CRUD Casos + Filtros + Renderizado
// ===============================================

// ===============================================
// CONFIGURACIÓN DE VARIABLES DINÁMICAS
// ===============================================

// Mostrar modal de configuración
document.getElementById('btnConfigVars').onclick = function () {
    renderVarsList();
    document.getElementById('configVarsModal').style.display = 'block';
};
document.getElementById('closeConfigVarsBtn').onclick = function () {
    document.getElementById('configVarsModal').style.display = 'none';
};
document.getElementById('btnCancelConfigVars').onclick = function () {
    document.getElementById('configVarsModal').style.display = 'none';
};

// Renderizar lista de variables en el modal
function renderVarsList() {
    const varsList = document.getElementById('varsList');

    // Guardar los valores actuales de los inputs
    const currentValues = Array.from(varsList.querySelectorAll('input')).map(input => input.value);

    varsList.innerHTML = '';
    inputVariableNames.forEach((name, idx) => {
        const div = document.createElement('div');
        div.className = 'step-item';
        div.innerHTML = `
            <input type="text" value="${name || currentValues[idx] || ''}" style="flex:1;" placeholder="Nombre de variable">
            <button type="button" class="step-remove" onclick="removeVarName(${idx})">✕</button>
        `;
        varsList.appendChild(div);
    });
}

window.removeVarName = function (idx) {
    inputVariableNames.splice(idx, 1);
    renderVarsList();
};

// Agregar variable
document.getElementById('btnAddVarName').onclick = function () {
    inputVariableNames.push('');
    renderVarsList();
};

// Guardar configuración
document.getElementById('configVarsForm').onsubmit = function (e) {
    e.preventDefault();
    // Tomar valores de inputs
    const inputs = document.querySelectorAll('#varsList input');
    inputVariableNames = Array.from(inputs).map(inp => inp.value.trim()).filter(v => v);
    localStorage.setItem('inputVariableNames', JSON.stringify(inputVariableNames));
    // Actualizar estructura de casos existentes
    testCases.forEach(tc => {
        tc.inputVariables = inputVariableNames.map(name => {
            // Si ya existe, mantener valor, si no, dejar vacío
            const found = (tc.inputVariables || []).find(v => v.name === name);
            return { name, value: found ? found.value : '' };
        });
    });

    saveToStorage();
    renderTestCases();
    document.getElementById('configVarsModal').style.display = 'none';
    showSuccess('Configuración de variables actualizada', 'Configuración guardada');
};

// ===============================================
// FUNCIONES DE RENDERIZADO DE VARIABLES
// ===============================================

function renderFixedVariablesInputs(values = {}) {
    const container = document.getElementById('fixedVariablesContainer');
    container.innerHTML = inputVariableNames.map(varName => `
        <div class="step-item">
            <label style="min-width:100px;">${varName}:</label>
            <input type="text" name="var_${varName}" value="${values[varName] || ''}" style="flex:1;">
        </div>
    `).join('');
}

// ===============================================
// MODALES DE CASOS - ABRIR/CERRAR
// ===============================================

// Funciones principales - Las adjuntamos al objeto window para hacerlas globales
window.openAddModal = function () {
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Caso de Prueba';
    document.getElementById('testCaseForm').reset();

    document.getElementById('fixedVariablesContainer').innerHTML = '';
    document.getElementById('evidenceContainer').innerHTML = '';

    renderFixedVariablesInputs();

    // Sugerir Ciclo = 1
    document.getElementById('cycleNumber').value = '1';

    // Sugerir N° Escenario = último + 1
    let lastScenario = 0;
    if (testCases.length > 0) {
        // Buscar el mayor número de escenario existente
        lastScenario = Math.max(...testCases.map(tc => parseInt(tc.scenarioNumber) || 0));
    }
    document.getElementById('scenarioNumber').value = (lastScenario + 1).toString();

    // Resetear cronómetro
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    document.getElementById('testCaseModal').style.display = 'block';
    // 🆕 MARCAR COMO DUPLICACIÓN PENDIENTE
    window.isDuplicating = true;
    window.duplicatedCaseTemp = duplicatedCase;
}

window.openEditModal = function (id) {
    console.log('✏️ Abriendo modal de edición para escenario:', id);

    // 🎯 BUSCAR EN testCases GLOBAL (sincronizado con multicaso)
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) {
        console.error('❌ Escenario no encontrado para editar:', id);
        console.log('📊 testCases disponibles:', testCases.map(tc => ({ id: tc.id, scenario: tc.scenarioNumber })));
        showError('No se pudo encontrar el caso a editar', 'Error de edición');
        return;
    }

    // console.log('✅ Escenario encontrado para edición:', testCase.scenarioNumber);

    currentEditingId = id;
    window.isDuplicating = false; // 🎯 NO es duplicación

    document.getElementById('modalTitle').textContent = 'Editar Caso de Prueba';

    // Llenar formulario
    document.getElementById('scenarioNumber').value = testCase.scenarioNumber || '';
    document.getElementById('cycleNumber').value = testCase.cycleNumber || '';
    document.getElementById('description').value = testCase.description || '';
    document.getElementById('obtainedResult').value = testCase.obtainedResult || '';
    document.getElementById('status').value = testCase.status || '';
    document.getElementById('executionDate').value = formatDateForStorage(testCase.executionDate) || '';
    document.getElementById('observations').value = testCase.observations || '';
    document.getElementById('errorNumber').value = testCase.errorNumber || '';
    document.getElementById('tester').value = testCase.tester || '';

    // Resetear cronómetro
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const values = {};
    if (testCase.inputVariables) {
        testCase.inputVariables.forEach(v => values[v.name] = v.value);
    }
    renderFixedVariablesInputs(values);

    // Cargar evidencias
    document.getElementById('evidenceContainer').innerHTML = '';
    if (testCase.evidence) {
        testCase.evidence.forEach(evidence => {
            addEvidenceToContainer(evidence.name, evidence.data, evidence.mime);

        });
    }

    document.getElementById('testCaseModal').style.display = 'block';

    console.log('✅ Modal de edición abierto correctamente');
}

window.closeModal = function () {
    document.getElementById('testCaseModal').style.display = 'none';
    // Detener cronómetro si está activo
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ===============================================
// GESTIÓN DE EVIDENCIAS
// ===============================================
// ===============================================
// GESTIÓN DE EVIDENCIAS
// ===============================================
window.handleEvidenceUpload = function () {
    const input = document.getElementById('evidenceInput');
    const files = Array.from(input.files);

    const MAX_BYTES = 10 * 1024 * 1024; // 10MB
    const ALLOWED_PREFIXES = ['image/'];
    const ALLOWED_EXACT = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    files.forEach(file => {
        const isAllowed =
            ALLOWED_PREFIXES.some(p => file.type.startsWith(p)) ||
            ALLOWED_EXACT.includes(file.type);

        if (!isAllowed) {
            showWarning(`Tipo no permitido: ${file.name} (${file.type || 'desconocido'})`, 'Archivo no válido');
            return;
        }
        if (file.size > MAX_BYTES) {
            showWarning(`${file.name} supera el límite de 10MB`, 'Archivo muy grande');
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            addEvidenceToContainer(file.name, e.target.result, file.type); // <-- pasamos MIME
        };
        reader.readAsDataURL(file);
    });

    input.value = ''; // limpiar input
};



window.addEvidenceToContainer = function (name, dataUrl, mime) {
    // Inferir mime si no vino
    if (!mime) {
        const m = /^data:([^;]+);/.exec(dataUrl || '');
        mime = m ? m[1] : '';
    }
    const isImage = (mime || '').startsWith('image/');

    const container = document.getElementById('evidenceContainer');
    const div = document.createElement('div');
    div.className = 'evidence-item';

    // Guardar metadata para el submit
    div.dataset.name = name || 'archivo';
    div.dataset.src = dataUrl || '';
    div.dataset.mime = mime || '';

    // Vista previa
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '10px';

    if (isImage) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'evidence-preview';
        img.alt = name || '';
        topRow.appendChild(img);
    } else {
        const tag = document.createElement('div');
        tag.style.display = 'flex';
        tag.style.alignItems = 'center';
        tag.style.gap = '8px';
        let label = '📄 Archivo';
        if (mime === 'application/pdf') label = '📄 PDF';
        else if (mime === 'text/plain') label = '📄 TXT';
        else if (mime === 'application/msword' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') label = '📄 DOC/DOCX';
        tag.textContent = label;
        topRow.appendChild(tag);
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name || 'archivo';
    topRow.appendChild(nameSpan);

    // Acciones
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '6px';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn btn-small';
    openBtn.textContent = '🔎 Abrir';
    openBtn.addEventListener('click', () => {
        openEvidenceFile(div.dataset.src, div.dataset.name, div.dataset.mime);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-danger btn-small';
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => div.remove());

    actions.appendChild(openBtn);
    actions.appendChild(delBtn);

    div.appendChild(topRow);
    div.appendChild(actions);
    container.appendChild(div);
};


window.openEvidenceFile = function (dataUrl, name, mime) {
    try {
        mime = mime || (dataUrl.match(/^data:([^;]+);/)?.[1] || '');

        if (!dataUrl) {
            alert('No hay archivo para abrir/descargar');
            return;
        }

        // Para PDFs o TXT el navegador suele poder abrirlo directamente
        if (mime.startsWith('image/') || mime === 'application/pdf' || mime === 'text/plain') {
            window.open(dataUrl, '_blank');
            return;
        }

        // Para DOC/DOCX forzamos descarga
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = name || 'archivo';
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) {
        console.error('Error abriendo evidencia:', e);
        alert('No se pudo abrir/descargar la evidencia');
    }
};


window.viewEvidence = function (id) {
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase || !testCase.evidence || testCase.evidence.length === 0) {
        alert('Este escenario no tiene evidencias adjuntas');
        return;
    }

    const container = document.getElementById('evidenceViewContainer');
    container.innerHTML = '';

    testCase.evidence.forEach((ev, index) => {
        const mime = ev.mime || (ev.data?.match(/^data:([^;]+);/)?.[1] || '');
        const isImage = (mime || '').startsWith('image/');

        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '20px';

        const title = document.createElement('h3');
        title.style.marginBottom = '10px';
        title.textContent = `Evidencia ${index + 1}: ${ev.name}`;
        wrapper.appendChild(title);

        if (isImage) {
            const img = document.createElement('img');
            img.src = ev.data;
            img.style.cssText = 'max-width:100%;height:auto;border:2px solid #ddd;border-radius:8px;cursor:zoom-in;';
            img.alt = ev.name || '';
            img.addEventListener('click', () => zoomEvidenceImage(ev.data, ev.name || ''));
            wrapper.appendChild(img);
        } else {
            let tag = '📄 Archivo';
            if (mime === 'application/pdf') tag = '📄 PDF';
            else if (mime === 'text/plain') tag = '📄 TXT';
            else if (mime === 'application/msword' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') tag = '📄 DOC/DOCX';

            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #eee;padding:10px;border-radius:8px;';

            const left = document.createElement('div');
            left.textContent = tag;

            const btn = document.createElement('button');
            btn.className = 'btn btn-small';
            btn.textContent = '🔎 Abrir/Descargar';
            btn.addEventListener('click', () => openEvidenceFile(ev.data, ev.name || 'archivo', mime));

            row.appendChild(left);
            row.appendChild(btn);
            wrapper.appendChild(row);
        }

        container.appendChild(wrapper);
    });

    document.getElementById('evidenceViewModal').style.display = 'block';
};



// Función para ampliar las evidencias
window.zoomEvidenceImage = function (src, alt) {
    const modal = document.getElementById('imageZoomModal');
    const img = document.getElementById('zoomedImage');
    img.src = src;
    img.alt = alt || '';
    modal.style.display = 'block';
};

function dataURLtoBlob(dataUrl, fallbackMime) {
    const parts = dataUrl.split(',');
    const header = parts[0] || '';
    const base64 = parts[1] || '';
    const m = header.match(/^data:([^;]+);base64$/);
    const mime = (m && m[1]) || fallbackMime || 'application/octet-stream';
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

window.openEvidenceFile = function (dataUrl, name, mime) {
    try {
        mime = mime || (dataUrl.match(/^data:([^;]+);/)?.[1] || '');
        if (!dataUrl) {
            alert('No hay archivo para abrir/descargar');
            return;
        }

        const blob = dataURLtoBlob(dataUrl, mime);
        const url = URL.createObjectURL(blob);

        // 🔎 Para imágenes/PDF/TXT: abrir en nueva pestaña. Otros: descarga directa
        if ((mime || '').startsWith('image/') || mime === 'application/pdf' || mime === 'text/plain') {
            window.open(url, '_blank');
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = name || 'archivo';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        // Liberar memoria después
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        console.error('Error abriendo evidencia:', e);
        alert('No se pudo abrir/descargar la evidencia');
    }
};


document.getElementById('closeImageZoomBtn').onclick = function () {
    document.getElementById('imageZoomModal').style.display = 'none';
};

// ===============================================
// DUPLICACIÓN DE CASOS - VERSIÓN COMPLETA
// ===============================================

// Función auxiliar para insertar caso en la posición correcta según numeración
function insertCaseInCorrectPosition(newCase) {
    // Encontrar la posición donde insertar basándose en el número de escenario
    const newScenarioNumber = parseInt(newCase.scenarioNumber);
    let insertIndex = testCases.length; // Por defecto al final

    for (let i = 0; i < testCases.length; i++) {
        const currentScenarioNumber = parseInt(testCases[i].scenarioNumber);
        if (currentScenarioNumber > newScenarioNumber) {
            insertIndex = i;
            break;
        }
    }

        // Insertar en la posición correcta
        testCases.splice(insertIndex, 0, newCase);

        // Actualizar estadísticas y UI
        updateAppStats();
        renderTestCases();
        updateFilters();
        
        // Actualizar estadísticas del requerimiento
        if (typeof updateMulticaseRequirementStats === 'function' && window.currentRequirement) {
            updateMulticaseRequirementStats(window.currentRequirement);
        }
}

// Función auxiliar para renumerar escenarios posteriores - MEJORADA
function renumberScenariosAfter(newScenarioNumber, originalScenarioNumber, excludeId = null) {
    // Solo renumerar si el nuevo número es diferente al original
    if (newScenarioNumber === originalScenarioNumber) return;

    // Obtener todos los escenarios que necesitan renumeración
    const scenariosToRenumber = testCases.filter(tc => {
        const tcScenario = parseInt(tc.scenarioNumber);
        // Excluir el caso que estamos insertando para evitar conflictos
        if (excludeId && tc.id === excludeId) return false;
        return tcScenario >= newScenarioNumber;
    });

    // Ordenar por número de escenario (descendente para evitar conflictos)
    scenariosToRenumber.sort((a, b) => parseInt(b.scenarioNumber) - parseInt(a.scenarioNumber));

    // Renumerar cada escenario
    scenariosToRenumber.forEach(tc => {
        const currentNumber = parseInt(tc.scenarioNumber);
        tc.scenarioNumber = (currentNumber + 1).toString();
    });
}

// Función para detectar si un escenario es el último
function isLastScenario(scenarioNumber) {
    const allNumbers = testCases.map(tc => parseInt(tc.scenarioNumber) || 0);
    const maxNumber = Math.max(...allNumbers);
    return parseInt(scenarioNumber) === maxNumber;
}

// FUNCIÓN PRINCIPAL - duplicateTestCase MEJORADA
window.duplicateTestCase = function (id) {
    console.log('🔄 Iniciando duplicación de escenario:', id);

    // 🎯 BUSCAR EN testCases GLOBAL (sincronizado con multicaso)
    const originalCase = testCases.find(tc => tc.id === id);
    if (!originalCase) {
        console.error('❌ Escenario no encontrado en testCases:', id);
        console.log('📊 testCases disponibles:', testCases.map(tc => ({ id: tc.id, scenario: tc.scenarioNumber })));
        showError('No se pudo encontrar el caso a duplicar', 'Error de duplicación');
        return;
    }

    console.log('✅ Escenario encontrado:', originalCase.scenarioNumber);

    // Crear una copia profunda del caso original
    const duplicatedCase = JSON.parse(JSON.stringify(originalCase));

    // Asignar nuevo ID único
    duplicatedCase.id = Date.now();

    // Resetear algunos campos para que el usuario los configure
    duplicatedCase.status = ''; // Resetear estado a Pendiente
    duplicatedCase.executionDate = ''; // Limpiar fecha
    duplicatedCase.testTime = 0; // Resetear tiempo
    duplicatedCase.observations = ''; // Limpiar observaciones
    duplicatedCase.errorNumber = ''; // Limpiar número de error
    duplicatedCase.evidence = []; // Limpiar evidencias
    
    // 🕐 LIMPIAR TODOS LOS TIMERS DEL ESCENARIO DUPLICADO
    duplicatedCase.bugfixingTimer = null; // Sin timer de bugfixing
    duplicatedCase.bugfixingStartTime = null; // Sin tiempo de inicio
    duplicatedCase.bugfixingHours = 0; // Resetear horas de bugfixing
    duplicatedCase.timerRunning = false; // Sin timer corriendo
    duplicatedCase.timerType = null; // Sin tipo de timer
    duplicatedCase.timerStartTime = null; // Sin tiempo de inicio
    duplicatedCase.timerEndTime = null; // Sin tiempo de fin
    duplicatedCase.timerDuration = 0; // Sin duración
    duplicatedCase.isTimerActive = false; // Timer inactivo
    
    console.log('🕐 Timers limpiados en escenario duplicado:', duplicatedCase.scenarioNumber);

    // LÓGICA MEJORADA: Detectar si es el último escenario
    const originalScenarioNumber = parseInt(originalCase.scenarioNumber) || 0;
    const isLast = isLastScenario(originalCase.scenarioNumber);

    if (isLast) {
        // CASO 1: Es el último escenario → Crear siguiente + Ciclo 1
        duplicatedCase.scenarioNumber = (originalScenarioNumber + 1).toString();
        duplicatedCase.cycleNumber = '1';

        // Agregar al final (ya es la posición correcta)
        testCases.push(duplicatedCase);

        // Actualizar estadísticas y UI
        updateAppStats();
        renderTestCases();
        updateFilters();
        
        // Actualizar estadísticas del requerimiento
        if (typeof updateMulticaseRequirementStats === 'function' && window.currentRequirement) {
            updateMulticaseRequirementStats(window.currentRequirement);
        }

        //  SINCRONIZAR INMEDIATAMENTE CON MULTICASO

        if (typeof syncScenariosWithCurrentCase === 'function') {
            syncScenariosWithCurrentCase();
        }

        saveToStorage();

        //  NUEVO: Actualizar UI multicaso inmediatamente
        if (typeof autoUpdateMulticaseUI === 'function') {
            autoUpdateMulticaseUI();
        }

        renderTestCases();
        updateStats();
        updateFilters();

        showSuccess(`Escenario ${duplicatedCase.scenarioNumber} (Ciclo 1) creado automáticamente`, 'Escenario creado');
        
        // 🔄 Notificar sincronización en tiempo real
        if (typeof window.RealtimeSync !== 'undefined' && window.RealtimeSync.notifyScenarioUpdated) {
            window.RealtimeSync.notifyScenarioUpdated(duplicatedCase.id, duplicatedCase);
            console.log('🔄 Notificación de sincronización enviada para escenario duplicado:', duplicatedCase.scenarioNumber);
        }
        
        console.log('✅ Duplicación automática completada');
        return;
    }

    // CASO 2: NO es el último → Abrir modal para editar
    // Configurar el modal como edición con los datos duplicados
    currentEditingId = duplicatedCase.id;
    // Guardar datos originales para comparación posterior
    window.originalScenarioForDuplication = originalScenarioNumber;
    window.duplicatedCaseTemp = duplicatedCase; // Guardar temporalmente sin agregar a la lista
    window.isDuplicating = true; // 🎯 MARCAR COMO DUPLICACIÓN

    document.getElementById('modalTitle').textContent = '📋 Duplicar Caso de Prueba';

    // Llenar el formulario con los datos duplicados
    document.getElementById('cycleNumber').value = duplicatedCase.cycleNumber || '';
    document.getElementById('scenarioNumber').value = duplicatedCase.scenarioNumber || '';
    document.getElementById('description').value = duplicatedCase.description || '';
    document.getElementById('obtainedResult').value = duplicatedCase.obtainedResult || '';
    document.getElementById('status').value = duplicatedCase.status || '';
    document.getElementById('executionDate').value = duplicatedCase.executionDate || '';
    document.getElementById('observations').value = duplicatedCase.observations || '';
    document.getElementById('errorNumber').value = duplicatedCase.errorNumber || '';
    document.getElementById('tester').value = duplicatedCase.tester || '';

    // Cargar variables de entrada
    const values = {};
    if (duplicatedCase.inputVariables) {
        duplicatedCase.inputVariables.forEach(v => values[v.name] = v.value);
    }
    renderFixedVariablesInputs(values);

    // Cargar evidencias duplicadas - LIMPIAR EVIDENCIAS
    document.getElementById('evidenceContainer').innerHTML = '';
    // NO cargar evidencias del escenario original - empezar limpio

    // NO agregar a testCases aún - solo guardar temporalmente

    // Abrir el modal
    document.getElementById('testCaseModal').style.display = 'block';

    // Enfocar el campo de número de escenario para fácil edición
    setTimeout(() => {
        document.getElementById('scenarioNumber').focus();
        document.getElementById('scenarioNumber').select();
    }, 100);

    
}

// ===============================================
// ELIMINACIÓN DE CASOS
// ===============================================

// Función para renumeración inteligente por ciclos
function smartRenumberAfterDeletion() {
    // Solo renumerar Ciclo 1 - mantener secuencia 1,2,3,4...
    const cycle1Cases = testCases.filter(tc => tc.cycleNumber === '1')
        .sort((a, b) => parseInt(a.scenarioNumber) - parseInt(b.scenarioNumber));

    cycle1Cases.forEach((tc, index) => {
        tc.scenarioNumber = (index + 1).toString();
    });

    // Ciclo 2+ mantienen sus números originales (no renumerar)
    console.log('✅ Renumeración inteligente completada - Solo Ciclo 1 renumerado');
}

window.deleteTestCase = function (id) {
    console.log('🗑️ Iniciando eliminación de escenario:', id);

    // 🎯 BUSCAR EN testCases GLOBAL (sincronizado con multicaso)
    const deletedCase = testCases.find(tc => tc.id === id);
    if (!deletedCase) {
        console.error('❌ Escenario no encontrado para eliminar:', id);
        console.log('📊 testCases disponibles:', testCases.map(tc => ({ id: tc.id, scenario: tc.scenarioNumber })));
        alert('❌ No se pudo encontrar el caso a eliminar');
        return;
    }

    // Mostrar toast de confirmación SIN auto-ocultado
    const confirmationToast = toastSystem.show(
        '¿Eliminar este escenario de prueba? Esta acción no se puede deshacer.',
        'warning',
        'Confirmar eliminación',
        0  // 0 = NO auto-ocultado
    );
    
    // Crear botones de confirmación
    setTimeout(() => {
        const toasts = document.querySelectorAll('.toast.show');
        const toast = toasts[toasts.length - 1];
        
        if (toast) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin-top: 12px;
                justify-content: flex-end;
            `;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.style.cssText = `
                background: #6c757d;
                color: white;
                border: none;
                padding: 6px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                font-weight: 500;
            `;
            
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Sí, eliminar';
            confirmBtn.style.cssText = `
                background: #f44336;
                color: white;
                border: none;
                padding: 6px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                font-weight: 500;
            `;
            
            confirmBtn.onclick = () => {
                toastSystem.hide(toast);
                console.log('✅ Confirmada eliminación del escenario:', deletedCase.scenarioNumber);

                // Eliminar el caso
                testCases = testCases.filter(tc => tc.id !== id);

                // Aplicar renumeración inteligente
                smartRenumberAfterDeletion();

                // Actualizar estadísticas y UI
                updateAppStats();
                renderTestCases();
                updateFilters();
                
                // Actualizar estadísticas del requerimiento
                if (typeof updateMulticaseRequirementStats === 'function' && window.currentRequirement) {
                    updateMulticaseRequirementStats(window.currentRequirement);
                }

                // 🎯 SINCRONIZAR INMEDIATAMENTE CON MULTICASO
                if (typeof syncScenariosWithCurrentCase === 'function') {
                    syncScenariosWithCurrentCase();
                }

                // Guardar cambios y actualizar la tabla
                saveToStorage();

                // 🎯 NUEVO: Actualizar UI multicaso inmediatamente
                if (typeof autoUpdateMulticaseUI === 'function') {
                    autoUpdateMulticaseUI();
                }

                renderTestCases();
                updateStats();
                updateFilters();

                const cycle = deletedCase.cycleNumber || '1';
                if (cycle === '1') {
                    showSuccess('Escenario eliminado y Ciclo 1 renumerado correctamente', 'Eliminación exitosa');
                } else {
                    showSuccess(`Escenario eliminado (Ciclo ${cycle} mantiene numeración original)`, 'Eliminación exitosa');
                }

                console.log('✅ Eliminación completada correctamente');
                
                // 🔄 Notificar sincronización en tiempo real
                if (typeof window.RealtimeSync !== 'undefined' && window.RealtimeSync.notifyScenarioUpdated) {
                    window.RealtimeSync.notifyScenarioUpdated(deletedCase.id, {
                        ...deletedCase,
                        deleted: true,
                        action: 'deleted'
                    });
                    console.log('🔄 Notificación de eliminación enviada para escenario:', deletedCase.scenarioNumber);
                }
            };
            
            cancelBtn.onclick = () => {
                toastSystem.hide(toast);
            };
            
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            
            const toastContent = toast.querySelector('.toast-content');
            if (toastContent) {
                toastContent.appendChild(buttonContainer);
            }
            
            // Ocultar el botón X del toast
            const closeBtn = toast.querySelector('.toast-close');
            if (closeBtn) {
                closeBtn.style.display = 'none';
            }
        }
    }, 150);
};

// ===============================================
// RENDERIZADO PRINCIPAL DE TABLA
// ===============================================

window.renderTestCases = function () {
    const tbody = document.getElementById('testCasesBody');
    const emptyState = document.getElementById('emptyState');

    // --- ACTUALIZAR THEAD DINÁMICAMENTE ---
    const theadRow = document.querySelector('#testCasesTable thead tr');

    // Verificar si ya existe la columna de checkbox
    if (!theadRow.querySelector('.checkbox-column')) {
        const checkboxTh = document.createElement('th');
        checkboxTh.className = 'checkbox-column';
        checkboxTh.innerHTML = `
            <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()" title="Seleccionar todos">
        `;
        theadRow.insertBefore(checkboxTh, theadRow.firstChild);
    }

    // NUEVA COLUMNA DE DRAG HANDLE
    if (!theadRow.querySelector('.drag-handle-column')) {
        const dragHandleTh = document.createElement('th');
        dragHandleTh.className = 'drag-handle-column';
        dragHandleTh.innerHTML = `⋮⋮`;
        dragHandleTh.title = 'Reordenar escenarios';
        theadRow.insertBefore(dragHandleTh, theadRow.children[1]);
    }

    // Limpiar columnas de variables anteriores
    while (theadRow.children[5] && theadRow.children[5].id === "varsThPlaceholder") {
        theadRow.removeChild(theadRow.children[5]);
    }

    while (theadRow.children[5] && theadRow.children[5].textContent !== "Resultado Esperado") {
        theadRow.removeChild(theadRow.children[5]);
    }

    // Insertar columnas de variables configuradas
    inputVariableNames.forEach(varName => {
        const th = document.createElement('th');
        th.textContent = varName;
        th.style.minWidth = '150px';
        th.style.maxWidth = '150px';
        th.classList.add('variable-column');
        theadRow.insertBefore(th, theadRow.querySelector('.col-resultado-esperado'));
    });

    // 🆕 ACTUALIZAR HEADER DE TIEMPO simplificado
    const tiempoHeader = theadRow.querySelector('.col-tiempo');
    if (tiempoHeader) {
        tiempoHeader.textContent = 'Tiempo (hs)';
        tiempoHeader.style.minWidth = '100px';
        tiempoHeader.style.maxWidth = '100px';
        tiempoHeader.style.textAlign = 'center';
    }

    // --- FIN ACTUALIZAR THEAD ---

    if (filteredCases.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        updateBulkToolbar();
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = filteredCases.map(testCase => {
        const statusClass = testCase.status === 'OK' ? 'status-ok' :
            testCase.status === 'NO' ? 'status-no' :
                (!testCase.status || testCase.status === '' || testCase.status === 'Pendiente') ? 'status-pending' : '';

        const evidenceCount = testCase.evidence ? testCase.evidence.length : 0;
        const isSelected = selectedCases.has(testCase.id);

        // 🆕 TIEMPO SIMPLIFICADO - Solo horas
        const timeHours = parseFloat(testCase.testTime) || 0;

        return `
            <tr class="${statusClass} ${isSelected ? 'row-selected' : ''}" data-case-id="${testCase.id}">
                <!-- Checkbox de selección -->
                <td class="checkbox-column">
                    <div class="checkbox-container">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="toggleCaseSelection(${testCase.id})" 
                               title="Seleccionar caso">
                        ${testCase.bugfixingTimer?.state === 'RUNNING' ? `
                            <span class="bugfixing-indicator" 
                                  title="Timer de bugfixing activo: ${formatBugfixingTime((testCase.bugfixingTimer.accumulated || 0) + (testCase.bugfixingTimer.start ? (Date.now() - new Date(testCase.bugfixingTimer.start).getTime()) / 60000 : 0))}"
                                  id="bugfixing-indicator-${testCase.id}">🐛</span>
                        ` : ''}
                    </div>
                </td>
                
                <!-- NUEVA COLUMNA DE DRAG HANDLE -->
                <td class="drag-handle-column">
                    <div class="drag-handle" 
                         onmousedown="startScenarioDrag(${testCase.id}, event)"
                         title="Arrastar para reordenar Escenario ${testCase.scenarioNumber}">
                        ⋮⋮
                    </div>
                </td>
                
                <!-- Resto de columnas existentes -->
                <td class="col-ciclo">${testCase.cycleNumber || ''}</td>
                <td class="col-escenario">${testCase.scenarioNumber || ''}</td>
                <td class="col-descripcion">${testCase.description || ''}</td>
                
                <!-- Variables dinámicas -->
                ${inputVariableNames.map(varName => {
            const found = (testCase.inputVariables || []).find(v => v.name === varName);
            return `<td class="variable-column" style="min-width: 150px; max-width: 150px;">${found ? found.value : ''}</td>`;
        }).join('')}
        
                <td class="col-resultado-esperado">${testCase.obtainedResult || ''}</td>
                <td>
                    <select onchange="updateStatusAndDate(${testCase.id}, this.value)" style="padding: 4px 8px; border-radius: 12px; font-weight: bold;">
                        <option value="">Pendiente</option>
                        <option value="OK" ${testCase.status === 'OK' ? 'selected' : ''}>OK</option>
                        <option value="NO" ${testCase.status === 'NO' ? 'selected' : ''}>NO</option>
                    </select>
                </td>
               <td class="col-fecha-ejecucion">${formatDateForDisplay(testCase.executionDate) || ''}</td>
                <td class="col-observaciones">${testCase.observations || ''}</td>
                <td class="col-error">${testCase.errorNumber || ''}</td>
                <td class="col-tester">${testCase.tester || ''}</td>
                
                <!-- 🆕 COLUMNA DE TIEMPO SIMPLIFICADA -->
                <td class="col-tiempo" style="text-align: center;">
                    <input type="number" min="0" step="0.25" value="${timeHours.toFixed(2)}" 
                        style="width: 70px; text-align: center; font-weight: bold;" 
                        onchange="updateManualTime(${testCase.id}, this.value)"
                        title="Tiempo en horas (ej: 1.5 = 1 hora 30 min)">
                </td>
                
                <td class="col-evidencias">${evidenceCount > 0 ?
                `<a href="#" onclick="viewEvidence(${testCase.id}); return false;" style="color: #3498db; text-decoration: underline; cursor: pointer;">🔎 ${evidenceCount} archivos</a>` :
                'Sin evidencias'}</td>
                
                <td class="action-buttons">
                    <button class="btn btn-info btn-small" onclick="openEditModal(${testCase.id})" title="Editar Escenario">✏️</button>
                    <button class="btn btn-success btn-small" onclick="duplicateTestCase(${testCase.id})" title="Duplicar Escenario">📋</button>
                    <button class="btn btn-danger btn-small" onclick="deleteTestCase(${testCase.id})" title="Borrar Escenario">🗑️</button>
                    <button class="btn ${activeTimerId === testCase.id ? 'btn-danger' : 'btn-info'} btn-small" 
                            onclick="toggleRowTimer(${testCase.id})" 
                            id="timerBtn-${testCase.id}" 
                            title="${activeTimerId === testCase.id ? 'Detener cronómetro' : 'Iniciar cronómetro'}">
                        ${activeTimerId === testCase.id ? '⏹️' : '⏱️'}
                    </button>
                    ${testCase.status === 'NO' || testCase.bugfixingTimer?.state === 'RUNNING' ? `
                    <button class="btn ${testCase.bugfixingTimer?.state === 'RUNNING' ? 'btn-danger' : 'btn-warning'} btn-small" 
                            onclick="${testCase.bugfixingTimer?.state === 'RUNNING' ? 'stopBugfixingTimer' : 'startBugfixingTimer'}(${testCase.id})" 
                            id="bugfixingBtn-${testCase.id}" 
                            title="${testCase.bugfixingTimer?.state === 'RUNNING' ? 'Detener bugfixing' : 'Iniciar bugfixing'}">
                        ${testCase.bugfixingTimer?.state === 'RUNNING' ? '⏹️' : '🐛'}
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');

    // Solo actualizar si hay casos y no estamos ya en el proceso de actualizar filtros
    if (filteredCases.length > 0 && !window.updatingFilters) {
        setTimeout(() => {
            window.updatingFilters = true;
            if (typeof updateFilters === 'function') {
                // Extraer testers únicos de testCases actual
                const testers = [...new Set(testCases.map(tc => tc.tester).filter(t => t && t.trim() !== ''))];
                if (testers.length > 0) {
                    updateFilters();
                    // console.log('✅ Filtros actualizados después de renderizar casos');
                }
            }
            window.updatingFilters = false;
        }, 200);
    }

    // Actualizar checkbox "Select All"
    updateSelectAllCheckbox();

    // Reinicializar drag scroll (mantener funcionalidad existente)
    reinitializeDragScroll();
}

// ===============================================
// FILTROS Y BÚSQUEDA
// ===============================================

window.applyFilters = function () {
    try {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) {
            return;
        }
        
        const search = searchInput.value.toLowerCase();
        const testerFilter = document.getElementById('testerFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFrom = document.getElementById('dateFromFilter').value;
        const dateTo = document.getElementById('dateToFilter').value;
    
        // NUEVA lógica para casos ocultos
        const showHidden = document.getElementById('showHiddenToggle') ?
            document.getElementById('showHiddenToggle').checked : false;

        filteredCases = testCases.filter(testCase => {
        // NUEVA condición: filtrar ocultos a menos que esté activado el toggle
        if (!showHidden && testCase.hidden === true) {
            return false;
        }

        // Resto de filtros existentes (MANTENER SIN CAMBIOS)
        const matchesSearch = !search ||
            (testCase.description && testCase.description.toLowerCase().includes(search)) ||
            (testCase.tester && testCase.tester.toLowerCase().includes(search)) ||
            (testCase.scenarioNumber && testCase.scenarioNumber.toLowerCase().includes(search)) ||
            (testCase.observations && testCase.observations.toLowerCase().includes(search));

        const matchesTester = !testerFilter || testCase.tester === testerFilter;
        const matchesStatus = !statusFilter ||
            (statusFilter === "Pendiente" ? (!testCase.status || testCase.status === "") : testCase.status === statusFilter);

        let matchesDateRange = true;
        if (dateFrom || dateTo) {
            const testDate = testCase.executionDate ? new Date(testCase.executionDate) : null;
            if (testDate) {
                if (dateFrom) {
                    matchesDateRange = matchesDateRange && testDate >= new Date(dateFrom);
                }
                if (dateTo) {
                    matchesDateRange = matchesDateRange && testDate <= new Date(dateTo + 'T23:59:59');
                }
            }
        }

            return matchesSearch && matchesTester && matchesStatus && matchesDateRange;
        });

        renderTestCases();
        updateStatsWithHidden(); // Usar la nueva función que incluye ocultos
        
    } catch (error) {
        console.error('❌ Error en applyFilters:', error);
    }
}

window.updateFilters = function () {
    // Evitar loops infinitos
    if (window.updatingFilters) return;

    // console.log('🔄 Actualizando filtros...');

    // 🎯 SINCRONIZAR PRIMERO CON MULTICASO SI ES NECESARIO
    if (typeof syncScenariosWithCurrentCase === 'function') {
        syncScenariosWithCurrentCase();
    }

    // Actualizar filtro de testers
    const testerFilter = document.getElementById('testerFilter');
    if (!testerFilter) {
        console.warn('⚠️ No se encontró elemento testerFilter');
        return;
    }

    const currentTester = testerFilter.value;

    // 🎯 OBTENER TESTERS DE testCases (sincronizado con multicaso)
    const testers = [...new Set(testCases.map(tc => tc.tester).filter(t => t && t.trim() !== ''))];

    // console.log('📊 Testers encontrados:', testers);

    testerFilter.innerHTML = '<option value="">Todos</option>';
    testers.forEach(tester => {
        const option = document.createElement('option');
        option.value = tester;
        option.textContent = tester;
        if (tester === currentTester) option.selected = true;
        testerFilter.appendChild(option);
    });

    // Aplicar filtros iniciales
    filteredCases = [...testCases];
    applyFilters();

    // console.log('✅ Filtros actualizados - Testers disponibles:', testers.length);
}

// ===============================================
// FUNCIONES DE TIEMPO
// ===============================================

window.updateManualTime = function(scenarioId, newTime) {
    const testCase = testCases.find(tc => tc.id === scenarioId);
    if (testCase) {
        testCase.testTime = parseFloat(newTime) || 0;
        
        // Guardar cambios
        if (typeof saveMulticaseData === 'function') {
            saveMulticaseData();
        } else {
            saveToStorage();
        }
        
        // Actualizar estadísticas y UI
        updateAppStats();
        renderTestCases();
        
        // Actualizar estadísticas del requerimiento
        if (typeof updateMulticaseRequirementStats === 'function' && window.currentRequirement) {
            updateMulticaseRequirementStats(window.currentRequirement);
        }
        
        console.log(`⏱️ Tiempo actualizado para escenario ${testCase.scenarioNumber}: ${newTime}h`);
    }
};

// ===============================================
// ESTADÍSTICAS
// ===============================================

window.updateAppStats = function () {
    // Usar testCases directamente para estadísticas más precisas
    const total = testCases.length;
    const okCases = testCases.filter(tc => tc.status === 'OK').length;
    const noCases = testCases.filter(tc => tc.status === 'NO').length;
    const successRate = total > 0 ? Math.round((okCases / total) * 100) : 0;

    // Actualizar elementos del DOM
    const totalCasesEl = document.getElementById('totalCases');
    const okCasesEl = document.getElementById('okCases');
    const noCasesEl = document.getElementById('noCases');
    const successRateEl = document.getElementById('successRate');

    if (totalCasesEl) totalCasesEl.textContent = total;
    if (okCasesEl) okCasesEl.textContent = okCases;
    if (noCasesEl) noCasesEl.textContent = noCases;
    if (successRateEl) successRateEl.textContent = successRate + '%';

    // 🆕 AGREGAR SOLO UNA STAT DE TIEMPO TOTAL
    addTotalTimeStatsCard();
}

// Agregar solo una tarjeta de tiempo total
function addTotalTimeStatsCard() {
    const statsContainer = document.getElementById('statsContainer');

    // Verificar si ya existe la tarjeta de tiempo
    const existingTimeCard = document.getElementById('totalTimeCard');
    if (existingTimeCard) existingTimeCard.remove();

    // Limpiar tarjetas antiguas de cuantización si existen
    const oldQuantizedCard = document.getElementById('quantizedTimeCard');
    const oldTimeStatsCard = document.getElementById('timeStatsCard');
    if (oldQuantizedCard) oldQuantizedCard.remove();
    if (oldTimeStatsCard) oldTimeStatsCard.remove();

    // Obtener estadísticas de tiempo
    const timeStats = getTimeStatistics();

    if (timeStats.casesWithTime > 0) {
        // Tarjeta de tiempo total (única)
        const timeCard = document.createElement('div');
        timeCard.id = 'totalTimeCard';
        timeCard.className = 'stat-card';
        timeCard.innerHTML = `
            <div class="stat-number">${timeStats.totalHours.toFixed(1)}h</div>
            <div class="stat-label">Tiempo Total</div>
        `;
        timeCard.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        timeCard.title = `${timeStats.totalHours.toFixed(2)} horas en ${timeStats.casesWithTime} casos\nPromedio: ${timeStats.averageTimePerCase.toFixed(2)}h por caso\nClick para ver detalles`;
        timeCard.style.cursor = 'pointer';
        timeCard.onclick = () => showTimeInfo();

        // Agregar ícono
        timeCard.style.position = 'relative';
        timeCard.style.overflow = 'hidden';

        const icon = document.createElement('div');
        icon.innerHTML = '⏱️';
        icon.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 1.2em;
            opacity: 0.7;
        `;
        timeCard.appendChild(icon);

        statsContainer.appendChild(timeCard);
    }
}

// Función para obtener contador de casos ocultos
function getHiddenCasesCount() {
    return testCases.filter(tc => tc.hidden === true).length;
}

// Función para mostrar todos los casos ocultos
window.showAllHiddenCases = function () {
    const hiddenCount = getHiddenCasesCount();
    if (hiddenCount === 0) {
        alert('No hay escenarios ocultos para mostrar');
        return;
    }

    const message = `👁️ ¿Deseas mostrar todos los ${hiddenCount} escenarios ocultos?\n\nVolverán a aparecer en la lista principal.`;

    if (!confirm(message)) return;

    // Quitar marca de oculto a todos los casos
    testCases.forEach(tc => {
        if (tc.hidden === true) {
            tc.hidden = false;
        }
    });

    // Actualizar interfaz
    saveToStorage();
    applyFilters();
    updateStats();

    alert(`✅ ${hiddenCount} escenarios mostrados correctamente`);
}

// EXTENSIÓN de la función updateStats existente
function updateStatsWithHidden() {
    // Llamar a la función updateStats original primero
    updateStats();

    // Agregar contador de ocultos
    const hiddenCount = getHiddenCasesCount();
    let hiddenStatsElement = document.getElementById('hiddenCases');

    if (hiddenCount > 0) {
        if (!hiddenStatsElement) {
            // Crear nueva tarjeta de stats para casos ocultos
            const statsContainer = document.getElementById('statsContainer');
            const hiddenCard = document.createElement('div');
            hiddenCard.className = 'stat-card stat-card-hidden';
            hiddenCard.id = 'hiddenCasesCard';
            hiddenCard.innerHTML = `
                <div class="stat-number" id="hiddenCases">${hiddenCount}</div>
                <div class="stat-label">Casos Ocultos</div>
            `;
            hiddenCard.onclick = showAllHiddenCases;
            hiddenCard.style.cursor = 'pointer';
            hiddenCard.title = 'Click para mostrar todos los escenarios ocultos';
            statsContainer.appendChild(hiddenCard);
        } else {
            hiddenStatsElement.textContent = hiddenCount;
        }
    } else {
        // Remover tarjeta si no hay casos ocultos
        const hiddenCard = document.getElementById('hiddenCasesCard');
        if (hiddenCard) {
            hiddenCard.remove();
        }
    }
}

// Función para mostrar/ocultar casos ocultos (toggle)
window.toggleShowHidden = function () {
    // Aplicar filtros existentes (que ahora incluirán la lógica de ocultos)
    applyFilters();
}

// ===============================================
// ACTUALIZACIÓN DE ESTADO Y FECHA
// ===============================================

// Función formatDateForDisplay movida a utils.js

// Función formatDateForStorage movida a utils.js


// Funcion para actualizar la fecha al cambiar el resultado obtenido
// Función para actualizar la fecha al cambiar el resultado obtenido - CORREGIDA
// Función para actualizar la fecha al cambiar el resultado obtenido - CON UI
window.updateStatusAndDate = function (id, value) {
    console.log('🔄 Actualizando estado del escenario:', { id, value });

    const testCase = testCases.find(tc => tc.id === id);
    if (testCase) {
        // Actualizar el estado
        testCase.status = value;

        /* console.log('✅ Estado actualizado en testCases:', {
            id: testCase.id,
            scenario: testCase.scenarioNumber,
            cycle: testCase.cycleNumber,
            newStatus: value
        }); */

        // Si no hay fecha y el status es OK o NO, poner la fecha de hoy
        if (!testCase.executionDate && (value === 'OK' || value === 'NO')) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            testCase.executionDate = `${yyyy}-${mm}-${dd}`;
            console.log('📅 Fecha de ejecución establecida:', testCase.executionDate);
        }

        // 🎯 CRÍTICO: Sincronizar INMEDIATAMENTE con multicaso
        if (typeof syncScenariosWithCurrentCase === 'function') {
            
            syncScenariosWithCurrentCase();
        }

        // 🎯 CRÍTICO: Actualizar botones de bugfixing cuando cambie el estado
        if (typeof updateAllBugfixingButtons === 'function') {
            updateAllBugfixingButtons();
        }
        
        // 🎯 CRÍTICO: Actualizar estadísticas de la UI
        // Actualizar estadísticas de la UI
        window.updateAppStats();
        applyFilters();
        
        // Actualizar estadísticas del requerimiento
        if (typeof updateMulticaseRequirementStats === 'function' && window.currentRequirement) {
            updateMulticaseRequirementStats(window.currentRequirement);
        }
        
        // 🎯 CRÍTICO: Sincronizar con dashboard después de modificar escenario
        /* console.log('🔍 DEBUG updateStatusAndDate - Verificando sincronización...');
        console.log('🔍 DEBUG updateStatusAndDate - syncOnScenarioModified disponible:', typeof syncOnScenarioModified);
        console.log('🔍 DEBUG updateStatusAndDate - window.syncOnScenarioModified disponible:', typeof window.syncOnScenarioModified); */
        
        if (typeof syncOnScenarioModified === 'function') {
            console.log('🔄 Sincronizando escenario modificado con dashboard...');
            syncOnScenarioModified(testCase);
        } else if (typeof window.syncOnScenarioModified === 'function') {
            console.log('🔄 Sincronizando escenario modificado con dashboard (window)...');
            window.syncOnScenarioModified(testCase);
        } else {
            console.warn('⚠️ syncOnScenarioModified no está disponible');
        }

        // Guardar en sistema tradicional
        saveToStorage();
        
        // 🔄 Notificar sincronización en tiempo real
        if (typeof window.RealtimeSync !== 'undefined' && window.RealtimeSync.notifyScenarioUpdated) {
            window.RealtimeSync.notifyScenarioUpdated(testCase.id, testCase);
        }

        // 🎯 NUEVO: Actualizar UI multicaso inmediatamente
        if (typeof autoUpdateMulticaseUI === 'function') {
            autoUpdateMulticaseUI();
        }

        // Actualizar estadísticas inmediatamente
        window.updateAppStats();
        
        // Renderizar tabla inmediatamente para ver cambios
        renderTestCases();

        // Actualizar filtros si es necesario
        applyFilters();

        

    } else {
        console.error('❌ No se encontró el escenario para actualizar:', id);
        
    }
}

// Inicialización adicional para casos existentes (migración segura)
function initializeHiddenFunctionality() {
    // Asegurar que casos existentes tengan la propiedad hidden
    testCases.forEach(tc => {
        if (tc.hidden === undefined) {
            tc.hidden = false; // Por defecto NO oculto
        }
    });

    // Actualizar stats con la nueva funcionalidad
    updateStatsWithHidden();
}

// Llamar inicialización cuando cargue la página
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initializeHiddenFunctionality, 1000); // Después de que todo se cargue
});

// ===============================================
// FUNCIONES GLOBALES ADICIONALES - EXPOSICIÓN CRÍTICA
// ===============================================

// Exponer funciones globalmente (CRÍTICO para funcionalidad)
window.switchTab = switchTab;
window.updateDevButtons = updateDevButtons;
window.updateRequirementDisplay = updateRequirementDisplay;
window.reinitializeDragScroll = reinitializeDragScrollFunction;

// ✅ NUEVAS EXPOSICIONES CRÍTICAS PARA CRUD
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.deleteTestCase = deleteTestCase;
window.duplicateTestCase = duplicateTestCase;
window.viewEvidence = viewEvidence;
window.renderTestCases = renderTestCases;
window.applyFilters = applyFilters;
window.updateFilters = updateFilters;
window.updateAppStats = updateAppStats;
window.updateStatusAndDate = updateStatusAndDate;
window.handleEvidenceUpload = handleEvidenceUpload;
window.addEvidenceToContainer = addEvidenceToContainer;
window.zoomEvidenceImage = zoomEvidenceImage;
window.removeVarName = removeVarName;
window.formatDateForDisplay = formatDateForDisplay;
window.updateManualTime = updateManualTime;

// DEBUG: Verificar que las funciones estén disponibles
// console.log('🔍 DEBUG cases.js cargado:');
// console.log('🔍 renderTestCases disponible:', typeof window.renderTestCases);
// console.log('🔍 updateAppStats disponible:', typeof window.updateAppStats);
// console.log('🔍 updateFilters disponible:', typeof window.updateFilters);
// console.log('🔍 updateManualTime disponible:', typeof window.updateManualTime);

// ✅ FUNCIONES CRÍTICAS PARA DUPLICACIÓN
window.insertCaseInCorrectPosition = insertCaseInCorrectPosition;
window.renumberScenariosAfter = renumberScenariosAfter;

// ✅ FUNCIONES PARA BUGFIXING
window.updateAllBugfixingButtons = function() {
    // Actualizar todos los botones de bugfixing en la tabla
    testCases.forEach(tc => {
        const btn = document.getElementById(`bugfixingBtn-${tc.id}`);
        const bugfixingTimer = tc.bugfixingTimer || { state: 'PAUSED', accumulated: 0 };
        
        // Solo mostrar botón si el estado es NO o si hay un timer corriendo
        const shouldShowButton = tc.status === 'NO' || bugfixingTimer.state === 'RUNNING';
        
        if (btn) {
            if (shouldShowButton) {
                // Mostrar botón
                btn.style.display = 'inline-block';
                
                if (bugfixingTimer.state === 'RUNNING') {
                    btn.innerHTML = '⏹️';
                    btn.title = 'Detener bugfixing';
                    btn.className = 'btn btn-danger btn-small';
                    btn.onclick = () => stopBugfixingTimer(tc.id);
                } else {
                    btn.innerHTML = '🐛';
                    btn.title = 'Iniciar bugfixing';
                    btn.className = 'btn btn-warning btn-small';
                    btn.onclick = () => startBugfixingTimer(tc.id);
                }
            } else {
                // Ocultar botón
                btn.style.display = 'none';
            }
        }
        
        // 🆕 ACTUALIZAR INDICADOR VISUAL AL LADO DEL CHECKBOX
        const indicator = document.getElementById(`bugfixing-indicator-${tc.id}`);
        
        if (bugfixingTimer.state === 'RUNNING') {
            // Mostrar indicador si no existe
            if (!indicator) {
                const checkboxContainer = document.querySelector(`tr[data-case-id="${tc.id}"] .checkbox-container`);
                if (checkboxContainer) {
                    const currentTime = (bugfixingTimer.accumulated || 0) + (bugfixingTimer.start ? (Date.now() - new Date(bugfixingTimer.start).getTime()) / 60000 : 0);
                    const indicatorHTML = `
                        <span class="bugfixing-indicator" 
                              title="Timer de bugfixing activo: ${formatBugfixingTime(currentTime)}"
                              id="bugfixing-indicator-${tc.id}">🐛</span>
                    `;
                    checkboxContainer.insertAdjacentHTML('beforeend', indicatorHTML);
                }
            } else {
                // Actualizar tooltip con tiempo actual
                const currentTime = (bugfixingTimer.accumulated || 0) + (bugfixingTimer.start ? (Date.now() - new Date(bugfixingTimer.start).getTime()) / 60000 : 0);
                indicator.title = `Timer de bugfixing activo: ${formatBugfixingTime(currentTime)}`;
            }
        } else {
            // Ocultar indicador si existe
            if (indicator) {
                indicator.remove();
            }
        }
    });
};





