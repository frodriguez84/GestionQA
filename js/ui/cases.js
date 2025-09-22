// ===============================================
// SCRIPT-CASES.JS - CRUD Casos + Filtros + Renderizado + Bug Tracking
// Versión: 20250113d - Sistema de tracking de bugs corregido (sin columna tiempo)
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
    try {
        console.log('🔄 Abriendo modal de agregar caso...');
        
        currentEditingId = null;
        document.getElementById('modalTitle').textContent = 'Nuevo Escenario de Prueba';
        document.getElementById('testCaseForm').reset();

        document.getElementById('fixedVariablesContainer').innerHTML = '';
        document.getElementById('evidenceContainer').innerHTML = '';

        renderFixedVariablesInputs();

        // Sugerir Ciclo = 1
        document.getElementById('cycleNumber').value = '1';

        // Sugerir N° Escenario = último + 1
        let lastScenario = 0;
        if (window.testCases && window.testCases.length > 0) {
            // Buscar el mayor número de escenario existente
            lastScenario = Math.max(...window.testCases.map(tc => parseInt(tc.scenarioNumber) || 0));
        }
        document.getElementById('scenarioNumber').value = (lastScenario + 1).toString();

        // Resetear cronómetro
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        document.getElementById('testCaseModal').style.display = 'block';
        
        // 🆕 MARCAR COMO DUPLICACIÓN PENDIENTE - SIMPLIFICADO
        window.isDuplicating = true;
        window.duplicatedCaseTemp = null;
        
        // 🚨 CRÍTICO: Reconfigurar event listeners del modal después de abrirlo
        setTimeout(() => {
            console.log('🔄 Reconfigurando event listeners del modal...');
            if (typeof setupModalEventListeners === 'function') {
                setupModalEventListeners();
            }
        }, 100);
        
        console.log('✅ Modal de agregar caso abierto correctamente');
        
    } catch (error) {
        console.error('❌ Error abriendo modal de agregar caso:', error);
        showError('Error abriendo el modal. Intenta recargar la página.', 'Error');
    }
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

    document.getElementById('modalTitle').textContent = 'Editar Escenario de Prueba';

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

    // Migrar evidencias embebidas a referencias (IndexedDB/localStorage) y luego cargar al modal
    document.getElementById('evidenceContainer').innerHTML = '';
    (async () => {
        try {
            await migrateScenarioEvidences(testCase);
        } catch (e) {
            console.warn('⚠️ Migración de evidencias fallida (se continúa con embebidas):', e);
        }
        if (testCase.evidence) {
            const loadEvidence = async (ev) => {
                try {
                    if (ev && ev.id && window.EvidenceStorage && typeof window.EvidenceStorage.getEvidence === 'function') {
                        const rec = await window.EvidenceStorage.getEvidence(ev.id);
                        if (rec) {
                            addEvidenceToContainer(rec.name, rec.data, rec.mime);
                            return;
                        }
                    }
                    addEvidenceToContainer(ev.name, ev.data, ev.mime);
                } catch (e) {
                    console.warn('⚠️ No se pudo cargar evidencia', e);
                    addEvidenceToContainer(ev.name, ev.data, ev.mime);
                }
            };
            await Promise.all((testCase.evidence || []).map(ev => loadEvidence(ev)));
        }
    })();

    document.getElementById('testCaseModal').style.display = 'block';

    console.log('✅ Modal de edición abierto correctamente');
}
// Migración perezosa de evidencias embebidas → referencias
async function migrateScenarioEvidences(testCase) {
    if (!testCase || !Array.isArray(testCase.evidence) || testCase.evidence.length === 0) return;
    if (!window.EvidenceStorage || typeof window.EvidenceStorage.saveEvidence !== 'function') return;

    let mutated = false;
    const newList = [];
    for (const ev of testCase.evidence) {
        // Si ya es referencia (tiene id y no tiene data embebida convincente), conservar
        const hasId = !!ev.id;
        const hasDataUrl = typeof ev.data === 'string' && ev.data.startsWith('data:');
        if (hasId && !hasDataUrl) {
            newList.push(ev);
            continue;
        }
        // Guardar embebida como registro y reemplazar por referencia
        try {
            const saved = await window.EvidenceStorage.saveEvidence(ev.name || 'archivo', ev.mime || '', ev.data || '');
            newList.push({ id: saved.id, name: saved.name, mime: saved.mime });
            mutated = true;
        } catch (e) {
            console.warn('⚠️ No se pudo migrar evidencia embebida, se conserva embebida:', e);
            newList.push(ev);
        }
    }
    if (mutated) {
        testCase.evidence = newList;
        // Persistir el cambio en memoria y storage
        if (typeof saveMulticaseData === 'function') saveMulticaseData();
        else if (typeof saveToStorage === 'function') saveToStorage();
    }
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

window.openEvidenceFile = async function (dataUrlOrId, name, mime) {
    try {
        let dataUrl = dataUrlOrId;
        // Si vino una referencia (id), resolver
        if (dataUrl && typeof dataUrl === 'string' && !dataUrl.startsWith('data:') && window.EvidenceStorage && typeof window.EvidenceStorage.getEvidence === 'function') {
            const rec = await window.EvidenceStorage.getEvidence(dataUrl);
            if (rec) {
                name = rec.name || name;
                mime = rec.mime || mime;
                dataUrl = rec.data || '';
            }
        }

        mime = mime || (dataUrl && dataUrl.match(/^data:([^;]+);/)?.[1] || '');
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

function __rowHtmlFromTestCase(testCase) {
    const statusClass = testCase.status === 'OK' ? 'status-ok' :
        testCase.status === 'NO' ? 'status-no' :
            (!testCase.status || testCase.status === '' || testCase.status === 'Pendiente') ? 'status-pending' : '';
    const evidenceCount = testCase.evidence ? testCase.evidence.length : 0;
    const isSelected = selectedCases.has(testCase.id);
    const timeHours = parseFloat(testCase.testTime) || 0;
    const varsHtml = (inputVariableNames || []).map(varName => {
        const found = (testCase.inputVariables || []).find(v => v.name === varName);
        return `<td class="variable-column" style="min-width: 150px; max-width: 150px;">${escapeHtml(found ? found.value : '')}</td>`;
    }).join('');
    return `
        <tr class="${statusClass} ${isSelected ? 'row-selected' : ''}" data-case-id="${testCase.id}">
            <td class="checkbox-column">
                <div class="checkbox-container">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="toggleCaseSelection(${testCase.id})" 
                           title="Seleccionar caso">
                </div>
            </td>
            <td class="drag-handle-column">
                <div class="drag-handle" 
                     onmousedown="startScenarioDrag(${testCase.id}, event)"
                     title="Arrastar para reordenar Escenario ${testCase.scenarioNumber}">⋮⋮</div>
            </td>
            <td class="col-ciclo">${testCase.cycleNumber || ''}</td>
            <td class="col-escenario">${testCase.scenarioNumber || ''}</td>
            <td class="col-descripcion">${escapeHtml(testCase.description || '')}</td>
            ${varsHtml}
            <td class="col-resultado-esperado">${escapeHtml(testCase.obtainedResult || '')}</td>
            <td>
                <select onchange="updateStatusAndDate(${testCase.id}, this.value)" style="padding: 4px 8px; border-radius: 12px; font-weight: bold;">
                    <option value="">Pendiente</option>
                    <option value="OK" ${testCase.status === 'OK' ? 'selected' : ''}>OK</option>
                    <option value="NO" ${testCase.status === 'NO' ? 'selected' : ''}>NO</option>
                </select>
            </td>
            <td class="col-fecha-ejecucion">${formatDateForDisplay(testCase.executionDate) || ''}</td>
            <td class="col-observaciones">${escapeHtml(testCase.observations || '')}</td>
            <td class="col-error">${escapeHtml(testCase.errorNumber || '')}</td>
            <td class="col-tester">${escapeHtml(testCase.tester || '')}</td>
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
                ${testCase.status === 'NO' ? `
                <button class="btn ${testCase.hasBug ? 
                    (testCase.bugState === 'bug_reported' ? 'btn-info' : 
                     testCase.bugState === 'bug_returned' ? 'btn-warning' : 
                     testCase.bugState === 'bug_fixed' ? 'btn-success' : 'btn-warning') : 'btn-warning'} btn-small" 
                        onclick="markBug(${testCase.id})" 
                        id="markBugBtn-${testCase.id}" 
                        title="${testCase.hasBug ? 
                            (testCase.bugState === 'bug_reported' ? 'Bug reportado a desarrollo' : 
                             testCase.bugState === 'bug_returned' ? 'Bug devuelto por desarrollo' : 
                             testCase.bugState === 'bug_fixed' ? 'Bug arreglado' : 'Marcar escenario con bug') : 'Marcar escenario con bug'}">
                    ${testCase.hasBug ? 
                        (testCase.bugState === 'bug_reported' ? '📤 Reportado' : 
                         testCase.bugState === 'bug_returned' ? '🔄 Devuelto' : 
                         testCase.bugState === 'bug_fixed' ? '✅ Arreglado' : '🐛 Marcar Bug') : '🐛 Marcar Bug'}
                </button>
                ` : ''}
            </td>
        </tr>
    `;
}

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

    // Render progresivo para listas grandes para evitar bloqueos
    const total = filteredCases.length;
    const CHUNK = 150;
    const useProgressive = total > CHUNK;
    if (!useProgressive) {
        tbody.innerHTML = filteredCases.map(__rowHtmlFromTestCase).join('');
    } else {
        tbody.innerHTML = '';
        let index = 0;
        const schedule = window.requestIdleCallback || function(cb){ return setTimeout(() => cb({didTimeout:false,timeRemaining:() => 0}), 0); };
        const appendChunk = () => {
            const frag = document.createDocumentFragment();
            const end = Math.min(index + CHUNK, total);
            let html = '';
            for (let i = index; i < end; i++) html += __rowHtmlFromTestCase(filteredCases[i]);
            const temp = document.createElement('tbody');
            temp.innerHTML = html;
            while (temp.firstChild) frag.appendChild(temp.firstChild);
            tbody.appendChild(frag);
            index = end;
            if (index < total) schedule(appendChunk);
        };
        schedule(appendChunk);
    }

    // Solo actualizar si no estamos ya en proceso de actualizar filtros
    if (!window.updatingFilters) {
        setTimeout(() => {
            window.updatingFilters = true;
            if (typeof updateFilters === 'function') {
                // Extraer testers únicos de testCases actual
                updateFilters();
                // console.log('✅ Filtros actualizados después de renderizar casos');
            }
            window.updatingFilters = false;
        }, 200);
    }

    // Actualizar checkbox "Select All"
    updateSelectAllCheckbox();

    // Reinicializar drag scroll (mantener funcionalidad existente)
    reinitializeDragScroll();
    
    // 🆕 RECALCULAR CONTADORES DE BUGS AL CARGAR DATOS (solo una vez)
    if (typeof window.recalculateBugCounters === 'function' && !window.bugCountersInitialized) {
        setTimeout(() => {
            window.recalculateBugCounters();
            window.bugCountersInitialized = true;
        }, 100);
    }
}

