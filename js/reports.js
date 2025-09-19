// ===============================================
// REPORTS.JS - Sistema de reportes PDF COMPLETO
// ===============================================

function __getRequirementSafe() {
    try {
        // Intentar obtener desde variables globales
        if (typeof currentRequirement !== 'undefined' && currentRequirement) {
            console.log('📊 Requerimiento encontrado en currentRequirement');
            return currentRequirement;
        }
        
        // Intentar obtener desde window
        if (window.currentRequirement) {
            console.log('📊 Requerimiento encontrado en window.currentRequirement');
            return window.currentRequirement;
        }
        
        // Intentar obtener desde localStorage
        const multicaseData = localStorage.getItem('multicaseData');
        if (multicaseData) {
            const data = JSON.parse(multicaseData);
            if (data.currentRequirement) {
                console.log('📊 Requerimiento encontrado en localStorage');
                return data.currentRequirement;
            }
        }
        
        console.warn('⚠️ No se encontró requerimiento activo');
        return null;
    } catch (error) {
        console.error('❌ Error obteniendo requerimiento:', error);
        return null;
    }
}



// Función para obtener todas las métricas del reporte
function getReportMetrics() {
    // CRÍTICO: Obtener datos del requerimiento actual
    const req = __getRequirementSafe();
    const reqInfo = req ? req.info : {};
    
    const metrics = {
        // Información básica
        totalCases: testCases.length,
        okCases: testCases.filter(tc => tc.status === 'OK').length,
        noCases: testCases.filter(tc => tc.status === 'NO').length,
        pendingCases: testCases.filter(tc => !tc.status || tc.status === '' || tc.status === 'Pendiente').length,

        // Fechas
        startDate: reqInfo.startDate || '',
        endDate: getLastExecutionDate(),

        // Tiempo
        totalTime: typeof getTotalTimeHours === 'function' ? getTotalTimeHours() : 0,
        averageTime: 0,
        casesWithTime: testCases.filter(tc => (tc.testTime || 0) > 0).length,
        casesWithoutTime: testCases.filter(tc => !(tc.testTime || 0) > 0).length,

        // Ciclos
        cycleStats: getCycleStatistics(),
        totalCycles: getCycleCount(),

        // Bugs y re-testing
        bugs: getBugsList(),
        scenariosNeedingRetest: getScenariosNeedingRetest(),

        // Tasa de éxito
        successRate: 0
    };

    // Calcular métricas derivadas
    metrics.averageTime = metrics.casesWithTime > 0 ? (metrics.totalTime / metrics.casesWithTime) : 0;
    metrics.successRate = metrics.totalCases > 0 ? Math.round((metrics.okCases / metrics.totalCases) * 100) : 0;

    return metrics;
}

// Función para obtener la fecha de última ejecución
function getLastExecutionDate() {
    const datesWithExecution = testCases
        .filter(tc => tc.executionDate && tc.executionDate.trim())
        .map(tc => tc.executionDate)
        .sort((a, b) => {
            // Verificar si las funciones de formato están disponibles
            const dateA = typeof formatDateForStorage === 'function' ?
                formatDateForStorage(b) : b;
            const dateB = typeof formatDateForStorage === 'function' ?
                formatDateForStorage(a) : a;
            return new Date(dateA) - new Date(dateB);
        });

    return datesWithExecution.length > 0 ? datesWithExecution[0] : '';
}

// Función para obtener estadísticas por ciclo
function getCycleStatistics() {
    const cycleStats = {};

    testCases.forEach(tc => {
        const cycle = tc.cycleNumber || '1';
        if (!cycleStats[cycle]) {
            cycleStats[cycle] = {
                totalCases: 0,
                totalTime: 0
            };
        }
        cycleStats[cycle].totalCases++;
        cycleStats[cycle].totalTime += parseFloat(tc.testTime) || 0;
    });

    return cycleStats;
}

// Función para contar ciclos únicos
function getCycleCount() {
    const cycles = new Set(testCases.map(tc => tc.cycleNumber || '1'));
    return cycles.size;
}

// Función para obtener lista de bugs
function getBugsList() {
    return testCases
        .filter(tc => tc.errorNumber && tc.errorNumber.trim())
        .map(tc => ({
            bugNumber: tc.errorNumber,
            scenario: tc.scenarioNumber,
            observations: tc.observations || 'Sin descripción'
        }));
}

