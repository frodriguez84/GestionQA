// =====================================================
// EXCEL - Exportar (solo imágenes) / Importar (reemplaza todo)
// Mantiene layout: Hoja 1 (Requerimiento), Hoja 2 (Tabla del caso activo),
// y al final: líneas Amarillas (CICLO) + Negras (ESCENARIO) con imágenes.
// =====================================================

// === Export JSON v3 (multicaso completo) ===
function exportProjectJSONv3() {
    try {
        // 👇 tomar el requirement real (let) o el de window como fallback
        const req = (function () {
            try { if (typeof currentRequirement !== 'undefined' && currentRequirement) return currentRequirement; } catch (_) { }
            return window.currentRequirement || null;
        })();

        if (!req || !Array.isArray(req.cases) || req.cases.length === 0) {
            alert("⚠️ No hay requerimiento para exportar");
            return;
        }

        if (typeof saveMulticaseData === "function") {
            saveMulticaseData();
        }

        // Deep copy seguro
        // Deep copy seguro (usar req, NO window.currentRequirement)
        const requirement = JSON.parse(JSON.stringify(req.info || {}));
        const cases = JSON.parse(JSON.stringify(req.cases || []));

        const data = {
            version: "3.0",
            type: "multicase-project",
            exportedAt: new Date().toISOString(),
            requirement,
            cases
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `proyecto_multicaso_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("✅ Exportación JSON v3 completada");
        alert("✅ Proyecto exportado en formato JSON v3");
    } catch (e) {
        console.error("❌ exportProjectJSONv3:", e);
        alert("❌ Error exportando JSON v3");
    }
}


// === Import JSON (v3 multicase y legacy v1/v2) ===
(function () {
    function genId() {
        return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    function guessMime(dataUrl) {
        const m = /^data:([^;]+);/i.exec(dataUrl || '');
        return m ? m[1] : '';
    }
    function normalizeEvidenceArr(arr) {
        const ev = Array.isArray(arr) ? arr : [];
        return ev.map(e => ({
            name: e?.name || 'archivo',
            data: e?.data || e?.src || '',
            mime: e?.mime || guessMime(e?.data || e?.src),
        }));
    }
    function normalizeScenario(s) {
        return {
            ...s,
            id: s?.id || genId(),
            evidence: normalizeEvidenceArr(s?.evidence)
        };
    }
    function normalizeCase(c) {
        return {
            id: c?.id || genId(),
            caseNumber: c?.caseNumber ?? c?.number ?? c?.caso ?? 1,
            title: c?.title || c?.caseTitle || 'Caso',
            objective: c?.objective || c?.objetive || c?.objetivo || '',
            inputVariableNames: Array.isArray(c?.inputVariableNames) ? [...c.inputVariableNames] : [],
            scenarios: Array.isArray(c?.scenarios) ? c.scenarios.map(normalizeScenario) : [],
            stats: c?.stats || { total: 0, passed: 0, failed: 0, withEvidence: 0 }
        };
    }

    // ✅ Setea las variables REALES (let) que usa multicase-core.js
    function setReqCase(reqObj, activeId) {
        try { currentRequirement = reqObj; } catch { /* noop */ }
        try { currentCaseId = activeId || (reqObj.cases?.[0]?.id ?? null); } catch { /* noop */ }
        try { multicaseMode = true; } catch { /* noop */ }

        // También en window por compatibilidad
        window.currentRequirement = reqObj;
        window.currentCaseId = currentCaseId;
        window.multicaseMode = true;

        // Proxy legacy del modal/tabs
        try { requirementInfo = reqObj.info || {}; } catch { /* puede no existir en algunos builds */ }
    }

    // Detectores tolerantes
    function isV3Flat(obj) {
        if (!obj || typeof obj !== 'object') return false;
        const hasCore = Array.isArray(obj.cases) && typeof obj.requirement === 'object';
        const saysV3 = ['3', '3.0', 3].includes(obj.version) || obj.type === 'multicase-project';
        return hasCore && saysV3;
    }
    function isV3Wrapped(obj) {
        if (!obj || typeof obj !== 'object' || !obj.project) return false;
        const p = obj.project;
        const hasCore = Array.isArray(p.cases) && typeof p.requirement === 'object';
        const saysV3 = ['3', '3.0', 3].includes(obj.version) || obj.type === 'multicase-project';
        return hasCore && saysV3;
    }
    function isLegacy(obj) {
        return obj && (Array.isArray(obj.testCases) || Array.isArray(obj.cases)) && obj.requirementInfo;
    }

    // Importadores (ahora usan setReqCase)
    function importFromV3Flat(obj) {
        const requirement = obj.requirement || {};
        const cases = (obj.cases || []).map(normalizeCase);

        const exportedAt = obj.exportedAt || obj.exportDate || new Date().toISOString();
        console.log('🧭 v3-flat detectado. exportedAt:', exportedAt);

        const activeId = obj.activeCaseId && cases.some(c => c.id === obj.activeCaseId)
            ? obj.activeCaseId
            : (cases[0]?.id || null);

        setReqCase({ info: { ...requirement }, cases }, activeId);
    }
    function importFromV3Wrapped(obj) {
        const requirement = obj.project.requirement || {};
        const cases = (obj.project.cases || []).map(normalizeCase);

        const exportedAt = obj.project.exportedAt || obj.project.exportDate || obj.exportedAt || obj.exportDate || new Date().toISOString();
        console.log('🧭 v3-wrapped detectado. exportedAt:', exportedAt);

        const activeId = obj.activeCaseId && cases.some(c => c.id === obj.activeCaseId)
            ? obj.activeCaseId
            : (cases[0]?.id || null);

        setReqCase({ info: { ...requirement }, cases }, activeId);
    }
    function importFromLegacy(obj) {
        const info = obj.requirementInfo || {};
        const scenarios = (obj.testCases || obj.cases || []).map(s => ({
            ...s,
            id: s.id || genId(),
            evidence: normalizeEvidenceArr(s.evidence)
        }));
        const singleCase = {
            id: genId(),
            caseNumber: 1,
            title: info?.caseTitle || info?.titleCase || 'Caso 1',
            objective: info?.objective || '',
            inputVariableNames: Array.isArray(obj.inputVariableNames)
                ? [...obj.inputVariableNames]
                : (Array.isArray(window.inputVariableNames) ? [...window.inputVariableNames] : []),
            scenarios
        };
        setReqCase({ info: { ...info }, cases: [singleCase] }, singleCase.id);
        console.log('🧭 legacy detectado. Convertido a multicaso 1:1.');
    }

    async function applyAndRefreshUI() {
        // Stats primero para que la UI no se caiga
        try { if (typeof updateRequirementStats === 'function') updateRequirementStats(currentRequirement); } catch { }
        // Proxies/compat
        try { if (typeof ensureRequirementInfoProxy === 'function') ensureRequirementInfoProxy(); } catch { }
        try { if (typeof ensureTestCasesProxy === 'function') ensureTestCasesProxy(); } catch { }

        // Hidratar caso activo
        try { if (typeof switchToCase === 'function' && currentCaseId) switchToCase(currentCaseId); } catch { }

        // Guardar y refrescar UI
        try { if (typeof saveMulticaseData === 'function') saveMulticaseData(); } catch { }
        try { if (typeof updateMulticaseUI === 'function') updateMulticaseUI(); } catch { }
        try { if (typeof renderTestCases === 'function') renderTestCases(); } catch { }
        try { if (typeof updateStats === 'function') updateStats(); } catch { }
        try { if (typeof updateRequirementButtons === 'function') updateRequirementButtons(); } catch { }
        try { if (typeof updateTabsContextual === 'function') updateTabsContextual(); } catch { }
    }

    // Auto-detecta formato y delega. Reemplaza TODO el proyecto.
    // Acepta: File | string | undefined (si no le pasan nada, abre file picker)
    window.importProjectJSONAuto = async function importProjectJSONAuto(fileOrText) {
        async function pickJsonFile() {
            return new Promise(resolve => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json';
                input.onchange = () => resolve(input.files?.[0] || null);
                input.click();
            });
        }

        let text;
        try {
            if (fileOrText === undefined || fileOrText === null) {
                const file = await pickJsonFile();
                if (!file) return;
                text = await file.text();
            } else if (typeof fileOrText === 'string') {
                text = fileOrText;
            } else if (fileOrText instanceof Blob || fileOrText instanceof File) {
                text = await fileOrText.text();
            } else {
                alert('Entrada no válida para importación.');
                return;
            }
        } catch (e) {
            console.error("❌ Error leyendo archivo:", e);
            alert("❌ No se pudo leer el archivo JSON");
            return;
        }

        let obj;
        try {
            obj = JSON.parse(text);
        } catch {
            alert('JSON inválido.');
            return;
        }

        // Backup del estado anterior
        try {
            localStorage.setItem(
                'currentRequirement_backup_' + Date.now(),
                JSON.stringify(typeof currentRequirement !== 'undefined' ? currentRequirement : null)
            );
        } catch { }

        // Normalizar e importar (tolerante a exportDate y falta de type)
        if (isV3Flat(obj)) {
            console.log('🔎 Import JSON: detectado v3-flat');
            importFromV3Flat(obj);
        } else if (isV3Wrapped(obj)) {
            console.log('🔎 Import JSON: detectado v3-wrapped');
            importFromV3Wrapped(obj);
        } else if (isLegacy(obj)) {
            console.log('🔎 Import JSON: detectado legacy → conversión 1 caso');
            importFromLegacy(obj);
        } else {
            alert('Formato de archivo inválido.\nDebe ser un JSON v3 multicase (se acepta exportDate y falta de type) o legacy válido.');
            return;
        }

        await applyAndRefreshUI();

        // Resumen
        const totalCases = (currentRequirement?.cases || []).length;
        const totalScenarios = (currentRequirement?.cases || [])
            .reduce((acc, c) => acc + (c.scenarios?.length || 0), 0);
        alert(`✅ Proyecto importado: ${totalCases} caso(s), ${totalScenarios} escenario(s).`);
    };

    // Abridor del file picker para JSON (botón Cargar JSON)
    window.loadTestCases = function () {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                await window.importProjectJSONAuto(file); // Reemplaza TODO el proyecto
            } catch (err) {
                console.error('Error en importación JSON:', err);
                alert('❌ Error importando JSON: ' + (err?.message || err));
            }
        };
        input.click();
    };
})();



// --------- EXPORTAR A EXCEL (caso activo) ----------
async function exportToExcel() {
    if (!currentRequirement || !currentCaseId) {
        alert("⚠️ No hay requerimiento/caso activo para exportar");
        return;
    }

    // Sincronizar antes de exportar
    if (typeof saveMulticaseData === "function") saveMulticaseData();

    const activeCase = (currentRequirement.cases || []).find(c => c.id === currentCaseId);
    const scenarios = Array.isArray(activeCase?.scenarios) ? activeCase.scenarios : [];
    const varNames = Array.isArray(activeCase?.inputVariableNames) ? activeCase.inputVariableNames : ['Variable 1', 'Variable 2'];

    const workbook = new ExcelJS.Workbook();

    // ===== Hoja 1: Información del Requerimiento =====
    const reqSheet = workbook.addWorksheet("Información del Requerimiento");

    const titleRow = reqSheet.addRow(["INFORMACIÓN DEL REQUERIMIENTO"]);
    titleRow.eachCell(cell => {
        cell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "667EEA" } };
        cell.alignment = { horizontal: "center" };
    });
    reqSheet.mergeCells('A1:D1');
    reqSheet.addRow([]);

    const info = currentRequirement.info || {};
    const reqRows = [
        ["N° Requerimiento:", info.number || ""],
        ["Nombre:", info.name || ""],
        ["Descripción:", info.description || ""],
        ["N° Caso:", activeCase?.caseNumber || ""],
        ["Titulo Caso:", activeCase?.title || (info.titleCase || "")],
        ["Tester Principal:", info.tester || ""],
        ["Fecha de Inicio:", info.startDate || ""],
    ];
    reqRows.forEach(r => reqSheet.addRow(r));
    reqSheet.getColumn(1).width = 20;
    reqSheet.getColumn(2).width = 80;
    for (let row = 3; row <= 8; row++) {
        const rowObj = reqSheet.getRow(row);
        rowObj.getCell(1).font = { bold: true };
        rowObj.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F0F0" } };
    }

    // ===== Hoja 2: Escenarios del caso activo =====
    const sheet = workbook.addWorksheet("Escenarios de Prueba");

    const headers = [
        "Ciclo",
        "N° Escenario",
        "Descripción",
        ...varNames,
        "Resultado Esperado",
        "Resultado Obtenido",
        "Fecha Ejecución",
        "Observaciones",
        "N° Error/Bug",
        "Tester",
        "Tiempo (min)",
        "Evidencias"
    ];
    sheet.addRow(headers).eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "667EEA" } };
        cell.alignment = { horizontal: "center" };
    });

    // Filtrar SOLO IMÁGENES (jpg/jpeg/png) en export
    function isImageEvidence(ev) {
        const mime = (ev?.mime || "").toLowerCase();
        const name = (ev?.name || "").toLowerCase();
        return mime.startsWith("image/") ||
            name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png");
    }

    // Agregar filas de la tabla principal
    scenarios.forEach(tc => {
        const evidenceCount = Array.isArray(tc.evidence)
            ? tc.evidence.filter(isImageEvidence).length
            : 0;

        const row = [
            tc.cycleNumber || "",
            tc.scenarioNumber || "",
            tc.description || "",
            ...varNames.map(vn => {
                const iv = (tc.inputVariables || []).find(x => x?.name === vn);
                return iv ? (iv.value ?? "") : "";
            }),
            tc.obtainedResult || "",
            tc.status || "",
            tc.executionDate || "",
            tc.observations || "",
            tc.errorNumber || "",
            tc.tester || "",
            parseFloat(tc.testTime) || 0,
            evidenceCount > 0 ? `${evidenceCount} archivos` : "Sin evidencias"
        ];
        sheet.addRow(row);
    });

    // Espacio antes de evidencias
    for (let i = 0; i < 5; i++) sheet.addRow([]);

    // Agrupar escenarios con imágenes por ciclo
    const scenariosWithImgs = scenarios
        .map(s => ({ ...s, images: (s.evidence || []).filter(isImageEvidence) }))
        .filter(s => s.images.length > 0);

    const byCycle = {};
    scenariosWithImgs.forEach(s => {
        const c = s.cycleNumber || "Sin Ciclo";
        byCycle[c] = byCycle[c] || [];
        byCycle[c].push(s);
    });

    const cycleNumbers = Object.keys(byCycle)
        .map(x => x)
        .sort((a, b) => parseInt(a) - parseInt(b));

    for (let cIndex = 0; cIndex < cycleNumbers.length; cIndex++) {
        const cycle = cycleNumbers[cIndex];

        // Línea amarilla: CICLO
        const yellowRowData = new Array(40).fill("");
        yellowRowData[0] = `CICLO ${cycle}`;
        const yellowRow = sheet.addRow(yellowRowData);
        for (let col = 1; col <= 40; col++) {
            const cell = yellowRow.getCell(col);
            cell.font = { bold: true, color: { argb: "000000" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
            cell.alignment = { horizontal: "center" };
        }

        const scenList = byCycle[cycle];
        for (let si = 0; si < scenList.length; si++) {
            const s = scenList[si];

            // Línea negra: Escenario N
            const blackRowData = new Array(40).fill("");
            blackRowData[0] = `Escenario ${s.scenarioNumber || "-"}`;
            const blackRow = sheet.addRow(blackRowData);
            for (let col = 1; col <= 40; col++) {
                const cell = blackRow.getCell(col);
                cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };
                cell.alignment = { horizontal: "center" };
            }

            // Insertar imágenes (convertidas a PNG si vienen en base64 con otro mime soportado)
            for (const ev of s.images) {
                const base64 = ev?.data || "";
                if (!base64.startsWith("data:image/")) continue; // seguridad adicional

                const imgId = workbook.addImage({
                    base64: base64,
                    extension: "png" // ExcelJS acepta png/jpg; usamos png por simplicidad
                });

                const rowNumber = sheet.lastRow.number;
                sheet.addImage(imgId, {
                    tl: { col: 0, row: rowNumber },
                    ext: { width: 300, height: 150 }
                });

                // Espacio tras cada imagen
                for (let i = 0; i < 10; i++) sheet.addRow([]);
            }

            // Separación extra entre escenarios
            if (si < scenList.length - 1) {
                for (let i = 0; i < 20; i++) sheet.addRow([]);
            }
        }

        // Separación extra entre ciclos
        if (cIndex < cycleNumbers.length - 1) {
            for (let i = 0; i < 30; i++) sheet.addRow([]);
        }
    }

    // Ancho de columnas
    sheet.columns.forEach(col => { col.width = 15; });

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-AR', { hour12: false });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Casos de Prueba ${hora}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    console.log("✅ Exportación Excel completada (solo imágenes)");
    setTimeout(() => alert("✅ Excel exportado (solo imágenes)"), 350);
}

// =====================================================
// EXCEL - Exportar TODO el proyecto (Requerimiento + TODOS los casos como hojas)
// Mantiene el layout de cada hoja de caso igual al export del caso activo actual.
// =====================================================

// Helpers compatibles con tu export actual
function __isImageEvidence(ev) {
    const mime = (ev?.mime || "").toLowerCase();
    const name = (ev?.name || "").toLowerCase();
    return mime.startsWith("image/") ||
        name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png");
}
function __valueToHours(v) {
    const n = parseFloat(v ?? 0);
    if (!isFinite(n) || n <= 0) return 0;
    // Si guarda minutos, típicamente > 24 → pasamos a horas. Si son horas, <= 24 → dejamos.
    return n > 24 ? (n / 60) : n;
}
function __safeSheetName(name) {
    const invalid = /[\\\/\?\*\[\]\:]/g;
    let s = (name || "Hoja").replace(invalid, " ").trim();
    if (s.length > 31) s = s.slice(0, 31);
    if (!s) s = "Hoja";
    return s;
}

// Construye Hoja 1 (Requerimiento) con totales
function __buildRequirementSheetAll(workbook, requirementInfo, allCases) {
    const reqSheet = workbook.addWorksheet("Información del Requerimiento");

    const titleRow = reqSheet.addRow(["INFORMACIÓN DEL REQUERIMIENTO"]);
    titleRow.eachCell(cell => {
        cell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "667EEA" } };
        cell.alignment = { horizontal: "center" };
    });
    reqSheet.mergeCells('A1:D1');
    reqSheet.addRow([]);

    const totalCases = Array.isArray(allCases) ? allCases.length : 0;
    // Total de horas: suma de todos los escenarios de todos los casos
    const totalHours = (allCases || []).reduce((sum, c) => {
        const scs = Array.isArray(c?.scenarios) ? c.scenarios : [];
        return sum + scs.reduce((s, sc) => s + __valueToHours(sc?.testTime), 0);
    }, 0);

    const info = requirementInfo || {};
    const rows = [
        ["N° Requerimiento:", info.number || ""],
        ["Nombre:", info.name || ""],
        ["Descripción:", info.description || ""],
        ["Cantidad de Casos Totales:", totalCases],
        ["Horas Totales:", Number(totalHours.toFixed(2))],
        ["Tester Principal:", info.tester || ""],
        ["Fecha de Inicio:", info.startDate || ""],
    ];
    rows.forEach(r => reqSheet.addRow(r));

    reqSheet.getColumn(1).width = 26;
    reqSheet.getColumn(2).width = 80;
    for (let row = 3; row < 3 + rows.length; row++) {
        const rowObj = reqSheet.getRow(row);
        rowObj.getCell(1).font = { bold: true };
        rowObj.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F0F0" } };
    }
}

// Construye una hoja por caso, replicando tu layout de un caso
function __buildCaseSheet(workbook, caseObj) {
    const varNames = Array.isArray(caseObj?.inputVariableNames) && caseObj.inputVariableNames.length
        ? caseObj.inputVariableNames
        : ['Variable 1', 'Variable 2'];
    const scenarios = Array.isArray(caseObj?.scenarios) ? caseObj.scenarios : [];

    const title = caseObj?.title ? `Caso ${caseObj.caseNumber || ""} - ${caseObj.title}` : `Caso ${caseObj.caseNumber || ""}`;
    const sheetNameBase = __safeSheetName(title.trim() || "Caso");
    let sheetName = sheetNameBase;

    // Evitar duplicados de nombre de hoja
    let suffix = 2;
    while (workbook.worksheets.some(ws => ws.name === sheetName)) {
        const candidate = __safeSheetName(`${sheetNameBase} (${suffix++})`);
        sheetName = candidate;
    }

    const sheet = workbook.addWorksheet(sheetName);

    // Header
    const headers = [
        "Ciclo",
        "N° Escenario",
        "Descripción",
        ...varNames,
        "Resultado Esperado",
        "Resultado Obtenido",
        "Fecha Ejecución",
        "Observaciones",
        "N° Error/Bug",
        "Tester",
        "Tiempo (min)",
        "Evidencias"
    ];
    sheet.addRow(headers).eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "667EEA" } };
        cell.alignment = { horizontal: "center" };
    });

    // Filas de la tabla
    scenarios.forEach(tc => {
        const evidenceCount = Array.isArray(tc.evidence)
            ? tc.evidence.filter(__isImageEvidence).length
            : 0;

        const row = [
            tc.cycleNumber || "",
            tc.scenarioNumber || "",
            tc.description || "",
            ...varNames.map(vn => {
                const iv = (tc.inputVariables || []).find(x => x?.name === vn);
                return iv ? (iv.value ?? "") : "";
            }),
            tc.obtainedResult || "",
            tc.status || "",
            tc.executionDate || "",
            tc.observations || "",
            tc.errorNumber || "",
            tc.tester || "",
            parseFloat(tc.testTime) || 0,
            evidenceCount > 0 ? `${evidenceCount} archivos` : "Sin evidencias"
        ];
        sheet.addRow(row);
    });

    // Espacio antes de evidencias
    for (let i = 0; i < 5; i++) sheet.addRow([]);

    // Imágenes agrupadas: por ciclo (amarillo) y escenario (negro)
    const scenariosWithImgs = scenarios
        .map(s => ({ ...s, images: (s.evidence || []).filter(__isImageEvidence) }))
        .filter(s => s.images.length > 0);

    // Agrupar por ciclo
    const byCycle = {};
    scenariosWithImgs.forEach(s => {
        const c = s.cycleNumber || "Sin Ciclo";
        byCycle[c] = byCycle[c] || [];
        byCycle[c].push(s);
    });

    const cycleNumbers = Object.keys(byCycle)
        .map(x => x)
        .sort((a, b) => parseInt(a) - parseInt(b));

    for (let cIndex = 0; cIndex < cycleNumbers.length; cIndex++) {
        const cycle = cycleNumbers[cIndex];

        // Línea amarilla: CICLO
        const yellowRowData = new Array(40).fill("");
        yellowRowData[0] = `CICLO ${cycle}`;
        const yellowRow = sheet.addRow(yellowRowData);
        for (let col = 1; col <= 40; col++) {
            const cell = yellowRow.getCell(col);
            cell.font = { bold: true, color: { argb: "000000" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
            cell.alignment = { horizontal: "center" };
        }

        const scenList = byCycle[cycle];
        for (let si = 0; si < scenList.length; si++) {
            const s = scenList[si];

            // Línea negra: Escenario N
            const blackRowData = new Array(40).fill("");
            blackRowData[0] = `Escenario ${s.scenarioNumber || "-"}`;
            const blackRow = sheet.addRow(blackRowData);
            for (let col = 1; col <= 40; col++) {
                const cell = blackRow.getCell(col);
                cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };
                cell.alignment = { horizontal: "center" };
            }

            // Insertar imágenes
            for (const ev of s.images) {
                const base64 = ev?.data || "";
                if (!base64.startsWith("data:image/")) continue;

                const imgId = workbook.addImage({
                    base64: base64,
                    extension: "png"
                });

                const rowNumber = sheet.lastRow.number;
                sheet.addImage(imgId, {
                    tl: { col: 0, row: rowNumber },
                    ext: { width: 300, height: 150 }
                });

                // Espacio tras cada imagen
                for (let i = 0; i < 10; i++) sheet.addRow([]);
            }

            // Separación entre escenarios
            if (si < scenList.length - 1) {
                for (let i = 0; i < 20; i++) sheet.addRow([]);
            }
        }

        // Separación entre ciclos
        if (cIndex < cycleNumbers.length - 1) {
            for (let i = 0; i < 30; i++) sheet.addRow([]);
        }
    }

    // Anchos
    sheet.columns.forEach(col => { col.width = 15; });
}

// Exporta TODO: Hoja 1 + una hoja por cada caso
async function exportAllCasesToExcel() {
    if (!currentRequirement || !Array.isArray(currentRequirement.cases)) {
        alert("⚠️ No hay proyecto para exportar");
        return;
    }
    if (typeof saveMulticaseData === "function") saveMulticaseData();

    const workbook = new ExcelJS.Workbook();

    // Hoja 1
    __buildRequirementSheetAll(workbook, currentRequirement.info || {}, currentRequirement.cases || []);

    // Hoja por cada caso
    for (const c of currentRequirement.cases) {
        __buildCaseSheet(workbook, c);
    }

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Proyecto_Testing_${stamp}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    console.log("✅ Exportación Excel (todo el proyecto) lista");
    setTimeout(() => alert("✅ Excel exportado: Requerimiento + TODOS los casos"), 350);
}




// --------- IMPORTAR DESDE EXCEL (reemplaza todo por 1 caso) ----------
window.importFromExcel = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';

    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        showImportProgress('📂 Leyendo archivo Excel...');
        const reader = new FileReader();
        reader.onload = function (ev) {
            processExcelFile(ev.target.result, file.name)
                .catch(err => {
                    console.error('Error al procesar Excel:', err);
                    alert('❌ Error al procesar el archivo Excel:\n' + err.message);
                })
                .finally(() => hideImportProgress());
        };
        reader.readAsArrayBuffer(file);
    };

    input.click();
};

async function processExcelFile(arrayBuffer, fileName) {
    showImportProgress('🔍 Analizando estructura del Excel...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    if (workbook.worksheets.length === 0) {
        throw new Error('El archivo Excel no contiene hojas de trabajo');
    }

    // Hoja Requerimiento (1) y Hoja Escenarios (2)
    const reqSheet = workbook.worksheets.find(s =>
        s.name.toLowerCase().includes('requerimiento') ||
        s.name.toLowerCase().includes('información') ||
        s.name.toLowerCase().includes('info')
    ) || workbook.worksheets[0];

    const scenSheet = workbook.worksheets.find(s =>
        s.name.toLowerCase().includes('escenario') ||
        s.name.toLowerCase().includes('prueba') ||
        s.name.toLowerCase().includes('casos')
    ) || workbook.worksheets[workbook.worksheets.length - 1];

    showImportProgress('📋 Leyendo información del requerimiento...');
    const reqInfo = parseRequirementInfoFixed(reqSheet);

    showImportProgress('📊 Parseando tabla principal...');
    const { cases: parsedScenarios, variableNames } = parseMainTable(scenSheet);

    if (parsedScenarios.length === 0) {
        throw new Error('No se encontraron escenarios válidos en la hoja de escenarios');
    }

    showImportProgress('🖼️ Extrayendo imágenes del workbook...');
    const allImages = await extractAllImagesWithPositions(workbook); // base64
    // Solo imágenes png/jpg/jpeg
    const imgOnly = allImages.filter(im => {
        const name = (im?.name || "").toLowerCase();
        return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
    });

    showImportProgress('🔎 Leyendo distribución de evidencias desde la tabla...');
    const evidenceInfo = await getEvidenceInfoFromTable(scenSheet);

    // Asignación: tomar imágenes en orden y distribuir por la cuenta esperada
    let idx = 0;
    const groups = [];
    evidenceInfo.forEach(ci => {
        const imgs = [];
        for (let i = 0; i < ci.evidenceCount && idx < imgOnly.length; i++) {
            imgs.push(imgOnly[idx++]);
        }
        groups.push({ cycle: ci.cycle, scenario: ci.scenario, images: imgs });
    });

    showImportProgress('🔗 Asociando evidencias a escenarios...');
    associateEvidencesWithCases(parsedScenarios, groups);

    // Construimos un v3 nuevo (reemplaza TODO con un solo caso)
    const migratedCase = {
        id: `case_${Date.now()}`,
        caseNumber: "1",
        title: reqInfo?.titleCase || "Caso 1",
        objective: "Importado desde Excel",
        inputVariableNames: variableNames.length ? variableNames : ['Variable 1', 'Variable 2'],
        scenarios: parsedScenarios
    };

    const v3 = {
        version: "3.0",
        type: "multicase-project",
        exportedAt: new Date().toISOString(),
        requirement: {
            number: reqInfo?.number || "",
            name: reqInfo?.name || "",
            description: reqInfo?.description || "",
            caso: reqInfo?.caso || "",
            titleCase: reqInfo?.titleCase || "",
            tester: reqInfo?.tester || "",
            startDate: reqInfo?.startDate || ""
        },
        cases: [migratedCase]
    };

    showImportProgress('💾 Aplicando datos (reemplaza TODO)...');
    applyImportedV3(v3, fileName); // usa el importador v3 que ya reemplaza TODO
    console.log('✅ Importación Excel completada');
}

// ----------------- Helpers Excel -----------------
function showImportProgress(message) {
    let progressModal = document.getElementById('importProgressModal');
    if (!progressModal) {
        progressModal = document.createElement('div');
        progressModal.id = 'importProgressModal';
        progressModal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(5px);">
        <div style="background:white;padding:30px;border-radius:15px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3);min-width:300px;">
          <div style="width:40px;height:40px;border:4px solid #667eea;border-top:4px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
          <h3 style="margin:0 0 10px 0;color:#2c3e50;">Importando Excel</h3>
          <p id="importProgressText" style="margin:0;color:#7f8c8d;">Iniciando...</p>
        </div>
      </div>
      <style>@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}</style>
    `;
        document.body.appendChild(progressModal);
    }
    const text = document.getElementById('importProgressText');
    if (text) text.textContent = message;
}

function hideImportProgress() {
    const el = document.getElementById('importProgressModal');
    if (el) el.remove();
}

function findColumnIndex(columnNames, searchTerms) {
    for (const term of searchTerms) {
        const found = columnNames.find(col => col.name.toLowerCase().includes(term.toLowerCase()));
        if (found) return found.index;
    }
    return null;
}

function getCellValue(row, columnIndex) {
    if (!columnIndex) return '';
    const cell = row.getCell(columnIndex);
    if (!cell || !cell.value) return '';
    if (typeof cell.value === 'object' && cell.value.text) {
        return cell.value.text.toString().trim();
    }
    return cell.value.toString().trim();
}

function parseRequirementInfoFixed(sheet) {
    try {
        const requirement = { number: '', name: '', description: '', caso: '', titleCase: '', tester: '', startDate: '' };
        for (let row = 1; row <= 15; row++) {
            const rowObj = sheet.getRow(row);
            for (let col = 1; col <= 5; col++) {
                const labelCell = rowObj.getCell(col);
                const valueCell = rowObj.getCell(col + 1);
                if (!labelCell.value) continue;
                const label = labelCell.value.toString().toLowerCase().trim();
                const value = valueCell.value ? valueCell.value.toString().trim() : '';
                if ((label.includes('requerimiento') || label.includes('req')) && (label.includes('n°') || label.includes('numero') || label.includes('número'))) requirement.number = value;
                else if (label.includes('nombre') && !label.includes('tester')) requirement.name = value;
                else if (label.includes('descripción') || label.includes('descripcion')) requirement.description = value;
                else if (label.includes('titulo caso') || label.includes('título caso')) requirement.titleCase = value;
                else if ((label.includes('n°') && label.includes('caso')) || (label.includes('numero') && label.includes('caso')) || (label.includes('número') && label.includes('caso'))) requirement.caso = value;
                else if (label.includes('tester') || label.includes('probador')) requirement.tester = value;
                else if (label.includes('fecha') && label.includes('inicio')) requirement.startDate = value;
            }
        }
        const hasData = Object.values(requirement).some(v => v && v.trim());
        return hasData ? requirement : null;
    } catch {
        return null;
    }
}

function parseMainTable(sheet) {
    // localizar header
    let headerRow = null;
    let headerRowIndex = 1;
    for (let row = 1; row <= 10; row++) {
        const firstCell = sheet.getCell(row, 1).value;
        if (firstCell && (firstCell.toString().toLowerCase().includes('ciclo') || firstCell.toString().toLowerCase() === 'ciclo')) {
            headerRow = sheet.getRow(row);
            headerRowIndex = row;
            break;
        }
    }
    if (!headerRow) throw new Error('No se encontró la fila de encabezados (esperaba "Ciclo")');

    const columnNames = [];
    for (let col = 1; col <= 50; col++) {
        const cellValue = headerRow.getCell(col).value;
        if (cellValue && cellValue.toString().trim()) {
            columnNames.push({ index: col, name: cellValue.toString().trim() });
        } else if (col > 15) break;
    }

    const idx = {
        ciclo: findColumnIndex(columnNames, ['ciclo']),
        escenario: findColumnIndex(columnNames, ['escenario', 'n° escenario', 'numero escenario']),
        descripcion: findColumnIndex(columnNames, ['descripcion', 'descripción']),
        esperado: findColumnIndex(columnNames, ['resultado esperado', 'esperado']),
        obtenido: findColumnIndex(columnNames, ['resultado obtenido', 'obtenido']),
        fecha: findColumnIndex(columnNames, ['fecha ejecucion', 'fecha ejecución', 'fecha']),
        obs: findColumnIndex(columnNames, ['observaciones', 'observacion']),
        error: findColumnIndex(columnNames, ['error', 'bug', 'n° error']),
        tester: findColumnIndex(columnNames, ['tester', 'probador']),
        tiempo: findColumnIndex(columnNames, ['tiempo', 'min', 'minutos']),
        evidencias: findColumnIndex(columnNames, ['evidencias', 'evidencia', 'archivos'])
    };

    // variables dinámicas entre Descripción y Resultado Esperado
    const variableNames = [];
    const descIndex = idx.descripcion;
    const expectedIndex = idx.esperado;
    if (descIndex && expectedIndex && expectedIndex > descIndex + 1) {
        for (let i = descIndex + 1; i < expectedIndex; i++) {
            const varCol = columnNames.find(c => c.index === i);
            if (varCol) variableNames.push(varCol.name);
        }
    }

    const cases = [];
    let currentRow = headerRowIndex + 1;
    while (currentRow <= sheet.rowCount) {
        const row = sheet.getRow(currentRow);
        const cicloValue = row.getCell(idx.ciclo || 1).value;
        if (!cicloValue || cicloValue.toString().trim() === '') break;

        const firstCellValue = row.getCell(1).value;
        if (firstCellValue && firstCellValue.toString().toUpperCase().includes('CICLO')) break;

        const tc = {
            id: Date.now() + Math.random(),
            cycleNumber: getCellValue(row, idx.ciclo),
            scenarioNumber: getCellValue(row, idx.escenario),
            description: getCellValue(row, idx.descripcion),
            obtainedResult: getCellValue(row, idx.esperado),
            status: getCellValue(row, idx.obtenido),
            executionDate: getCellValue(row, idx.fecha),
            observations: getCellValue(row, idx.obs),
            errorNumber: getCellValue(row, idx.error),
            tester: getCellValue(row, idx.tester),
            testTime: parseFloat(getCellValue(row, idx.tiempo)) || 0,
            inputVariables: [],
            evidence: []
        };

        variableNames.forEach((vn, i) => {
            const varIndex = descIndex + 1 + i;
            tc.inputVariables.push({ name: vn, value: getCellValue(row, varIndex) || '' });
        });

        cases.push(tc);
        currentRow++;
    }

    return { cases, variableNames };
}

async function extractAllImagesWithPositions(workbook) {
    const images = [];
    try {
        if (workbook.model && workbook.model.media && workbook.model.media.length > 0) {
            for (let i = 0; i < workbook.model.media.length; i++) {
                const media = workbook.model.media[i];
                if (!media || !media.buffer) continue;
                const uint8Array = new Uint8Array(media.buffer);
                const binary = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
                const base64 = btoa(binary);
                const ext = (media.extension || 'png').toLowerCase();
                const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
                images.push({
                    name: `Evidencia_${i + 1}.${ext}`,
                    data: `data:${mimeType};base64,${base64}`,
                    originalIndex: i
                });
            }
        }
    } catch (e) {
        console.error('extractAllImagesWithPositions error:', e);
    }
    return images;
}

async function getEvidenceInfoFromTable(sheet) {
    let headerRow = null;
    let headerRowIndex = 1;
    for (let row = 1; row <= 10; row++) {
        const firstCell = sheet.getCell(row, 1).value;
        if (firstCell && firstCell.toString().toLowerCase().includes('ciclo')) {
            headerRow = sheet.getRow(row);
            headerRowIndex = row;
            break;
        }
    }
    if (!headerRow) throw new Error('No se encontró la fila de headers');

    const columnNames = [];
    for (let col = 1; col <= 20; col++) {
        const cellValue = headerRow.getCell(col).value;
        if (cellValue && cellValue.toString().trim()) {
            columnNames.push({ index: col, name: cellValue.toString().trim() });
        }
    }

    const cicloIndex = findColumnIndex(columnNames, ['ciclo']);
    const escenarioIndex = findColumnIndex(columnNames, ['escenario', 'n° escenario']);
    const evidenciasIndex = findColumnIndex(columnNames, ['evidencias', 'evidencia', 'archivos']);

    const info = [];
    let currentRow = headerRowIndex + 1;
    while (currentRow <= sheet.rowCount) {
        const row = sheet.getRow(currentRow);
        const ciclo = getCellValue(row, cicloIndex);
        const escenario = getCellValue(row, escenarioIndex);
        const evTxt = getCellValue(row, evidenciasIndex);

        if (!ciclo || ciclo.trim() === '') break;
        if (ciclo.toString().toUpperCase().includes('CICLO')) break;

        let evidenceCount = 0;
        if (evTxt) {
            const t = evTxt.toLowerCase();
            if (t.includes('sin evidencias') || t.includes('0 archivos')) {
                evidenceCount = 0;
            } else {
                const m = t.match(/(\d+)/);
                if (m) evidenceCount = parseInt(m[1]);
            }
        }

        if (evidenceCount > 0) {
            info.push({ cycle: ciclo.toString().trim(), scenario: escenario.toString().trim(), evidenceCount, row: currentRow });
        }
        currentRow++;
    }
    return info;
}

function associateEvidencesWithCases(cases, evidences) {
    evidences.forEach(group => {
        const { cycle, scenario, images } = group;
        const match = cases.find(tc =>
            (tc.cycleNumber ?? "").toString().trim() === cycle.toString().trim() &&
            (tc.scenarioNumber ?? "").toString().trim() === scenario.toString().trim()
        );
        if (match) match.evidence = images;
    });
}

// =====================================================
// 🔓 Exponer funciones al scope global (después de definir TODO)
// - Va AL FINAL del archivo y FUERA de cualquier IIFE.
// - Se ata a DOMContentLoaded para asegurarnos que el archivo cargó completo.
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        // JSON v3
        if (typeof exportProjectJSONv3 === 'function') {
            window.exportProjectJSONv3 = exportProjectJSONv3;
        }
        if (typeof importProjectJSONAuto === 'function') {
            window.importProjectJSONAuto = importProjectJSONAuto;
        }

        // Excel (si existen)
        if (typeof exportToExcel === 'function') {
            window.exportToExcel = exportToExcel;
        }
        if (typeof importFromExcel === 'function') {
            window.importFromExcel = importFromExcel;
        }
        if (typeof exportAllCasesToExcel === 'function') {
            window.exportAllCasesToExcel = exportAllCasesToExcel;
        }

        console.log('🧩 exportImport.js listo (funciones globales expuestas)');
    } catch (e) {
        console.error('❌ Error exponiendo funciones globales:', e);
    }
});


