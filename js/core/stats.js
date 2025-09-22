// ===============================================
// STATS.JS - Cálculo unificado de estadísticas con memoización
// ===============================================

(function(){
    function stableId(value) {
        try {
            if (value && typeof value === 'object') {
                return value.id || value._id || value.key || null;
            }
            return null;
        } catch (_) { return null; }
    }

    function calcCaseStats(caseObj) {
        const scenarios = (caseObj && Array.isArray(caseObj.scenarios)) ? caseObj.scenarios : [];
        const totalScenarios = scenarios.length;
        let totalOK = 0, totalNO = 0, totalPending = 0;
        let totalHours = 0;
        const cycles = new Set();

        for (let i = 0; i < scenarios.length; i++) {
            const s = scenarios[i] || {};
            const st = s.status || '';
            if (st === 'OK') totalOK++; else if (st === 'NO') totalNO++; else totalPending++;
            totalHours += parseFloat(s.testTime) || 0;
            if (s.cycleNumber) cycles.add(s.cycleNumber);
        }

        return {
            totalScenarios,
            totalHours,
            totalOK,
            totalNO,
            totalPending,
            successRate: totalScenarios > 0 ? Math.round((totalOK / totalScenarios) * 100) : 0,
            cycles: Array.from(cycles)
        };
    }

    function calcRequirementStats(requirement) {
        const cases = (requirement && Array.isArray(requirement.cases)) ? requirement.cases : [];
        const allScenarios = [];
        let totalHours = 0, totalOK = 0, totalNO = 0, totalPending = 0;

        for (let i = 0; i < cases.length; i++) {
            const c = cases[i] || {};
            const s = Array.isArray(c.scenarios) ? c.scenarios : [];
            allScenarios.push.apply(allScenarios, s);
            const cs = c.stats || calcCaseStats(c);
            totalHours += cs.totalHours || 0;
            totalOK += cs.totalOK || 0;
            totalNO += cs.totalNO || 0;
            totalPending += cs.totalPending || 0;
        }

        const totalCases = cases.length;
        const totalScenarios = allScenarios.length;
        const allCycles = new Set(allScenarios.map(s => s && s.cycleNumber).filter(Boolean));

        return {
            totalCases,
            totalScenarios,
            totalHours,
            totalOK,
            totalNO,
            totalPending,
            successRate: totalScenarios > 0 ? Math.round((totalOK / totalScenarios) * 100) : 0,
            activeCycles: Array.from(allCycles).sort((a,b)=> (parseInt(a)||0)-(parseInt(b)||0))
        };
    }

    const memo = new WeakMap();

    function getRequirementStatsMemo(requirement) {
        try {
            if (!requirement || typeof requirement !== 'object') return calcRequirementStats(requirement);
            const key = requirement;
            const fingerprint = JSON.stringify({
                updatedAt: requirement.updatedAt || null,
                cases: (requirement.cases || []).map(c => ({ id: stableId(c) || c.id || null, updatedAt: c.updatedAt || null, len: (c.scenarios || []).length }))
            });
            const entry = memo.get(key);
            if (entry && entry.fp === fingerprint) return entry.stats;
            const stats = calcRequirementStats(requirement);
            memo.set(key, { fp: fingerprint, stats });
            return stats;
        } catch (_) {
            return calcRequirementStats(requirement);
        }
    }

    window.Stats = {
        calcCaseStats,
        calcRequirementStats,
        getRequirementStatsMemo
    };
})();