// Función para obtener escenarios que necesitan re-testing
function getScenariosNeedingRetest() {
    const scenarioGroups = {};

    // Agrupar casos por número de escenario
    testCases.forEach(tc => {
        const scenario = tc.scenarioNumber;
        if (!scenarioGroups[scenario]) {
            scenarioGroups[scenario] = [];
        }
        scenarioGroups[scenario].push(tc);
    });

    const needRetest = [];

    // Para cada escenario, verificar el estado del ciclo más reciente
    Object.keys(scenarioGroups).forEach(scenario => {
        const cases = scenarioGroups[scenario];

        // Ordenar por número de ciclo (descendente) para obtener el más reciente
        cases.sort((a, b) => {
            const cycleA = parseInt(a.cycleNumber) || 0;
            const cycleB = parseInt(b.cycleNumber) || 0;
            return cycleB - cycleA;
        });

        const latestCase = cases[0];

        // Si el caso más reciente es NO, necesita re-testing
        if (latestCase.status === 'NO') {
            needRetest.push({
                scenario: scenario,
                lastCycle: latestCase.cycleNumber,
                status: latestCase.status
            });
        }
    });

    return needRetest;
}

// ===============================================
// FUNCIÓN PARA GENERAR EL CONTENIDO DEL REPORTE
// ===============================================

function generateReportContent() {
    const metrics = getReportMetrics();
    
    // CRÍTICO: Obtener datos del requerimiento actual
    const req = __getRequirementSafe();
    const reqInfo = req ? req.info : {};

    let content = '';

    // HEADER/PORTADA
    content += `REPORTE DE TESTING\n`;
    content += `${'='.repeat(50)}\n\n`;

    content += `📋 Requerimiento: ${reqInfo.number || 'No especificado'} - ${reqInfo.name || 'Sin nombre'}\n`;
    content += `👤 Tester Principal: ${reqInfo.tester || 'No especificado'}\n`;
    content += `📅 Fecha Inicio: ${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(metrics.startDate) || 'No especificada' : metrics.startDate || 'No especificada'}\n`;
    content += `📅 Fecha Fin: ${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(metrics.endDate) || 'En progreso' : metrics.endDate || 'En progreso'}\n`;
    content += `📄 Reporte generado: ${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(new Date().toISOString().split('T')[0]) : new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour12: false })}\n\n`;

    // SECCIÓN 1: RESUMEN EJECUTIVO
    content += `ESTADÍSTICAS GENERALES\n`;
    content += `${'='.repeat(50)}\n\n`;

    content += `✅ Escenarios totales: ${metrics.totalCases} escenarios\n`;
    if (metrics.totalCases > 0) {
        content += `✅ Escenarios OK: ${metrics.okCases} (${Math.round((metrics.okCases / metrics.totalCases) * 100)}%)\n`;
        content += `❌ Escenarios NO: ${metrics.noCases} (${Math.round((metrics.noCases / metrics.totalCases) * 100)}%)\n`;
        content += `⏳ Escenarios Pendientes: ${metrics.pendingCases} (${Math.round((metrics.pendingCases / metrics.totalCases) * 100)}%)\n`;
    } else {
        content += `✅ Escenarios OK: 0 (0%)\n`;
        content += `❌ Escenarios NO: 0 (0%)\n`;
        content += `⏳ Escenarios Pendientes: 0 (0%)\n`;
    }
    content += `🕐 Tiempo total invertido: ${metrics.totalTime.toFixed(1)} horas\n`;
    content += `🔄 Ciclos ejecutados: ${Object.keys(metrics.cycleStats).sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}\n`;
    content += `📈 Tasa de éxito: ${metrics.successRate}%\n\n`;

    // SECCIÓN 4: MÉTRICAS DE TIEMPO
    content += `ANÁLISIS DE TIEMPO\n`;
    content += `${'='.repeat(50)}\n\n`;

    content += `⏱️ Tiempo promedio por caso: ${metrics.averageTime.toFixed(1)} horas\n`;
    content += `📊 Tiempo total por ciclo:\n`;

    Object.keys(metrics.cycleStats)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(cycle => {
            const stats = metrics.cycleStats[cycle];
            content += `   • Ciclo ${cycle}: ${stats.totalTime.toFixed(1)}hs (${stats.totalCases} escenarios)\n`;
        });

    if (metrics.casesWithoutTime > 0) {
        content += `⚠️ Escenarios sin tiempo registrado: ${metrics.casesWithoutTime}\n`;
    }
    content += '\n';

    // SECCIÓN 5: ISSUES Y RE-TESTING
    content += `BUGS ENCONTRADOS\n`;
    content += `${'='.repeat(50)}\n\n`;

    if (metrics.bugs.length > 0) {
        content += `🐛 Total de bugs: ${metrics.bugs.length}\n`;
        metrics.bugs.forEach(bug => {
            const shortObservation = bug.observations.length > 100 ?
                bug.observations.substring(0, 100) + '...' :
                bug.observations;
            content += `• ${bug.bugNumber}: ${shortObservation} (Escenario ${bug.scenario})\n`;
        });
    } else {
        content += `✅ No se encontraron bugs\n`;
    }
    content += '\n';

    content += `ESCENARIOS QUE NECESITAN RE-TESTING\n`;
    content += `${'='.repeat(50)}\n\n`;

    if (metrics.scenariosNeedingRetest.length > 0) {
        content += `⚠️ Escenarios pendientes de re-testing: ${metrics.scenariosNeedingRetest.length}\n`;
        metrics.scenariosNeedingRetest.forEach(item => {
            content += `• Escenario ${item.scenario}.\n`;
        });
    } else {
        content += `✅ No hay escenarios pendientes de re-testing\n`;
    }

    return content;
}

