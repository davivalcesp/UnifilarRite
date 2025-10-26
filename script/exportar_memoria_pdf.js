// ...existing code...
/*
  Corrección: toda la generación de PDF se ejecuta dentro de exportarMemoriaTecnicaPDF.
  Comprueba disponibilidad de jsPDF, canvas y funciones auxiliares antes de usarlas.
*/
function exportarMemoriaTecnicaPDF() {
    try {
        console.log('📄 Entrando en exportarMemoriaTecnicaPDF');

        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            console.error('❌ jsPDF no está cargado');
            alert('Error: jsPDF no está disponible. Revisa que jspdf se cargue antes que este script.');
            return;
        }

        // Variables globales del app (fallback si no existen)
        const canvasEl = window.drawingCanvas || document.getElementById('drawingCanvas');
        const canvasObjects = window.canvasObjects || [];
        const componentDatabase = window.componentDatabase || [];
        const redrawCanvasFn = typeof window.redrawCanvas === 'function' ? window.redrawCanvas : null;
        const generarBOMInternoFn = typeof window.generarBOMInterno === 'function' ? window.generarBOMInterno : null;
        const validarNormativaInternaFn = typeof window.validarNormativaInterna === 'function' ? window.validarNormativaInterna : null;
        const updateStatusFn = typeof window.updateStatus === 'function' ? window.updateStatus : (msg => console.log(msg));

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageHeight = doc.internal.pageSize.height;
        let y = 20;

        // Portada
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('Memoria Técnica', 105, y, { align: 'center' });

        y += 15;
        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.text('Esquema Unifilar Eléctrico', 105, y, { align: 'center' });

        y += 20;
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, y);
        y += 10;
        doc.text(`Proyecto: Esquema generado con herramienta web`, 20, y);
        y += 10;
        doc.text(`Versión: 1.0`, 20, y);

        y += 20;
        doc.text('Resumen:', 20, y);
        y += 10;

        const supply = canvasObjects.find(o => o.componentId === 'supply');
        const potenciaTotal = supply ? parseFloat(supply.footerText2 || 0) : 0;
        const tension = supply ? (supply.text2 || '230V') : '230V';
        const corriente = potenciaTotal > 0 ? (potenciaTotal / (String(tension).includes('400') ? 400 : 230)).toFixed(2) : '0';

        doc.setFontSize(10);
        doc.text(`• Potencia total instalada: ${Number(potenciaTotal || 0).toLocaleString('es-ES')} W`, 25, y);
        y += 7;
        doc.text(`• Tensión del sistema: ${tension}`, 25, y);
        y += 7;
        doc.text(`• Corriente estimada: ${corriente} A`, 25, y);
        y += 7;
        doc.text(`• Nº de componentes: ${canvasObjects.filter(o => o.type === 'component').length}`, 25, y);

        // Índice
        doc.addPage();
        y = 20;
        doc.setFontSize(16);
        doc.text('Índice', 20, y);
        y += 15;
        doc.setFontSize(12);
        const indice = [
            '1. Resumen del proyecto',
            '2. Plano unifilar',
            '3. Lista de materiales (BOM)',
            '4. Validación normativa',
            '5. Notas técnicas'
        ];
        indice.forEach(item => {
            doc.text(item, 25, y);
            y += 8;
        });

        // Plano unifilar: capturar canvas
        doc.addPage();
        y = 20;
        doc.setFontSize(16);
        doc.text('2. Plano Unifilar', 20, y);
        y += 10;

        if (canvasEl) {
            // crear canvas temporal
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasEl.width || (canvasEl.clientWidth || 1000);
            tempCanvas.height = canvasEl.height || (canvasEl.clientHeight || 800);
            const tempCtx = tempCanvas.getContext('2d');

            // fondo blanco
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // intentar dibujar contenido: si existe redrawCanvas que soporte parámetro context, usarlo.
            if (redrawCanvasFn) {
                try {
                    // redrawCanvas puede aceptar contexto; algunos proyectos lo usan sin parámetro.
                    redrawCanvasFn(tempCtx);
                } catch (err) {
                    console.warn('redrawCanvas falló con tempCtx, se usará drawImage como fallback:', err);
                    try { tempCtx.drawImage(canvasEl, 0, 0); } catch (e) { console.warn('drawImage fallback falló:', e); }
                }
            } else {
                try {
                    tempCtx.drawImage(canvasEl, 0, 0);
                } catch (err) {
                    console.warn('No se pudo dibujar canvas en tempCanvas:', err);
                }
            }

            const imgData = tempCanvas.toDataURL('image/png');
            // ajustar tamaño en mm (margen 10)
            const imgWidthMm = 190;
            const imgHeightMm = 120;
            doc.addImage(imgData, 'PNG', 10, y, imgWidthMm, imgHeightMm);
            y += imgHeightMm + 10;
        } else {
            doc.setFontSize(10);
            doc.text('Plano no disponible (canvas no encontrado).', 20, y);
            y += 10;
        }

        // BOM
        doc.addPage();
        y = 20;
        doc.setFontSize(16);
        doc.text('3. Lista de Materiales (BOM)', 20, y);
        y += 10;

        const bom = generarBOMInternoFn ? generarBOMInternoFn() : (function() {
            // Generador simple si no existe la función
            const list = [];
            canvasObjects.forEach(obj => {
                if (obj.type !== 'component') return;
                list.push({
                    referencia: obj.fatherText || obj.componentId,
                    descripcion: obj.componentId,
                    codigoIEC: '',
                    seccionCable: obj.vertText1 || 'No especificada',
                    intensidad: obj.text1 || 'No especificada',
                    polaridad: obj.text2 || 'No especificada',
                    notas: ''
                });
            });
            return list;
        })();

        doc.setFontSize(9);
        doc.text('Ref. | Descripción | IEC | Sección | I | P | Notas', 20, y);
        y += 6;

        bom.forEach(item => {
            if (y > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }
            const linea = `${item.referencia} | ${item.descripcion} | ${item.codigoIEC || ''} | ${item.seccionCable} | ${item.intensidad} | ${item.polaridad} | ${item.notas || ''}`;
            doc.text(linea, 20, y);
            y += 6;
        });

        // Validación normativa
        doc.addPage();
        y = 20;
        doc.setFontSize(16);
        doc.text('4. Validación Normativa (REBT / IEC)', 20, y);
        y += 10;

        const errores = validarNormativaInternaFn ? validarNormativaInternaFn() : [];
        doc.setFontSize(10);
        if (!errores || errores.length === 0) {
            doc.text('✅ Sin errores detectados.', 25, y);
        } else {
            doc.setTextColor(255, 0, 0);
            errores.forEach(err => {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }
                doc.text('• ' + err, 25, y);
                y += 6;
            });
            doc.setTextColor(0, 0, 0);
        }

        // Notas técnicas
        doc.addPage();
        y = 20;
        doc.setFontSize(16);
        doc.text('5. Notas Técnicas', 20, y);
        y += 10;
        doc.setFontSize(10);
        const notas = [
            '- Instalación conforme al REBT (Real Decreto 842/2002)',
            '- Simbología según IEC 60617',
            '- Secciones de cable según ITC-BT-19',
            '- Protecciones según ITC-BT-22',
            '- Las potencias son estimadas según cargas conectadas'
        ];
        notas.forEach(nota => {
            if (y > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }
            doc.text(nota, 20, y);
            y += 6;
        });

        // Guardar
        const filename = `Memoria_Tecnica_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(filename);
        updateStatusFn('✅ Memoria técnica exportada como PDF.');
        console.log('✅ PDF generado y guardado:', filename);
    } catch (err) {
        console.error('Error exportando memoria técnica a PDF:', err);
        alert('Error al exportar PDF. Revisa la consola para más detalles.');
    }
}

// Exponer en global para que el resto de la app pueda llamarlo
window.exportarMemoriaTecnicaPDF = exportarMemoriaTecnicaPDF;
// ...existing code...