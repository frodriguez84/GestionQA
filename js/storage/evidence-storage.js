// ===============================================
// EVIDENCE-STORAGE.JS - Almacenamiento de evidencias (API async)
// Nota: IndexedDB está deshabilitado en IndexedDBManager; usamos localStorage como respaldo
// Reemplazable por IndexedDB sin romper la API
// ===============================================

(function(){
    const EVIDENCE_PREFIX = 'evidence:'; // Clave base en localStorage
    const hasIndexedDB = typeof window.IndexedDBManager !== 'undefined';

    async function saveEvidence(fileName, mime, dataUrl) {
        try {
            const id = generateUniqueId ? generateUniqueId() : (Date.now() + Math.random().toString(36).slice(2));
            const key = EVIDENCE_PREFIX + id;
            const record = { id, name: fileName || 'archivo', mime: mime || '', data: dataUrl || '', createdAt: new Date().toISOString() };
            if (hasIndexedDB && window.IndexedDBManager.isInitialized()) {
                try {
                    await putEvidenceIndexedDB(record);
                } catch (idbErr) {
                    const serialized = (typeof compressData === 'function') ? compressData(record) : JSON.stringify(record);
                    localStorage.setItem(key, serialized);
                }
            } else {
                const serialized = (typeof compressData === 'function') ? compressData(record) : JSON.stringify(record);
                localStorage.setItem(key, serialized);
            }
            return { id, name: record.name, mime: record.mime };
        } catch (e) {
            console.error('❌ saveEvidence:', e);
            throw e;
        }
    }

    async function getEvidence(evidenceId) {
        try {
            const key = EVIDENCE_PREFIX + evidenceId;
            if (hasIndexedDB && window.IndexedDBManager.isInitialized()) {
                try {
                    const rec = await getEvidenceIndexedDB(evidenceId);
                    if (rec) return rec;
                } catch (e) { /* fallback a LS */ }
            }
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const record = (typeof decompressData === 'function') ? decompressData(raw) : JSON.parse(raw);
            return record;
        } catch (e) {
            console.error('❌ getEvidence:', e);
            return null;
        }
    }

    async function deleteEvidence(evidenceId) {
        try {
            const key = EVIDENCE_PREFIX + evidenceId;
            if (hasIndexedDB && window.IndexedDBManager.isInitialized()) {
                try { await deleteEvidenceIndexedDB(evidenceId); } catch (e) { /* continuar */ }
            }
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('❌ deleteEvidence:', e);
            return false;
        }
    }

    // Helpers para escenarios: convertir array de evidencias [{name,data,mime}] -> referencias [{id,name,mime}]
    async function saveEvidenceList(evidences) {
        const refs = [];
        for (const ev of (evidences || [])) {
            const ref = await saveEvidence(ev.name, ev.mime, ev.data);
            refs.push(ref);
        }
        return refs;
    }

    // ================= IndexedDB backend =================
    async function putEvidenceIndexedDB(record) {
        return window.IndexedDBManager.putData(window.IndexedDBManager.STORE_NAMES.EVIDENCES, record);
    }

    async function getEvidenceIndexedDB(id) {
        return window.IndexedDBManager.getData(window.IndexedDBManager.STORE_NAMES.EVIDENCES, id);
    }

    async function deleteEvidenceIndexedDB(id) {
        return window.IndexedDBManager.deleteData(window.IndexedDBManager.STORE_NAMES.EVIDENCES, id);
    }

    function getDB(){
        // acceso al db interno del manager
        // no expone db directamente; usamos apertura directa
        // como ya está inicializado, podemos reabrir una conexión
        const req = indexedDB.open('GestorCP_DB', 2);
        // Nota: para simplicidad, devolvemos la conexión sin cache; en producción, cachear.
        // Aquí asumimos init ya corrió.
        // Pero como la API IndexedDB es async, exponemos una capa sync arriba
        // resolviendo por transacción directa en cada operación.
        // Este helper no se usa directamente; cada función abre su propia conexión via tx.
        // Mantener para referencia.
        return window.__gestorcp_idb || (window.__gestorcp_idb = (function(){
            // conexión perezosa
            // esta conexión no es usada; las operaciones crean su propio tx desde open
            return null;
        })());
    }

    window.EvidenceStorage = {
        saveEvidence,
        getEvidence,
        deleteEvidence,
        saveEvidenceList
    };
})();