// Abrir modal de vista previa
function openReportPreview() {
    try {
        // Validar que hay datos (modo caso)
        if (!Array.isArray(testCases) || testCases.length === 0) {
            alert('⚠️ No hay escenarios de prueba del caso activo para generar reporte');
            return;
        }

        // CRÍTICO: Verificar que tenemos datos del requerimiento
        const req = __getRequirementSafe();
        if (!req) {
            alert('⚠️ No se encontró información del requerimiento para generar reporte');
            return;
        }

        // Contenido de vista previa (caso)
        const reportContent = generateReportContent();

        // Modal + contenido
        const contentElement = document.getElementById('reportPreviewContent');
        if (!contentElement) throw new Error('No se encontró el elemento reportPreviewContent');
        contentElement.textContent = reportContent;

        const modalElement = document.getElementById('reportPreviewModal');
        if (!modalElement) throw new Error('No se encontró el elemento reportPreviewModal');

        // Título modal (caso)
        const headerEl = modalElement.querySelector('.modal-header h2');
        if (headerEl) headerEl.textContent = '📊 Vista Previa del Reporte del Caso';

        // Rebind del botón Descargar (evita listeners duplicados)
        const btn = document.getElementById('btnDownloadPDF');
        if (btn) {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', generateReportPDF);
        }

        // Resetear completamente el estado del modal
        modalElement.style.display = 'block';
        modalElement.style.visibility = 'visible';
        modalElement.classList.add('show');
        modalElement.removeAttribute('aria-hidden');
        
        // Forzar reflow
        modalElement.offsetHeight;
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        alert('❌ Error al generar el reporte: ' + error.message);
    }
}


// Cerrar modal de reporte
function closeReportModal() {
    const modal = document.getElementById('reportPreviewModal');
    if (modal) {
        // Múltiples métodos para asegurar el cierre
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        
        // Forzar reflow
        modal.offsetHeight;
    }
}

// ===============================================
// FUNCIÓN PARA GENERAR PDF
// ===============================================

