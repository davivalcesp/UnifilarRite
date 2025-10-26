// 📋 GENERADOR DE LISTA DE MATERIALES (BOM)
function generarBOM() {
    const bom = [];

    canvasObjects.forEach(obj => {
        if (obj.type !== 'component') return;

        const compInfo = componentDatabase.find(c => c.id === obj.componentId);
        if (!compInfo) return;

        const item = {
            referencia: obj.fatherText || compInfo.name,
            cantidad: 1,
            descripcion: compInfo.name,
            codigoIEC: getCodigoIEC(obj.componentId),
            seccionCable: obj.vertText1 || 'No especificada',
            intensidad: obj.text1 || 'No especificada',
            polaridad: obj.text2 || 'No especificada',
            notas: getNotasInstalacion(obj)
        };

        bom.push(item);
    });

    mostrarBOMEnPanel(bom);
    exportarBOMCSV(bom);
}

function getCodigoIEC(tipo) {
    const mapa = {
        supply: 'IEC 60617-02-01',
        breaker: 'IEC 60617-07-01',
        rcd: 'IEC 60617-07-14',
        contactorNO: 'IEC 60617-07-04',
        contactorNA: 'IEC 60617-07-05',
        seccionador: 'IEC 60617-03-01',
        tranfo: 'IEC 60617-06-01',
        Stension: 'IEC 60617-02-09',
        conmutador: 'IEC 60617-03-03',
        Contador: 'IEC 60617-05-01',
        Relog: 'IEC 60617-12-01',
        SAI: 'IEC 60617-02-07',
        Bcondesa: 'IEC 60617-07-08',
        CGP: 'IEC 60617-02-02',
        Grupo: 'IEC 60617-03-04'
    };
    return mapa[tipo] || 'IEC desconocido';
}

function getNotasInstalacion(obj) {
    const notas = [];
    if (obj.componentId === 'breaker') {
        const I = parseInt(obj.text1);
        if (I > 63) notas.push('Revisar dissipación térmica');
        if (obj.text2 === '4P') notas.push('Verificar desfase de fases');
    }
    if (obj.componentId === 'rcd' && obj.text3 === '30mA') {
        notas.push('Protección personal obligatoria (REBT BT-24)');
    }
    if (obj.vertText1 && obj.vertText1.includes('mm²')) {
        const mm2 = parseFloat(obj.vertText1);
        if (mm2 < 2.5) notas.push('Sección mínima 2.5 mm² para circuitos de fuerza (REBT BT-19)');
    }
    return notas.join(' | ');
}

function mostrarBOMEnPanel(bom) {
    const panel = document.getElementById('bomPanel');
    if (!panel) {
        crearPanelBOM();
        return;
    }

    let html = `
        <h3>Lista de Materiales (BOM)</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="width:100%; font-size:12px;">
            <thead>
                <tr>
                    <th>Referencia</th>
                    <th>Cantidad</th>
                    <th>Descripción</th>
                    <th>Código IEC</th>
                    <th>Sección Cable</th>
                    <th>Intensidad</th>
                    <th>Polaridad</th>
                    <th>Notas</th>
                </tr>
            </thead>
            <tbody>
    `;

    bom.forEach(item => {
        html += `
            <tr>
                <td>${item.referencia}</td>
                <td>${item.cantidad}</td>
                <td>${item.descripcion}</td>
                <td>${item.codigoIEC}</td>
                <td>${item.seccionCable}</td>
                <td>${item.intensidad}</td>
                <td>${item.polaridad}</td>
                <td>${item.notas}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    panel.innerHTML = html;
}

function crearPanelBOM() {
    const div = document.createElement('div');
    div.id = 'bomPanel';
    div.style.cssText = `
        position: fixed;
        top: 60px;
        right: 10px;
        width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
    `;
    document.body.appendChild(div);
}

function exportarBOMCSV(bom) {
    const csv = [
        ['Referencia', 'Cantidad', 'Descripción', 'Código IEC', 'Sección Cable', 'Intensidad', 'Polaridad', 'Notas'],
        ...bom.map(item => [
            item.referencia,
            item.cantidad,
            item.descripcion,
            item.codigoIEC,
            item.seccionCable,
            item.intensidad,
            item.polaridad,
            item.notas
        ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'BOM_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
}

// ⚠️ VALIDACIÓN NORMATIVA (REBT / IEC)
function validarNormativa() {
    const errores = [];

    canvasObjects.forEach(obj => {
        if (obj.type !== 'component') return;

        // Validar breaker
        if (obj.componentId === 'breaker') {
            const I = parseInt(obj.text1);
            const curve = obj.text3;
            if (!curve || !['B', 'C', 'D', 'K', 'Z'].includes(curve)) {
                errores.push(`⚠️ Breaker sin curva de desconexión válida (REBT BT-22)`);
            }
            if (I > 125) {
                errores.push(`⚠️ Breaker >125A requiere sección mínima 50mm² (REBT BT-19)`);
            }
        }

        // Validar RCD
        if (obj.componentId === 'rcd') {
            const sens = obj.text3;
            if (sens !== '30mA') {
                errores.push(`⚠️ RCD debe ser 30mA para protección personal (REBT BT-24)`);
            }
        }

        // Validar sección de cable
        if (obj.vertText1) {
            const mm2 = parseFloat(obj.vertText1);
            if (mm2 < 1.5) {
                errores.push(`⚠️ Sección mínima 1.5mm² para circuitos de mando (REBT BT-19)`);
            }
        }

        // Validar conexión a tierra
        if (obj.componentId === 'supply' && !tieneConexionTierra(obj)) {
            errores.push(`❌ Falta conexión a tierra en el origen (REBT BT-18)`);
        }
    });

    mostrarValidacion(errores);
}

function tieneConexionTierra(obj) {
    // Verificar si hay alguna conexión a un punto de tierra
    return connections.some(conn => 
        conn.from.component === obj && 
        conn.from.point.type === 'output' &&
        conn.to.component.componentId === 'tierra'
    );
}

function mostrarValidacion(errores) {
    const panel = document.getElementById('validacionPanel');
    if (!panel) {
        crearPanelValidacion();
        return;
    }

    if (errores.length === 0) {
        panel.innerHTML = `<h3>✅ Validación RBT/IEC</h3><p>Sin errores detectados.</p>`;
        return;
    }

    let html = `<h3>⚠️ Validación RBT/IEC</h3><ul>`;
    errores.forEach(err => html += `<li>${err}</li>`);
    html += `</ul>`;
    panel.innerHTML = html;
}

function crearPanelValidacion() {
    const div = document.createElement('div');
    div.id = 'validacionPanel';
    div.style.cssText = `
        position: fixed;
        top: 60px;
        left: 10px;
        width: 320px;
        max-height: 60vh;
        overflow-y: auto;
        background: #fff8e1;
        border: 1px solid #ffb74d;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        font-size: 12px;
    `;
    document.body.appendChild(div);
}

// 🔘 Botones en la interfaz
function agregarBotonesNormativa() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    const div = document.createElement('div');
    div.style.marginTop = '10px';
    div.innerHTML = `
        <button onclick="generarBOM()" class="tool-btn">📋 Generar BOM</button>
        <button onclick="validarNormativa()" class="tool-btn">⚠️ Validar REBT</button>
    `;
    toolbar.appendChild(div);
}

// ✅ Llamar al cargar la app
document.addEventListener('DOMContentLoaded', () => {
    agregarBotonesNormativa();
});