// ===============================================
// FILTROS Y BÚSQUEDA
// ===============================================

window.applyFilters = function () {
    try {
        const searchInputEl = document.getElementById('searchInput');
        const search = (searchInputEl ? searchInputEl.value : '').toLowerCase();
        const testerFilterEl = document.getElementById('testerFilter');
        const statusFilterEl = document.getElementById('statusFilter');
        const dateFromEl = document.getElementById('dateFromFilter');
        const dateToEl = document.getElementById('dateToFilter');

        const testerFilter = testerFilterEl ? (testerFilterEl.value || '') : '';
        const statusFilter = statusFilterEl ? (statusFilterEl.value || '') : '';
        const dateFrom = dateFromEl ? (dateFromEl.value || '') : '';
        const dateTo = dateToEl ? (dateToEl.value || '') : '';
    
        // NUEVA lógica para casos ocultos
        const showHiddenToggleEl = document.getElementById('showHiddenToggle');
        const showHidden = showHiddenToggleEl ? showHiddenToggleEl.checked : false;

        filteredCases = testCases.filter(testCase => {
        // NUEVA condición: filtrar ocultos a menos que esté activado el toggle
        if (!showHidden && testCase.hidden === true) {
            return false;
        }

        // Resto de filtros existentes (MANTENER SIN CAMBIOS)
        const matchesSearch = !search ||
            (typeof testCase.description === 'string' && testCase.description.toLowerCase().includes(search)) ||
            (typeof testCase.tester === 'string' && testCase.tester.toLowerCase().includes(search)) ||
            (testCase.scenarioNumber !== undefined && String(testCase.scenarioNumber).toLowerCase().includes(search)) ||
            (typeof testCase.observations === 'string' && testCase.observations.toLowerCase().includes(search));

        const matchesTester = !testerFilter || ((testCase.tester || '').trim() === testerFilter.trim());
        const matchesStatus = !statusFilter || ((testCase.status || '') === statusFilter);

        let matchesDateRange = true;
        if (dateFrom || dateTo) {
            const raw = testCase.executionDate || testCase.date || testCase.fecha || null;
            const testDate = raw ? new Date(raw) : null;
            if (!testDate || isNaN(testDate.getTime())) {
                // Si el caso no tiene fecha válida y se está filtrando por fechas, no coincide
                matchesDateRange = false;
            } else {
                if (dateFrom) {
                    const from = new Date(dateFrom + 'T00:00:00');
                    if (testDate < from) matchesDateRange = false;
                }
                if (matchesDateRange && dateTo) {
                    const to = new Date(dateTo + 'T23:59:59');
                    if (testDate > to) matchesDateRange = false;
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

// Referencia fuerte para evitar pérdida de función tras navegación
window.__filtersReady = true;
window.__applyFiltersRef = window.applyFilters;

window.updateFilters = function () {
    // Evitar loops infinitos
    if (window.updatingFilters) return;

    // console.log('🔄 Actualizando filtros...');

    // 🎯 SINCRONIZAR PRIMERO CON MULTICASO SI ES NECESARIO
    if (typeof syncScenariosWithCurrentCase === 'function') {
        syncScenariosWithCurrentCase();
    }

    // Actualizar filtro de testers
    const testerFilterEl = document.getElementById('testerFilter');
    if (testerFilterEl) {
        const currentTester = testerFilterEl.value || '';
        const testers = [...new Set(testCases.map(tc => (tc.tester || '').trim()).filter(t => t !== ''))].sort((a,b)=>a.localeCompare(b));
        const prev = currentTester.trim();
        testerFilterEl.innerHTML = '<option value="">Todos</option>' + testers.map(t => `<option value="${t}">${t}</option>`).join('');
        if (prev && testers.includes(prev)) testerFilterEl.value = prev; else testerFilterEl.value = '';
    }

    // Mantener filteredCases estable: aplicar filtros actuales si existen
    if (typeof applyFilters === 'function') {
        applyFilters();
    } else {
        filteredCases = [...testCases];
    }

    // console.log('✅ Filtros actualizados - Testers disponibles:', testers.length);
}

// Asegura que los filtros existan en el DOM y aplica/actualiza cuando estén listos
window.ensureFiltersReady = function(maxTries = 10, delayMs = 150) {
    console.log('🔍 ensureFiltersReady: iniciando...');
    let tries = 0;
    const tick = () => {
        tries++;
        const hasDom = document.getElementById('testerFilter') && document.getElementById('statusFilter') && document.getElementById('searchInput');
        const hasData = Array.isArray(window.testCases || testCases) && (window.testCases || testCases).length >= 0; // puede ser 0
        console.log(`🔍 ensureFiltersReady: intento ${tries}/${maxTries}`, {
            hasDom,
            hasData,
            testCasesLen: (window.testCases || testCases || []).length,
            testerEl: !!document.getElementById('testerFilter'),
            statusEl: !!document.getElementById('statusFilter'),
            searchEl: !!document.getElementById('searchInput')
        });
        if (hasDom && hasData) {
            try {
                if (typeof window.updateFilters === 'function') window.updateFilters();
                if (typeof window.applyFilters === 'function') window.applyFilters();
                // Guardar refs fuertes por si navegamos
                window.__filtersReady = true;
                window.__applyFiltersRef = window.applyFilters;
                console.log('✅ ensureFiltersReady: filtros aplicados', {
                    testCasesLen: (window.testCases || testCases || []).length,
                    testerEl: !!document.getElementById('testerFilter'),
                    statusEl: !!document.getElementById('statusFilter'),
                    searchEl: !!document.getElementById('searchInput')
                });
                return;
            } catch (e) {
                console.warn('⚠️ ensureFiltersReady fallo temporal:', e);
            }
        }
        if (tries < maxTries) {
            setTimeout(tick, delayMs);
        } else {
            console.warn('⚠️ ensureFiltersReady: no se pudieron inicializar los filtros a tiempo', {
                hasDom: !!(document.getElementById('testerFilter') && document.getElementById('statusFilter') && document.getElementById('searchInput')),
                testCasesLen: (window.testCases || testCases || []).length
            });
        }
    };
    setTimeout(tick, 0);
};

// Señalizar readiness y ejecutar callbacks encolados si los hay
try {
    window.__filtersReady = true;
    window.__applyFiltersRef = window.applyFilters;
    window.__onFiltersReadyCallbacks = window.__onFiltersReadyCallbacks || [];
    if (Array.isArray(window.__onFiltersReadyCallbacks) && window.__onFiltersReadyCallbacks.length) {
        const cbs = window.__onFiltersReadyCallbacks.splice(0, window.__onFiltersReadyCallbacks.length);
        cbs.forEach(cb => { try { typeof cb === 'function' && cb(); } catch(_) {} });
    }
} catch(_) {}

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
        
        // Actualizar botones de marcar bug después de cambiar tiempo
        if (typeof updateAllMarkBugButtons === 'function') {
            setTimeout(() => {
                updateAllMarkBugButtons();
            }, 100);
        }
        
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

    // 🐛 CALCULAR ESTADÍSTICAS DE BUGS POR CASO
    // Bugs Reportados = Número ÚNICO de escenarios con bugs (sin duplicar por ciclos)
    const uniqueBugScenarios = new Set();
    testCases.forEach(tc => {
        if (tc.hasBug && (tc.bugState === 'bug_reported' || tc.bugState === 'bug_returned' || tc.bugState === 'bug_fixed')) {
            uniqueBugScenarios.add(tc.scenarioNumber);
        }
    });
    const bugsReported = uniqueBugScenarios.size;
    
    // Bugs Arreglados = Número ÚNICO de escenarios con bugs arreglados
    const uniqueFixedScenarios = new Set();
    testCases.forEach(tc => {
        if (tc.bugState === 'bug_fixed') {
            uniqueFixedScenarios.add(tc.scenarioNumber);
        }
    });
    const bugsFixed = uniqueFixedScenarios.size;
    
    // Bugs Pendientes = Bugs Reportados - Bugs Arreglados
    const bugsPending = bugsReported - bugsFixed;

    // Actualizar elementos del DOM
    const totalCasesEl = document.getElementById('totalCases');
    const okCasesEl = document.getElementById('okCases');
    const noCasesEl = document.getElementById('noCases');
    const successRateEl = document.getElementById('successRate');
    const bugsReportedEl = document.getElementById('bugsReported');
    const bugsFixedEl = document.getElementById('bugsFixed');
    const bugsPendingEl = document.getElementById('bugsPending');

    if (totalCasesEl) totalCasesEl.textContent = total;
    if (okCasesEl) okCasesEl.textContent = okCases;
    if (noCasesEl) noCasesEl.textContent = noCases;
    if (successRateEl) successRateEl.textContent = successRate + '%';
    if (bugsReportedEl) bugsReportedEl.textContent = bugsReported;
    if (bugsFixedEl) bugsFixedEl.textContent = bugsFixed;
    if (bugsPendingEl) bugsPendingEl.textContent = bugsPending;

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
        timeCard.title = `⏱️  Total: ${timeStats.totalHours.toFixed(2)}h\n📋  Casos: ${timeStats.casesWithTime}\n📈  Promedio: ${timeStats.averageTimePerCase.toFixed(2)}h\n\n💡 Click para ver detalles`;
        timeCard.style.cursor = 'pointer';
        timeCard.onclick = () => showTimeInfo(timeStats);

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
        // Guardar estado anterior para comparación
        const previousStatus = testCase.status;
        
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
        
        // 🆕 LÓGICA DE BUGS: Manejar re-testeo y resolución de bugs
        if (previousStatus !== value && (value === 'OK' || value === 'NO')) {
            // Verificar si es un re-testeo (mismo número de escenario, ciclo mayor)
            if (typeof window.handleRetestBug === 'function') {
                window.handleRetestBug(testCase.scenarioNumber, testCase.cycleNumber, value);
            }
        }

        // 🎯 CRÍTICO: Sincronizar INMEDIATAMENTE con multicaso
        if (typeof syncScenariosWithCurrentCase === 'function') {
            
            syncScenariosWithCurrentCase();
        }

        // 🎯 CRÍTICO: Actualizar botones de marcar bug cuando cambie el estado
        if (typeof updateAllMarkBugButtons === 'function') {
            setTimeout(() => {
                updateAllMarkBugButtons();
            }, 100);
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
// FUNCIONES DE INFORMACIÓN DE TIEMPO
// ===============================================

/**
 * Muestra información detallada del tiempo
 */
function showTimeInfo(timeStats) {
    if (!timeStats) {
        console.error('❌ No hay estadísticas de tiempo para mostrar');
        return;
    }
    
    const message = `
📊 ESTADÍSTICAS DE TIEMPO

⏱️  Total de horas:        ${timeStats.totalHours.toFixed(2)}hs /n
📋  Casos con tiempo:      ${timeStats.casesWithTime} /n
📈  Promedio por escenario: ${timeStats.averageTimePerCase.toFixed(2)}hs /n
📊  Total de escenarios:   ${timeStats.totalScenarios} /n

💡 Esta información se calcula basándose en los escenarios que tienen tiempo registrado.
    `;
    
    if (typeof showInfo === 'function') {
        showInfo(message, '📊 Información de Tiempo');
    } else {
        alert(message);
    }
}

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
// Las funciones ya están expuestas en window en sus definiciones.
window.handleEvidenceUpload = handleEvidenceUpload;
window.addEvidenceToContainer = addEvidenceToContainer;
window.zoomEvidenceImage = zoomEvidenceImage;
window.removeVarName = removeVarName;
window.formatDateForDisplay = formatDateForDisplay;
window.updateManualTime = updateManualTime;

// ✅ FUNCIONES PARA MANEJAR BUGS
window.markBug = function(scenarioId) {
    const testCase = testCases.find(tc => tc.id === scenarioId);
    if (!testCase) {
        console.error('❌ Escenario no encontrado:', scenarioId);
        return false;
    }
    
    if (testCase.status !== 'NO') {
        showError('Solo se pueden marcar bugs en escenarios con estado NO', 'Estado incorrecto');
        return false;
    }
    
    // Verificar si ya tiene bug marcado
    if (testCase.hasBug) {
        showInfo('Este escenario ya tiene un bug marcado', 'Bug ya marcado');
        return false;
    }
    
    // Marcar el escenario con bug
    testCase.hasBug = true;
    testCase.bugState = 'bug_reported';
    testCase.bugMarkedDate = new Date();
    
    // Incrementar contador de bugs totales SOLO UNA VEZ por número de escenario
    if (typeof window.updateBugCounters === 'function') {
        // Verificar si ya existe un bug para este número de escenario
        const existingBugForScenario = testCases.find(tc => 
            tc.scenarioNumber === testCase.scenarioNumber && 
            tc.id !== testCase.id && 
            tc.hasBug
        );
        
        if (!existingBugForScenario) {
            window.updateBugCounters('increment_total');
        }
    }
    
    // Guardar cambios
    if (typeof saveToStorage === 'function') {
        saveToStorage();
    }
    
    // Sincronizar con multicase para que se refleje en el dashboard
    if (typeof syncScenariosWithCurrentCase === 'function') {
        syncScenariosWithCurrentCase();
    }
    
    // Sincronizar con dashboard si está disponible
    if (typeof syncFromAppToDashboard === 'function') {
        setTimeout(() => {
            syncFromAppToDashboard();
        }, 100);
    }
    
    // Actualizar UI
    renderTestCases();
    
    // Actualizar botones de marcar bug (esto también actualiza las stats)
    if (typeof updateAllMarkBugButtons === 'function') {
        updateAllMarkBugButtons();
    }
    
    showSuccess(`Escenario ${testCase.scenarioNumber} marcado con bug`, 'Bug marcado');
    console.log(`🐛 Bug marcado en escenario ${testCase.scenarioNumber}`);
    
    return true;
};


window.updateBugCounters = function(action, scenarioId = null) {
    // Obtener contadores del requerimiento actual
    if (!window.currentRequirement) return;
    
    const requirementId = window.currentRequirement.id;
    
    // Inicializar contadores si no existen
    if (!window.bugCounters) {
        window.bugCounters = {};
    }
    
    if (!window.bugCounters[requirementId]) {
        window.bugCounters[requirementId] = {
            totalBugs: 0,
            bugsResolved: 0
        };
    }
    
    switch (action) {
        case 'increment_total':
            window.bugCounters[requirementId].totalBugs++;
            break;
        case 'increment_resolved':
            window.bugCounters[requirementId].bugsResolved++;
            break;
        case 'recalculate':
            // Recalcular contadores basado en el estado actual de los escenarios
            // IMPORTANTE: Solo contar UN bug por número de escenario (no por ciclo)
            const scenariosWithBug = testCases.filter(tc => tc.hasBug);
            const uniqueBugScenarios = new Set();
            
            scenariosWithBug.forEach(scenario => {
                uniqueBugScenarios.add(scenario.scenarioNumber);
            });
            
            window.bugCounters[requirementId].totalBugs = uniqueBugScenarios.size;
            
            // Contar bugs resueltos: solo UNO por número de escenario
            const resolvedBugScenarios = new Set();
            scenariosWithBug.forEach(scenario => {
                if (scenario.bugState === 'bug_fixed') {
                    resolvedBugScenarios.add(scenario.scenarioNumber);
                }
            });
            window.bugCounters[requirementId].bugsResolved = resolvedBugScenarios.size;
            break;
    }
    
    // Guardar contadores
    if (typeof saveToStorage === 'function') {
        saveToStorage();
    }
    
    // Actualizar dashboard si está disponible
    if (typeof window.updateBugStats === 'function') {
        window.updateBugStats();
    }
};

// ✅ FUNCIÓN PARA RECALCULAR CONTADORES AL CARGAR DATOS
window.recalculateBugCounters = function() {
    if (!window.currentRequirement) return;
    
    // Evitar recálculos múltiples
    if (window.recalculatingBugCounters) return;
    window.recalculatingBugCounters = true;
    
    if (typeof window.updateBugCounters === 'function') {
        window.updateBugCounters('recalculate');
    }
    
    setTimeout(() => {
        window.recalculatingBugCounters = false;
    }, 500);
};

// ✅ LÓGICA DE RE-TESTEO Y RESOLUCIÓN DE BUGS
window.handleRetestBug = function(scenarioNumber, cycle, newStatus) {
    // Buscar todos los ciclos del mismo número de escenario
    const allCycles = testCases.filter(tc => tc.scenarioNumber == scenarioNumber);
    
    if (allCycles.length === 0) return;
    
    // Encontrar el ciclo anterior (si existe)
    const previousCycle = allCycles.find(tc => tc.cycleNumber < cycle && tc.hasBug);
    
    if (previousCycle) {
        if (newStatus === 'OK') {
            // Bug resuelto - marcar todos los ciclos como "arreglado"
            allCycles.forEach(cycleScenario => {
                if (cycleScenario.hasBug) {
                    cycleScenario.bugState = 'bug_fixed';
                    cycleScenario.bugResolvedDate = new Date();
                }
            });
            
            // Incrementar contador de bugs resueltos SOLO UNA VEZ
            if (typeof window.updateBugCounters === 'function') {
                // Verificar si ya se contó como resuelto ANTES de marcar como resuelto
                const wasAlreadyResolved = allCycles.some(tc => tc.bugState === 'bug_fixed' && tc.bugResolvedDate);
                if (!wasAlreadyResolved) {
                    window.updateBugCounters('increment_resolved');
                }
            }
            
            showSuccess(`Bug del escenario ${scenarioNumber} resuelto`, 'Bug resuelto');
            console.log(`✅ Bug resuelto en escenario ${scenarioNumber}`);
            
            // Actualizar botones después de resolver bug
            if (typeof updateAllMarkBugButtons === 'function') {
                setTimeout(() => {
                    updateAllMarkBugButtons();
                }, 100);
            }
            
            // 🐛 ACTUALIZAR STATS DE BUGS AL INSTANTE
            if (typeof updateAppStats === 'function') {
                updateAppStats();
            }
            
        } else if (newStatus === 'NO') {
            // Bug no resuelto - cambiar estado anterior a "devuelto" y marcar nuevo como "reportado"
            allCycles.forEach(cycleScenario => {
                if (cycleScenario.hasBug && cycleScenario.bugState === 'bug_reported') {
                    cycleScenario.bugState = 'bug_returned';
                }
            });
            
            // Marcar el nuevo ciclo como "reportado" si tiene bug
            const currentCycle = allCycles.find(tc => tc.cycleNumber == cycle);
            if (currentCycle && currentCycle.hasBug) {
                currentCycle.bugState = 'bug_reported';
            }
            
            console.log(`❌ Bug no resuelto en escenario ${scenarioNumber}, ciclo ${cycle}`);
            
            // Actualizar botones después de cambiar estados
            if (typeof updateAllMarkBugButtons === 'function') {
                setTimeout(() => {
                    updateAllMarkBugButtons();
                }, 100);
            }
            
            // 🐛 ACTUALIZAR STATS DE BUGS AL INSTANTE
            if (typeof updateAppStats === 'function') {
                updateAppStats();
            }
        }
    }
};

// DEBUG: Verificar que las funciones estén disponibles
// console.log('🔍 DEBUG cases.js cargado:');
// console.log('🔍 renderTestCases disponible:', typeof window.renderTestCases);
// console.log('🔍 updateAppStats disponible:', typeof window.updateAppStats);
// console.log('🔍 updateFilters disponible:', typeof window.updateFilters);
// console.log('🔍 updateManualTime disponible:', typeof window.updateManualTime);

// ✅ FUNCIONES CRÍTICAS PARA DUPLICACIÓN
window.insertCaseInCorrectPosition = insertCaseInCorrectPosition;
window.renumberScenariosAfter = renumberScenariosAfter;

// ✅ FUNCIONES PARA MARCAR BUGS
window.updateAllMarkBugButtons = function() {
    // 🐛 ACTUALIZAR STATS DE BUGS AL INSTANTE
    if (typeof updateAppStats === 'function') {
        updateAppStats();
    }
    
    // Actualizar todos los botones de marcar bug en la tabla
    testCases.forEach(tc => {
        const btn = document.getElementById(`markBugBtn-${tc.id}`);
        
        // Solo mostrar botón si el estado es NO
        const shouldShowButton = tc.status === 'NO';
        
        if (btn) {
            if (shouldShowButton) {
                // Mostrar botón con estado correspondiente
                btn.style.display = 'inline-block';
                
                // Determinar el estado del botón basado en bugState
                if (tc.hasBug) {
                    switch (tc.bugState) {
                        case 'bug_reported':
                            btn.innerHTML = '📤 Reportado';
                            btn.className = 'btn btn-info btn-small';
                            btn.title = 'Bug reportado a desarrollo';
                            // NO cambiar onclick - mantener funcionalidad
                            break;
                        case 'bug_returned':
                            btn.innerHTML = '🔄 Devuelto';
                            btn.className = 'btn btn-warning btn-small';
                            btn.title = 'Bug devuelto por desarrollo';
                            break;
                        case 'bug_fixed':
                            btn.innerHTML = '✅ Arreglado';
                            btn.className = 'btn btn-success btn-small';
                            btn.title = 'Bug arreglado';
                            break;
                        default:
                            btn.innerHTML = '🐛 Marcar Bug';
                            btn.className = 'btn btn-warning btn-small';
                            btn.title = 'Marcar escenario con bug';
                            btn.onclick = () => markBug(tc.id);
                    }
                } else {
                    btn.innerHTML = '🐛 Marcar Bug';
                    btn.className = 'btn btn-warning btn-small';
                    btn.title = 'Marcar escenario con bug';
                    btn.onclick = () => markBug(tc.id);
                }
            } else {
                // Ocultar botón
                btn.style.display = 'none';
            }
        }
    });
};