async function generateReportPDF() {
    try {


        // Verificar múltiples formas de acceso a jsPDF
        let jsPDFClass = null;

        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDFClass = window.jspdf.jsPDF;

        } else if (window.jsPDF && window.jsPDF.jsPDF) {
            jsPDFClass = window.jsPDF.jsPDF;

        } else if (window.jspdf) {
            jsPDFClass = window.jspdf;
        } else if (window.jsPDF) {
            jsPDFClass = window.jsPDF;
        } else if (typeof jsPDF !== 'undefined') {
            jsPDFClass = jsPDF;
        } else {

            alert('❌ Error: Librería jsPDF no disponible. Verifica que:\n1. Tienes conexión a internet\n2. El CDN está funcionando\n3. Recarga la página');
            return;
        }

        const doc = new jsPDFClass();

        // Configuración
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const lineHeight = 6;
        let yPosition = margin;

        // Función para agregar texto con salto de página automático
        function addText(text, fontSize = 10, isBold = false) {
            if (yPosition > 280) { // Nueva página si se acerca al final
                doc.addPage();
                yPosition = margin;
            }

            doc.setFontSize(fontSize);
            doc.setFont(undefined, isBold ? 'bold' : 'normal');

            // Dividir texto largo en múltiples líneas
            const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));

            lines.forEach(line => {
                if (yPosition > 280) {
                    doc.addPage();
                    yPosition = margin;
                }
                doc.text(line, margin, yPosition);
                yPosition += lineHeight;
            });

            return yPosition;
        }

        // Función para agregar separador
        function addSeparator() {
            yPosition += 3;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 6;
        }

        // Generar contenido del PDF
        const metrics = getReportMetrics();
        const reqInfo = requirementInfo;


        // HEADER
        addText('REPORTE DE TESTING', 16, true);
        addSeparator();

        addText(`Requerimiento: ${reqInfo.number || 'No especificado'} - ${reqInfo.name || 'Sin nombre'}`, 11);
        addText(`Tester Principal: ${reqInfo.tester || 'No especificado'}`);
        addText(`Fecha Inicio: ${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(metrics.startDate) || 'No especificada' : metrics.startDate || 'No especificada'}`);
        addText(`Fecha Fin: ${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(metrics.endDate) || 'En progreso' : metrics.endDate || 'En progreso'}`);
        addText(`Reporte generado: ${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(new Date().toISOString().split('T')[0]) : new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour12: false })}`);
        yPosition += 5;

        // ESTADÍSTICAS GENERALES
        addText('ESTADÍSTICAS GENERALES', 14, true);
        addSeparator();

        addText(`Escenarios totales: ${metrics.totalCases} escenarios`);
        if (metrics.totalCases > 0) {
            addText(`Escenarios OK: ${metrics.okCases} (${Math.round((metrics.okCases / metrics.totalCases) * 100)}%)`);
            addText(`Escenarios NO: ${metrics.noCases} (${Math.round((metrics.noCases / metrics.totalCases) * 100)}%)`);
            addText(`Escenarios Pendientes: ${metrics.pendingCases} (${Math.round((metrics.pendingCases / metrics.totalCases) * 100)}%)`);
        } else {
            addText(`Escenarios OK: 0 (0%)`);
            addText(`Escenarios NO: 0 (0%)`);
            addText(`Escenarios Pendientes: 0 (0%)`);
        }
        addText(`Tiempo total invertido: ${metrics.totalTime.toFixed(1)} horas`);
        addText(`Ciclos ejecutados: ${Object.keys(metrics.cycleStats).sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}`);
        addText(`Tasa de éxito: ${metrics.successRate}%`);
        yPosition += 5;

        // MÉTRICAS DE TIEMPO
        addText('ANÁLISIS DE TIEMPO', 14, true);
        addSeparator();

        addText(`Tiempo promedio por caso: ${metrics.averageTime.toFixed(1)} horas`);
        addText('Tiempo total por ciclo:', 11, true);

        Object.keys(metrics.cycleStats)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach(cycle => {
                const stats = metrics.cycleStats[cycle];
                addText(`  • Ciclo ${cycle}: ${stats.totalTime.toFixed(1)}hs (${stats.totalCases} escenarios)`);
            });

        if (metrics.casesWithoutTime > 0) {
            addText(`Escenarios sin tiempo registrado: ${metrics.casesWithoutTime}`);
        }
        yPosition += 5;

        // BUGS ENCONTRADOS
        addText('BUGS ENCONTRADOS', 14, true);
        addSeparator();

        if (metrics.bugs.length > 0) {
            addText(`Total de bugs: ${metrics.bugs.length}`, 11, true);
            metrics.bugs.forEach(bug => {
                const shortObservation = bug.observations.length > 100 ?
                    bug.observations.substring(0, 100) + '...' :
                    bug.observations;
                addText(`• ${bug.bugNumber}: ${shortObservation} (Escenario ${bug.scenario})`);
            });
        } else {
            addText('No se encontraron bugs');
        }
        yPosition += 3;

        // ESCENARIOS QUE NECESITAN RE-TESTING
        addText('ESCENARIOS QUE NECESITAN RE-TESTING', 14, true);
        addSeparator();

        if (metrics.scenariosNeedingRetest.length > 0) {
            addText(`Escenarios pendientes de re-testing: ${metrics.scenariosNeedingRetest.length}`, 11, true);
            metrics.scenariosNeedingRetest.forEach(item => {
                addText(`• Escenario ${item.scenario}.`);
            });
        } else {
            addText('No hay escenarios pendientes de re-testing');
        }

        // Generar nombre del archivo
        const projectName = reqInfo.name || 'Proyecto';
        const date = new Date().toISOString().split('T')[0];
        const fileName = `Reporte_Testing_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.pdf`;


        // Descargar PDF
        doc.save(fileName);

        // Cerrar modal
        closeReportModal();

        alert('✅ Reporte PDF generado correctamente');

    } catch (error) {
        console.error('❌ Error completo en generateReportPDF:', error);
        console.error('Stack trace:', error.stack);
        alert('❌ Error al generar PDF: ' + error.message);
    }
}

