(function(){
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const CLEAN_INTERVAL_MS = 7 * ONE_DAY_MS; // semanal
    const LAST_CLEAN_KEY = 'app:lastStorageCleanAt';

    const knownPrefixes = [
        'multicase_',
        'case_',
        'scenario_',
        'evidence_',
        'compressedMulticaseData',
        'activeRequirementId',
        'dashboard_',
        'sync_',
        'tmp_',
    ];

    function now() { return Date.now(); }

    function shouldRun() {
        try {
            const last = parseInt(localStorage.getItem(LAST_CLEAN_KEY) || '0', 10);
            return !last || (now() - last) > CLEAN_INTERVAL_MS;
        } catch (_) { return true; }
    }

    function isObsoleteKey(key) {
        if (!key) return false;
        // Claves temporales o de sesiones anteriores
        if (key.startsWith('tmp_')) return true;
        if (key.endsWith(':backup_old')) return true;
        if (key.endsWith(':old')) return true;
        if (key.startsWith('sync_queue:')) return true;
        // Claves de versiones legacy conocidas
        if (key === 'compressedMulticaseData_v1') return true;
        return false;
    }

    function safeParse(json) {
        try { return JSON.parse(json); } catch(_) { return null; }
    }

    function maybePruneBackups(key, value) {
        // Mantener solo N backups rotativos por clave base
        const MAX_BACKUPS = 3;
        if (!key.includes(':backup:')) return;
        const [base] = key.split(':backup:');
        const backups = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(base + ':backup:')) {
                const ts = parseInt(k.split(':backup:')[1] || '0', 10);
                backups.push({ k, ts });
            }
        }
        backups.sort((a,b)=> b.ts - a.ts);
        for (let i = MAX_BACKUPS; i < backups.length; i++) {
            try { localStorage.removeItem(backups[i].k); } catch(_) {}
        }
    }

    function cleanLocalStorage() {
        let removed = 0;
        try {
            // Primero, barrer por claves obsoletas
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k) keys.push(k);
            }
            for (const key of keys) {
                if (isObsoleteKey(key)) {
                    try { localStorage.removeItem(key); removed++; } catch(_) {}
                    continue;
                }
                // Podar backups antiguos
                maybePruneBackups(key);
            }

            // Marcar última ejecución
            localStorage.setItem(LAST_CLEAN_KEY, String(now()));
        } catch (error) {
            console.error('⚠️ storage-cleaner: error limpiando', error);
        }
        return removed;
    }

    function scheduleClean() {
        const run = () => { try { cleanLocalStorage(); } catch(_) {} };
        if (window.requestIdleCallback) {
            requestIdleCallback(() => setTimeout(run, 0), { timeout: 1500 });
        } else {
            setTimeout(run, 1200);
        }
    }

    function init() {
        try {
            if (!shouldRun()) return;
            scheduleClean();
        } catch(_) {}
    }

    window.StorageCleaner = { init, cleanLocalStorage };
    try { init(); } catch(_) {}
})();


