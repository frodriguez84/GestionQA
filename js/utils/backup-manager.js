(function(){
    const MAX_BACKUPS = 3;
    const PREFIX = 'backup:'; // backup:{scope}:{entityId}:ts
    const META_PREFIX = 'backupmeta:'; // backupmeta:{scope}:{entityId} -> [timestamps]

    function compress(text) {
        try { return window.LZString ? window.LZString.compressToUTF16(text) : text; } catch(_) { return text; }
    }

    function decompress(text) {
        try { return window.LZString ? window.LZString.decompressFromUTF16(text) || text : text; } catch(_) { return text; }
    }

    function snapshotKey(scope, id, ts) {
        return `${PREFIX}${scope}:${id}:${ts}`;
    }

    function metaKey(scope, id) {
        return `${META_PREFIX}${scope}:${id}`;
    }

    function readMeta(scope, id) {
        try { return JSON.parse(localStorage.getItem(metaKey(scope, id)) || '[]'); } catch(_) { return []; }
    }

    function writeMeta(scope, id, arr) {
        try { localStorage.setItem(metaKey(scope, id), JSON.stringify(arr)); } catch(_) {}
    }

    function createSnapshot(scope, id, dataObj) {
        try {
            if (!scope || !id || !dataObj) return false;
            const ts = Date.now();
            const key = snapshotKey(scope, id, ts);
            const payload = {
                scope,
                id,
                ts,
                version: (window.appVersionInfo && window.appVersionInfo.version) || null,
                data: compress(JSON.stringify(dataObj))
            };
            localStorage.setItem(key, JSON.stringify(payload));

            const list = readMeta(scope, id);
            list.unshift(ts);
            while (list.length > MAX_BACKUPS) {
                const oldTs = list.pop();
                try { localStorage.removeItem(snapshotKey(scope, id, oldTs)); } catch(_) {}
            }
            writeMeta(scope, id, list);
            return true;
        } catch (error) {
            console.error('⚠️ BackupManager.createSnapshot error:', error);
            return false;
        }
    }

    function listSnapshots(scope, id) {
        return readMeta(scope, id).map(ts => ({ ts, key: snapshotKey(scope, id, ts) }));
    }

    function restoreLatest(scope, id) {
        try {
            const list = readMeta(scope, id);
            if (!list.length) return null;
            const ts = list[0];
            const raw = localStorage.getItem(snapshotKey(scope, id, ts));
            if (!raw) return null;
            const payload = JSON.parse(raw);
            const json = decompress(payload.data);
            return JSON.parse(json);
        } catch (error) {
            console.error('⚠️ BackupManager.restoreLatest error:', error);
            return null;
        }
    }

    window.BackupManager = {
        createSnapshot,
        listSnapshots,
        restoreLatest
    };
})();