// =======================================================
// REPORTE GLOBAL (Requerimiento + TODOS los casos)
// =======================================================

// Helpers
function __parseDateSafe(d) {
    if (!d) return null;
    try {
        // Si existe normalizador propio del sistema, úsalo
        if (typeof formatDateForStorage === 'function') {
            return new Date(formatDateForStorage(d));
        }
        return new Date(d);
    } catch { return null; }
}
function __timeToHours(v) {
    const n = parseFloat(v ?? 0);
    if (!isFinite(n) || n <= 0) return 0;
    // Heurística: si es grande, lo tratamos como minutos
    return n > 24 ? (n / 60) : n;
}

// Aplana escenarios de TODOS los casos con contexto de caso
function __getAllScenarios() {
    const req = __getRequirementSafe() || {};
    const cases = Array.isArray(req.cases) ? req.cases : [];
    const out = [];
    for (const c of cases) {
        const scs = Array.isArray(c.scenarios) ? c.scenarios : [];
        for (const s of scs) {
            out.push({
                __caseId: c.id,
                __caseTitle: c.title || 'Caso',
                __caseNumber: c.caseNumber || '',
                ...s
            });
        }
    }
    return out;
}


// Métricas globales
function getGlobalReportMetrics() {
    const reqObj = __getRequirementSafe();
    const reqInfo = (reqObj?.info) || (typeof requirementInfo !== 'undefined' ? requirementInfo : {}) || {};
    const allSc = __getAllScenarios();

    const metrics = {
        requirement: reqInfo,

        // Escenarios (antes "Casos" en tu semántica)
        totalCases: allSc.length,
        okCases: allSc.filter(tc => tc.status === 'OK').length,
        noCases: allSc.filter(tc => tc.status === 'NO').length,
        pendingCases: allSc.filter(tc => !tc.status || tc.status === '' || tc.status === 'Pendiente').length,

        // NUEVO: cantidad de casos del requerimiento
        caseCount: Array.isArray(reqObj?.cases) ? reqObj.cases.length : 0,

        // Fechas
        startDate: reqInfo.startDate || '',
        endDate: '',

        // Tiempo
        totalTime: 0,
        casesWithTime: allSc.filter(tc => (parseFloat(tc.testTime) || 0) > 0).length,
        averageTime: 0,

        // Ciclos
        cycleStats: {},
        cycleCount: 0,

        // Bugs
        bugs: [],

        // Re-testing
        scenariosNeedingRetest: [],

        // Tasa de éxito
        successRate: 0,
    };

    // Fecha fin = máxima executionDate
    let maxDate = null;
    for (const tc of allSc) {
        const d = __parseDateSafe(tc.executionDate);
        if (d && (!maxDate || d > maxDate)) maxDate = d;
    }
    metrics.endDate = maxDate ? maxDate.toISOString().slice(0, 10) : '';

    // Tiempo total (horas)
    metrics.totalTime = allSc.reduce((sum, tc) => sum + __timeToHours(tc.testTime), 0);
    metrics.averageTime = metrics.casesWithTime > 0 ? (metrics.totalTime / metrics.casesWithTime) : 0;

    // Ciclos
    const cyc = {};
    for (const tc of allSc) {
        const cycle = (tc.cycleNumber || '1').toString();
        if (!cyc[cycle]) {
            cyc[cycle] = { totalCases: 0, okCases: 0, noCases: 0, pendingCases: 0, totalTime: 0 };
        }
        cyc[cycle].totalCases++;
        if (tc.status === 'OK') cyc[cycle].okCases++;
        else if (tc.status === 'NO') cyc[cycle].noCases++;
        else cyc[cycle].pendingCases++;
        cyc[cycle].totalTime += __timeToHours(tc.testTime);
    }
    metrics.cycleStats = cyc;
    metrics.cycleCount = Object.keys(cyc).length;

    // Bugs
    metrics.bugs = allSc
        .filter(tc => (tc.errorNumber && tc.errorNumber.trim()))
        .map(tc => ({
            bugNumber: tc.errorNumber,
            scenario: tc.scenarioNumber,
            caseNumber: tc.__caseNumber || '',
            caseTitle: tc.__caseTitle || 'Caso',
            observations: tc.observations || 'Sin descripción'
        }));

    // Re-testing (último ciclo NO)
    const groups = {};
    for (const tc of allSc) {
        const key = (tc.__caseId || 'x') + '|' + (tc.scenarioNumber || '');
        (groups[key] ||= []).push(tc);
    }
    const needRetest = [];
    for (const key of Object.keys(groups)) {
        const list = groups[key].slice().sort((a, b) => (parseInt(b.cycleNumber) || 0) - (parseInt(a.cycleNumber) || 0));
        const latest = list[0];
        if (latest && latest.status === 'NO') {
            needRetest.push({
                caseNumber: latest.__caseNumber || '',
                caseTitle: latest.__caseTitle || 'Caso',
                scenario: latest.scenarioNumber,
                lastCycle: latest.cycleNumber,
                status: latest.status
            });
        }
    }
    metrics.scenariosNeedingRetest = needRetest;

    metrics.successRate = metrics.totalCases > 0 ? Math.round((metrics.okCases / metrics.totalCases) * 100) : 0;

    return metrics;
}



