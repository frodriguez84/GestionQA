📋 Sistema de Gestión de Casos de Prueba – PWA
🎯 ¿Qué es esta aplicación?

Una Progressive Web App (PWA) para equipos de QA que necesitan planificar, ejecutar y documentar pruebas de forma simple y ordenada.
Funciona offline una vez instalada y cada tester trabaja con sus propios datos (independientes del resto).

✨ Funcionalidades Principales

📊 Gestión completa
✅ Crear, editar y eliminar Casos y Escenarios
✅ Organización por Ciclos de testing (Ciclo 1: ejecución inicial; Ciclos 2+: regresión)
✅ Renumeración consistente en Ciclo 1 (la regresión respeta numeración original)
✅ Estados visuales de escenarios: Pendiente (dorado), OK (verde), NO (rojo)
✅ Duplicar escenarios para acelerar la carga

⏱️ Cronometraje integrado
✅ Cronómetro por escenario
✅ Solo un cronómetro activo a la vez
✅ Suma de tiempos con pausa/reanudar
✅ Edición manual del tiempo si hace falta

🔧 Variables dinámicas
✅ Variables de entrada por Caso, aplican a todos sus escenarios
✅ Se adaptan a distintos tipos de proyectos
✅ Se muestran como columnas en tablas y reportes

📎 Evidencias
✅ Adjuntar imágenes (JPG/PNG/JPEG) por escenario
✅ Adjuntar documentos (PDF/TXT/DOC/DOCX) por escenario
✅ Vista previa y descarga desde la app

📈 Estadísticas en tiempo real
✅ Casos Totales del proyecto
✅ Escenarios totales / OK / NO / Pendientes
✅ Ciclos ejecutados
✅ Tiempos acumulados y métricas listas para reportes

🔍 Filtros y navegación
✅ Búsqueda por texto (descripción, tester, observaciones)
✅ Filtro por tester, estado y ciclo
✅ Filtro por rango de fechas
✅ Mostrar/ocultar escenarios no relevantes
✅ Navegación rápida entre Casos del Requerimiento
✅ Selección múltiple (acciones masivas)
✅ Seleccionar varios escenarios con checkboxes
✅ Edición masiva de campos comunes
✅ Eliminar en lote (con confirmación)
✅ Ocultar temporalmente escenarios seleccionados

🧭 Reordenamiento (drag & drop)
✅ Arrastrar y soltar escenarios para reordenar
✅ Mantiene la integridad de la numeración y ciclos
✅ Feedback visual claro

🧾 Reportes
Por Caso: vista previa + PDF del caso activo
Global: vista previa + PDF con todo el Requerimiento
Casos Totales
Escenarios totales / OK / NO / Pendientes
Tiempo total (en horas)
Ciclos ejecutados y tasa de éxito
Análisis de tiempo (promedio por escenario y total por ciclo)
Bugs encontrados (agrupados por caso, con referencia de escenario)
Escenarios para re-testing (último ciclo en NO)

📤 Exportaciones
Excel (todo el proyecto):
Hoja 1: datos del Requerimiento + Cantidad de Casos Totales + Horas Totales
Una hoja por cada Caso: tabla completa de Escenarios con variables
Al final de cada hoja: imágenes de evidencias agrupadas por Ciclo y Escenario
(Exporta solo imágenes; los demás archivos se conservan en el JSON)
JSON v3: guarda todo (Requerimiento, todos los Casos, todos los Escenarios y todas las evidencias)

📥 Importaciones
JSON: carga un proyecto completo y reemplaza todo el contenido actual

🌐 PWA (modo app)
✅ Instalable en desktop y móvil
✅ Funciona sin conexión
✅ Actualizaciones rápidas
✅ Ideal para testers en campo

⚠️ Limitaciones actuales
Los datos se guardan localmente en el navegador de cada usuario (no hay sincronización entre dispositivos/usuarios)
Hacer backups regulares desde “Guardar JSON”
Importar Excel: deshabilitado temporalmente (se puede reactivar más adelante)

🚀 Instalación
Opción 1 — Como PWA (recomendada)
Abrí la app en tu navegador
Tocá “Instalar” (icono en la barra de direcciones)
Confirmá la instalación
¡Listo! La app queda disponible offline

Opción 2 — Hosting compartido
Publicá la app en un hosting (ej.: Vercel, Netlify, GitHub Pages)
Compartí el enlace con el equipo
Cada tester accede e instala la PWA desde su dispositivo

📖 Manual de uso
1) Configuración inicial

Información del Requerimiento: desde el botón ⚙️ del header
Completá N° de Requerimiento, Nombre, Descripción, Tester Principal, Fecha de inicio

Variables por Caso: definí las variables de entrada que verás como columnas al cargar escenarios

2) Cargar Casos y Escenarios
Creá Casos según tus frentes de prueba
En cada Caso, agregá Escenarios:
Ciclo (1 = ejecución inicial; 2+ = regresión)
N° de Escenario (se sugiere el siguiente)
Descripción, Tester, Resultados y Observaciones
Evidencias (imágenes y/o documentos)
Tiempo (cronómetro o carga manual)

3) Ejecutar y controlar
Cambiá el estado del escenario: OK / NO / Pendiente
Usá el cronómetro del escenario (solo uno activo a la vez)
Duplicá escenarios para acelerar la carga de casos similares
Reordená escenarios con arrastrar y soltar

4) Filtrar y revisar
Filtrá por tester, estado, ciclo y fechas
Buscá por texto libre
Ocultá temporalmente escenarios fuera de alcance

5) Reportes
Generar Reporte (caso activo) desde la pestaña Gestión
Reporte Global desde el botón 📊 Reportes del header
Previsualizá y descargá en PDF (con fecha y hora)

6) Exportar / Guardar / Cargar
Exportar Excel (todo el proyecto) para compartir con stakeholders
Guardar JSON para backup completo
Cargar JSON para restaurar o migrar (recuerda: reemplaza todo)

💡 Tips y buenas prácticas
Ciclo 1: numeración secuencial; Ciclos 2+: respetan numeración original
Nombrá bien las evidencias (facilita los reportes y el Excel)
Antes de grandes cambios, hacé un backup JSON
Si trabajás offline, recordá exportar o guardar al finalizar

📬 Soporte y feedback

¿Preguntas o ideas? Contactá al equipo de QA.
¡Que tengan excelentes testing! 🚀

Versión: 2.2 PWA · Última actualización: Septiembre 2025
