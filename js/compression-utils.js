// ===============================================
// 🗜️ FUNCIONES DE COMPRESIÓN - UTILIDADES
// ===============================================

/**
 * Comprime datos usando LZ-string
 */
function compressData(data) {
    if (typeof LZString !== 'undefined') {
        const jsonString = JSON.stringify(data);
        const compressed = LZString.compress(jsonString);
        // console.log(`🗜️ Comprimido: ${jsonString.length} → ${compressed.length} bytes (${((1 - compressed.length/jsonString.length) * 100).toFixed(1)}% reducción)`);
        return compressed;
    } else {
        console.warn('⚠️ LZString no disponible, usando JSON sin comprimir');
        return JSON.stringify(data);
    }
}

/**
 * Descomprime datos usando LZ-string
 */
function decompressData(compressedData) {
    if (typeof LZString !== 'undefined') {
        // Intentar descomprimir primero
        try {
            const decompressed = LZString.decompress(compressedData);
            if (decompressed) {
                return JSON.parse(decompressed);
            }
        } catch (e) {
            // Si falla la descompresión, probablemente no está comprimido
        }
    }
    
    // Fallback: parsear como JSON normal
    try {
        return JSON.parse(compressedData);
    } catch (e) {
        console.error('❌ Error parseando JSON:', e);
        console.error('❌ Datos problemáticos:', compressedData.substring(0, 100));
        throw e;
    }
}

// Hacer las funciones disponibles globalmente
window.compressData = compressData;
window.decompressData = decompressData;