// Texto de vista previa (global)
function generateGlobalReportContent() {
    const m = getGlobalReportMetrics();
    const req = m.requirement || {};

    let content = '';
    content += 'REPORTE DE TESTING\n';
    content += '==================================================\n\n';
    content += `Requerimiento: ${req.number || 'N/D'} - ${req.name || 'Sin nombre'}\n`;
    content += `Fecha Inicio: ${req.startDate || 'N/D'}\n`;
    content += `Fecha Fin: ${m.endDate || 'En progreso'}\n`;
    content += `Reporte generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}\n\n`;

    content += 'ESTADÍSTICAS GENERALES\n';
    content += '--------------------------------------------------\n';
    content += `Casos Totales: ${m.caseCount}\n`;                          // 👈 NUEVO
    content += `Escenarios totales: ${m.totalCases}\n`;                    // 👈 etiqueta ajustada
    content += `Escenarios OK: ${m.okCases}\n`;
    content += `Escenarios NO: ${m.noCases}\n`;
    content += `Escenarios Pendientes: ${m.pendingCases}\n`;
    content += `Tiempo total invertido: ${m.totalTime.toFixed(1)} horas\n`;
    content += `Ciclos ejecutados: ${Object.keys(m.cycleStats).sort((a, b) => parseInt(a) - parseInt(b)).join(', ') || 'N/D'}\n`;
    content += `Tasa de éxito: ${m.successRate}%\n\n`;

    content += 'ANÁLISIS DE TIEMPO\n';
    content += '--------------------------------------------------\n';
    content += `Tiempo promedio por escenario: ${m.averageTime.toFixed(1)} horas\n`;
    content += `Tiempo total por ciclo:\n`;
    Object.keys(m.cycleStats).sort((a, b) => parseInt(a) - parseInt(b)).forEach(cycle => {
        const cs = m.cycleStats[cycle];
        content += ` • Ciclo ${cycle}: ${cs.totalTime.toFixed(1)} horas (${cs.totalCases} escenarios)\n`;
    });
    content += '\n';

    content += 'BUGS ENCONTRADOS\n';
    content += '--------------------------------------------------\n';
    if (m.bugs.length === 0) {
        content += 'No se encontraron bugs\n';
    } else {
        content += `Total de bugs: ${m.bugs.length}\n`;
        // Agrupar por caso
        const byCase = {};
        m.bugs.forEach(b => {
            const key = `${b.caseNumber}|||${b.caseTitle}`;
            (byCase[key] ||= []).push(b);
        });
        Object.keys(byCase).sort((a, b) => {
            // ordenar por número de caso numérico si se puede
            const [aNum] = a.split('|||'); const [bNum] = b.split('|||');
            return (parseInt(aNum) || 0) - (parseInt(bNum) || 0);
        }).forEach(k => {
            const [num, title] = k.split('|||');
            const numStr = (num && String(num).trim()) ? `# Caso ${num} - ${title}` : `Caso - ${title}`;
            content += `• ${numStr}:\n`;
            byCase[k].forEach(b => {
                const shortObs = (b.observations || '').length > 100 ? (b.observations.slice(0, 100) + '...') : (b.observations || 'Sin descripción');
                content += `   * Escenario ${b.scenario} → # Bug ${b.bugNumber} - ${shortObs}\n`; // 👈 "# Bug"
            });
        });
    }
    content += '\n';

    content += 'ESCENARIOS QUE NECESITAN RE-TESTING\n';
    content += '--------------------------------------------------\n';
    if (m.scenariosNeedingRetest.length === 0) {
        content += 'No hay escenarios pendientes de re-testing\n';
    } else {
        m.scenariosNeedingRetest.forEach(it => {
            content += `• ${it.caseNumber ? ('# Caso ' + it.caseNumber + ' - ') : ''}${it.caseTitle} / Escenario ${it.scenario} (último ciclo ${it.lastCycle})\n`;
        });
    }
    content += '\n';

    return content;
}


// Preview Global (cambia título y rebinds el botón PDF)
function openGlobalReportPreview() {
    try {
        const req = __getRequirementSafe();
        if (!req || !Array.isArray(req.cases) || req.cases.length === 0) {
            alert('⚠️ No hay proyecto (requerimiento/casos) para generar reporte global');
            return;
        }

        const content = generateGlobalReportContent();

        const modal = document.getElementById('reportPreviewModal');
        const contentElement = document.getElementById('reportPreviewContent');
        if (!modal || !contentElement) throw new Error('Modal de reporte no disponible');

        const headerEl = modal.querySelector('.modal-header h2');
        if (headerEl) headerEl.textContent = '📊 Vista Previa del Reporte Global';

        contentElement.textContent = content;

        const btn = document.getElementById('btnDownloadPDF');
        if (btn) {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', generateGlobalReportPDF);
        }

        // Resetear completamente el estado del modal
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.classList.add('show');
        modal.removeAttribute('aria-hidden');
        
        // Forzar reflow
        modal.offsetHeight;
    } catch (e) {
        console.error('Error abriendo reporte global:', e);
        alert('❌ Error al generar el reporte global');
    }
}


// PDF Global
async function generateGlobalReportPDF() {
  try {
    // Resolver jsPDF
    let jsPDFClass = null;
    if (window.jspdf && window.jspdf.jsPDF) jsPDFClass = window.jspdf.jsPDF;
    else if (window.jsPDF && window.jsPDF.jsPDF) jsPDFClass = window.jsPDF.jsPDF;
    else if (window.jspdf) jsPDFClass = window.jspdf;
    else if (window.jsPDF) jsPDFClass = window.jsPDF;

    if (!jsPDFClass) {
      alert('❌ No se encontró jsPDF');
      return;
    }

    const doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 6;
    let yPosition = margin;

    function addText(text, fontSize = 10, isBold = false) {
      if (yPosition > 280) { doc.addPage(); yPosition = margin; }
      doc.setFontSize(fontSize);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const maxWidth = pageWidth - (margin * 2);
      const lines = doc.splitTextToSize(String(text ?? ''), maxWidth);
      lines.forEach(line => { doc.text(line, margin, yPosition); yPosition += lineHeight; });
    }
    function addSeparator() {
      yPosition += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
    }

    const m = getGlobalReportMetrics();
    const req = m.requirement || {};

    // HEADER
    addText('REPORTE DE TESTING', 16, true);
    addSeparator();

    addText(`Requerimiento: ${req.number || 'N/D'} - ${req.name || 'Sin nombre'}`, 11);
    addText(`Fecha Inicio: ${req.startDate || 'N/D'}`);
    addText(`Fecha Fin: ${m.endDate || 'En progreso'}`);
    addText(`Reporte generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`);
    yPosition += 5;

    // ESTADÍSTICAS GENERALES
    addText('ESTADÍSTICAS GENERALES', 14, true);
    addSeparator();
    addText(`Casos Totales: ${m.caseCount}`);                 // 👈 NUEVO
    addText(`Escenarios totales: ${m.totalCases}`);
    addText(`Escenarios OK: ${m.okCases}`);
    addText(`Escenarios NO: ${m.noCases}`);
    addText(`Escenarios Pendientes: ${m.pendingCases}`);
    addText(`Tiempo total invertido: ${m.totalTime.toFixed(1)} horas`);
    addText(`Ciclos ejecutados: ${Object.keys(m.cycleStats).sort((a,b)=>parseInt(a)-parseInt(b)).join(', ') || 'N/D'}`);
    addText(`Tasa de éxito: ${m.successRate}%`);
    yPosition += 5;

    // ANÁLISIS DE TIEMPO
    addText('ANÁLISIS DE TIEMPO', 14, true);
    addSeparator();
    addText(`Tiempo promedio por escenario: ${m.averageTime.toFixed(1)} horas`);
    addText('Tiempo total por ciclo:', 11, true);
    Object.keys(m.cycleStats).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(cycle => {
      const cs = m.cycleStats[cycle];
      addText(` • Ciclo ${cycle}: ${cs.totalTime.toFixed(1)} horas (${cs.totalCases} escenarios)`);
    });
    yPosition += 5;

    // BUGS
    addText('BUGS ENCONTRADOS', 14, true);
    addSeparator();
    if (m.bugs.length === 0) {
      addText('No se encontraron bugs');
    } else {
      addText(`Total de bugs: ${m.bugs.length}`, 11, true);
      // Agrupar por caso
      const byCase = {};
      m.bugs.forEach(b => {
        const key = `${b.caseNumber}|||${b.caseTitle}`;
        (byCase[key] ||= []).push(b);
      });
      Object.keys(byCase).sort((a, b) => {
        const [aNum] = a.split('|||'); const [bNum] = b.split('|||');
        return (parseInt(aNum) || 0) - (parseInt(bNum) || 0);
      }).forEach(k => {
        const [num, title] = k.split('|||');
        const caseLabel = (num && String(num).trim()) ? `• Caso ${num} - ${title}:` : `• Caso - ${title}:`;
        addText(caseLabel, 11, true);
        byCase[k].forEach(b => {
          const shortObs = (b.observations || '').length > 100 ? (b.observations.slice(0,100)+'...') : (b.observations || 'Sin descripción');
          addText(`   * Escenario ${b.scenario} - Bug ${b.bugNumber} - ${shortObs}`);
        });
      });
    }
    yPosition += 5;

    // RE-TESTING
    addText('ESCENARIOS QUE NECESITAN RE-TESTING', 14, true);
    addSeparator();
    if (m.scenariosNeedingRetest.length === 0) {
      addText('No hay escenarios pendientes de re-testing');
    } else {
      addText(`Escenarios pendientes de re-testing: ${m.scenariosNeedingRetest.length}`, 11, true);
      m.scenariosNeedingRetest.forEach(it => {
        const head = it.caseNumber ? (`# Caso ${it.caseNumber} - ${it.caseTitle}`) : it.caseTitle;
        addText(`• ${head} / Escenario ${it.scenario} (último ciclo ${it.lastCycle})`);
      });
    }

    // Descargar
    doc.save(`Reporte_Global_${(req.number || 'REQ')}_${new Date().toISOString().slice(0,10)}.pdf`);
  } catch (e) {
    console.error('Error generando PDF global:', e);
    alert('❌ Error al generar el PDF global');
  }
}



// ===============================================
// EVENT LISTENERS
// ===============================================

document.addEventListener('DOMContentLoaded', function () {
    // Esperar un momento para que todos los elementos estén disponibles
    setTimeout(() => {
        // Botón principal para generar reporte
        const btnGenerateReport = document.getElementById('btnGenerateReport');
        if (btnGenerateReport) {
            btnGenerateReport.addEventListener('click', openReportPreview);
        } else {
            console.warn('⚠️ No se encontró btnGenerateReport');
        }

        // Botones del modal
        const closeReportBtn = document.getElementById('closeReportModalBtn');
        if (closeReportBtn) {
            closeReportBtn.addEventListener('click', closeReportModal);
        }

        const btnCancelReport = document.getElementById('btnCancelReport');
        if (btnCancelReport) {
            btnCancelReport.addEventListener('click', closeReportModal);
        }

        const btnDownloadPDF = document.getElementById('btnDownloadPDF');
        if (btnDownloadPDF) {
            btnDownloadPDF.addEventListener('click', generateReportPDF);
        }

        // Cerrar modal al hacer clic fuera
        const reportModal = document.getElementById('reportPreviewModal');
        if (reportModal) {
            reportModal.addEventListener('click', function (e) {
                if (e.target === reportModal) {
                    closeReportModal();
                }
            });
        }
    }, 100);
});

// ===============================================
// EXPONER FUNCIONES GLOBALMENTE
// ===============================================

window.generateReportPDF = generateReportPDF;
window.closeReportModal = closeReportModal;
window.openReportPreview = openReportPreview;
window.getReportMetrics = getReportMetrics;
window.openGlobalReportPreview = openGlobalReportPreview;
window.generateGlobalReportPDF = generateGlobalReportPDF;

// Función de respaldo específica para cerrar modales de reportes
window.closeReportModalSafe = function() {
    const modal = document.getElementById('reportPreviewModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.offsetHeight; // Forzar reflow
    }
};

// Event listener para cerrar modal con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeReportModalSafe();
    }
});



