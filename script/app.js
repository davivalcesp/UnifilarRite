
function calcularPotenciaMagnetotermico() {
    const intensityEl = document.getElementById('breakerIntensity');
    const polarityEl = document.getElementById('breakerPolarity');
    const outSpan = document.getElementById('potenciaSoportada');

    if (!intensityEl || !polarityEl || !outSpan) {
        console.warn('Elementos no encontrados para cálculo de potencia');
        return;
    }

    // Obtener intensidad (quitar 'A' y convertir a número)
    const intensityStr = intensityEl.value;
    const I = parseFloat(intensityStr.replace('A', ''));

    // Obtener polaridad y determinar voltaje
    const polarity = polarityEl.value;
    const isMono = polarity === '1P' || polarity === '2P';
    const V = isMono ? 230 : 400;

    // Calcular potencia: P = V * I para mono, P = √3 * V * I para tri
    const potencia = isMono ? V * I : Math.sqrt(3) * V * I;
    const potenciaRound = Math.round(potencia);

    // Actualizar span con formato
    outSpan.textContent = potenciaRound.toLocaleString('es-ES') + ' W';
    
    console.log('Cálculo potencia:', { I, polarity, V, potencia: potenciaRound });
    return potenciaRound;
}

// Asegurar que la función esté disponible globalmente
window.calcularPotenciaMagnetotermico = calcularPotenciaMagnetotermico;

// Añadir al init o DOMContentLoaded para cálculo inicial
document.addEventListener('DOMContentLoaded', () => {
    // Cálculo inicial
    calcularPotenciaMagnetotermico();
    
    // Setup de observers para recálculo al abrir modal
    const modal = document.getElementById('propertiesModal');
    if (modal && window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'class' &&
                    modal.classList.contains('active')) {
                    calcularPotenciaMagnetotermico();
                }
            });
        });
        observer.observe(modal, { attributes: true });
    }
});




// Listeners para recalcular al cambiar selects y al abrir el modal
document.addEventListener('DOMContentLoaded', () => {
    const intensityEl = document.getElementById('breakerIntensity');
    const polarityEl = document.getElementById('breakerPolarity');
    const propsModal = document.getElementById('propertiesModal');
     


    if (intensityEl) intensityEl.addEventListener('change', calcularPotenciaMagnetotermico);
    if (polarityEl) polarityEl.addEventListener('change', calcularPotenciaMagnetotermico);

    // Si el modal se muestra añadiendo clase 'active', recalcular al abrir
    if (propsModal && window.MutationObserver) {
        const mo = new MutationObserver(() => {
            if (propsModal.classList.contains('active')) {
                calcularPotenciaMagnetotermico();
            }
        });
        mo.observe(propsModal, { attributes: true, attributeFilter: ['class'] });
    }

    // cálculo inicial
    calcularPotenciaMagnetotermico();
});




// --- Cálculo automático para supply  ---
function calcularSupplyAuto() {
    if (!selectedObject || selectedObject.componentId !== 'supply') return;
    
    const polaridad = document.getElementById('supplyPolarity').value;
    const voltajeStr = document.getElementById('supplyVoltage').value;
    const factorPotencia = 1; // Puedes hacerlo configurable si lo deseas
    if (!polaridad || !voltajeStr) return;

    // Determinar tensión numérica
    let tension = 230;
    if (voltajeStr.includes('400')) tension = 400;
    else if (voltajeStr.includes('380')) tension = 380;
    else if (voltajeStr.includes('230')) tension = 230;
    else if (voltajeStr.includes('220')) tension = 220;
    
    // ✅ CORREGIDO: Usar la misma lógica que calcularSumasRCD para obtener potencia aguas abajo
    let potenciaTotal = 0;
    
    // Buscar todos los componentes conectados aguas abajo del supply
    const componentesConectados = encontrarComponentesConectadosAguasAbajo(selectedObject);
    
    // Sumar todas las potencias de los componentes conectados
    componentesConectados.forEach(comp => {
        const potencia = parseFloat(comp.footerText2) || 0;
        potenciaTotal += potencia;
    });
    
    // Si no hay componentes conectados, usar valor por defecto
    if (potenciaTotal === 0) {
        potenciaTotal = 7500; // Valor por defecto si no hay nada conectado
    }

    // Corriente estimada
    let intensidadNum = 0;
    if (polaridad === 'F3+N' || polaridad === 'F3' || polaridad === 'F+F') {
        // Trifásico (400V)
        intensidadNum = Math.round(potenciaTotal / (Math.sqrt(3) * tension * factorPotencia));
    } else {
        // Monofásico (230V)
        intensidadNum = Math.round(potenciaTotal / (tension * factorPotencia));
    }

    // Sección recomendada (igual que breaker)
    const tablaSeccion = [
        { seccion: '1.5mm²', maxA: 15 },
        { seccion: '2.5mm²', maxA: 21 },
        { seccion: '4mm²', maxA: 27 },
        { seccion: '6mm²', maxA: 36 },
        { seccion: '10mm²', maxA: 50 },
        { seccion: '16mm²', maxA: 66 },
        { seccion: '25mm²', maxA: 84 },
        { seccion: '35mm²', maxA: 104 },
        { seccion: '50mm²', maxA: 125 },
        { seccion: '70mm²', maxA: 160 },
        { seccion: '95mm²', maxA: 194 },
        { seccion: '120mm²', maxA: 225 },
        { seccion: '150mm²', maxA: 260 }
    ];
    
    let seccionCable = '≥150mm²';
    for (let i = 0; i < tablaSeccion.length; i++) {
        if (intensidadNum <= tablaSeccion[i].maxA) {
            seccionCable = tablaSeccion[i].seccion;
            break;
        }
    }

    // ✅ NUEVO: Calcular protección recomendada
    const calibres = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 150, 175, 200, 225, 250];
    const proteccion = calibres.find(c => c >= intensidadNum) || '≥250A';

    // Actualizar textos del objeto seleccionado
    selectedObject.text1 = polaridad;
    selectedObject.text2 = voltajeStr;
    selectedObject.vertText1 = (polaridad === '4P' ? '4x(' : '3x(') + seccionCable + ')Cu';
    selectedObject.vertText2 = tension >= 400 ? 'XLPE 0.6/1KV' : 'PVC 450/750V';
    selectedObject.footerText2 = potenciaTotal.toString();
    // ✅ NUEVO: Usar text6 para mostrar información de cálculo
    selectedObject.text6 = `${intensidadNum}A | ${proteccion}`;
    
    // Actualizar también el input del modal
    const supplySection = document.getElementById('supplySection');
    let found = false;
    for (let i = 0; i < supplySection.options.length; i++) {
        if (supplySection.options[i].value === selectedObject.vertText1) {
            found = true;
            break;
        }
    }
    
    let autoOption = document.getElementById('autoSupplySection');
    if (!found) {
        if (!autoOption) {
            autoOption = document.createElement('option');
            autoOption.id = 'autoSupplySection';
            supplySection.appendChild(autoOption);
        }
        autoOption.value = selectedObject.vertText1;
        autoOption.textContent = selectedObject.vertText1 + ' (Auto)';
        supplySection.value = selectedObject.vertText1;
    } else {
        if (autoOption) {
            supplySection.removeChild(autoOption);
        }
        supplySection.value = selectedObject.vertText1;
    }
    
    document.getElementById('supplyIsolation').value = selectedObject.vertText2;
    
    // Redibujar
    redrawCanvas();
    
    // ✅ NUEVO: Mostrar información en consola para depuración
    console.log('🔌 Supply calculado:', {
        potenciaTotal,
        tension,
        intensidadNum,
        seccionCable,
        proteccion,
        componentesConectados: componentesConectados.length
    });
}
function recalcularSupply() {
    const supply = canvasObjects.find(obj => 
        obj.type === 'component' && obj.componentId === 'supply'
    );
    
    if (supply) {
        selectedObject = supply;
        calcularSupplyAuto();
        selectedObject = null; // Restaurar selección original si es necesario
    }
}

// Función para calcular la sección de cable recomendada
function calcularSeccionCable(intensidad) {
    // Convertir intensidad (ej: "10A" → 10)
    const intensidadNum = parseInt(intensidad.toString().replace('A', ''));
    
    // Tabla de secciones de cable, interruptor magnetotérmico recomendado
    const tablaSeccion = [
        { seccion: '1.5mm²', maxA: 15 },
        { seccion: '2.5mm²', maxA: 21 },
        { seccion: '4mm²', maxA: 27 },
        { seccion: '6mm²', maxA: 36 },
        { seccion: '10mm²', maxA: 50 },
        { seccion: '16mm²', maxA: 66 },
        { seccion: '25mm²', maxA: 84 },
        { seccion: '35mm²', maxA: 104 },
        { seccion: '50mm²', maxA: 125 },
        { seccion: '70mm²', maxA: 160 },
        { seccion: '95mm²', maxA: 194 },
        { seccion: '120mm²', maxA: 225 },
        { seccion: '150mm²', maxA: 260 }

    ];
    
    // Encontrar la sección adecuada
    let seccionCable = '≥150mm²';
    for (let i = 0; i < tablaSeccion.length; i++) {
        if (intensidadNum <= tablaSeccion[i].maxA) {
            seccionCable = tablaSeccion[i].seccion;
            break;
        }
    }
    
    return seccionCable;
}
// Función para calcular potencia basada en polaridad e intensidad
function calcularPotenciaDesdePolaridad(intensidad, polaridad) {
    // Convertir intensidad (ej: "10A" → 10)
    const intensidadNum = parseInt(intensidad.replace('A', ''));
    
    // Determinar tensión según polaridad
    let tension = 230;
    if (polaridad === '4P' || polaridad === '3P') {
        tension = 400;
    } else if (polaridad === '2P') {
        tension = 230;
    } else if (polaridad === '1P') {
        tension = 230;
    } else if (polaridad === 'F+N') {
        tension = 230;
    }
    
    // Calcular potencia (monofásico o trifásico)
    let potencia = 0;
    if (polaridad === '4P' || polaridad === '3P') {
        potencia = Math.round(Math.sqrt(3) * tension * intensidadNum);
    } else {
        potencia = Math.round(tension * intensidadNum);
    }
    
    return potencia.toString();
}






// --- C�lculo de sumas por RCD ---
function calcularSumasRCD() {
    const resultadosRCD = [];
    
    // Buscar todos los RCDs en el canvas
    const rcds = canvasObjects.filter(obj => 
        obj.type === 'component' && obj.componentId === 'rcd'
    );
    
    rcds.forEach(rcd => {
        // Obtener la fase seleccionada del RCD
        const fase = rcd.fase || 'F1'; // Valor por defecto si no est� definido
        
        // Buscar todos los componentes conectados aguas abajo de este RCD
        const componentesConectados = encontrarComponentesConectadosAguasAbajo(rcd);
        
        // Calcular sumas
        let sumaPotencia = 0;
        let sumaIntensidad = 0;
        
        componentesConectados.forEach(comp => {
            // Sumar potencia (footerText2)
            const potencia = parseFloat(comp.footerText2) || 0;
            sumaPotencia += potencia;
            
            // Sumar intensidad (extraer de text2 si es un breaker o similar)
            if (comp.text2 && comp.text1.includes('A')) {
                const intensidadStr = comp.text1.replace('A', '').trim();
                const intensidad = parseFloat(intensidadStr) || 0;
                sumaIntensidad += intensidad;
            }
        });
        
        resultadosRCD.push({
            rcd: rcd,
            fase: fase,
            sumaPotencia: sumaPotencia,
            sumaIntensidad: sumaIntensidad,
            cantidadComponentes: componentesConectados.length
        });
    });
    
    // Mostrar resultados en la tabla
    mostrarResultadosRCD(resultadosRCD);
    
    return resultadosRCD;
}


// --- Lógica automática para breaker ---
function guardarPreferenciaSeccion() {
    // Esta función puede guardar la preferencia en localStorage si es necesario
    console.log("Preferencia de sección cambiada");
}







function calcularBreakerAuto() {
    if (!selectedObject || selectedObject.componentId !== 'breaker') return;

    const intensidad = document.getElementById('breakerIntensity').value;
    const polaridad = document.getElementById('breakerPolarity').value;
    const potencia = parseFloat(document.getElementById("potencia").value);
    const length = parseFloat(document.getElementById("length").value);
    const breakerSection = document.getElementById('breakerSection');
    const breakerIsolation = document.getElementById('breakerIsolation');
    const advertencia = document.getElementById("advertenciaSeccion");
    const usarMinima = document.getElementById("usarSeccionMinima").checked;

    let tension, seccion;

    if (!intensidad || !polaridad || isNaN(potencia) || isNaN(length)) return;

    // Calcular tensión y sección mínima
    switch (polaridad) {
       case "1P":
        case "2P":
        case "F+N":
            tension = 230;
            seccion = (2 * potencia * length * 100) / (48 * 3 * tension * tension);
            break;
        case "3P":
        case "4P":
            tension = 400;
            seccion = (potencia * length * 100) / (48 * 3 * tension * tension);
            break;
        default:
            tension = 0;
            seccion = 0;
    }

    const seccionMinima = parseFloat(seccion.toFixed(2));

    // Calcular sección recomendada según intensidad
    let intensidadNum = parseInt(intensidad);
    let seccionRecomendada;

    if (intensidadNum <= 10) {
        seccionRecomendada = 1.5;
    } else if (intensidadNum <= 16) {
        seccionRecomendada = 2.5;
    } else if (intensidadNum <= 20) {
        seccionRecomendada = 4;
    } else if (intensidadNum <= 25) {
        seccionRecomendada = 6;
    } else if (intensidadNum <= 32) {
        seccionRecomendada = 10;
    } else if (intensidadNum <= 63) {
        seccionRecomendada = 16;
    } else if (intensidadNum <= 100) {
        seccionRecomendada = 35;
    } else if (intensidadNum <= 125) {
        seccionRecomendada = 50;
    } else if (intensidadNum <= 160) {
        seccionRecomendada = 70;
    } else if (intensidadNum <= 200) {
        seccionRecomendada = 95;
    } else if (intensidadNum <= 250) {
        seccionRecomendada = 120;
    } else {
        seccionRecomendada = 150;
    }

     // Mostrar advertencia si la mínima es inferior a la recomendada
    if (seccionMinima < seccionRecomendada) {
        advertencia.innerText = `⚠️ La sección mínima calculada (${seccionMinima} mm²) es inferior a la recomendada (${seccionRecomendada} mm²) para ${intensidadNum}A.`;
        advertencia.style.color = "red";
        advertencia.style.fontWeight = "bold";
    } else {
        advertencia.innerText = "";
    }

    // Determinar qué sección usar según la selección del usuario
    let seccionFinal;
    if (usarMinima) {
        seccionFinal = seccionMinima;
    } else {
        seccionFinal = seccionRecomendada;
    }

    // Actualizar el select con ambas opciones y seleccionar la correcta
    breakerSection.innerHTML = `
        <option value="">Cálculo automático</option>
        <option value="${seccionRecomendada}">S. recomendada: ${seccionRecomendada} mm²</option>
        <option value="${seccionMinima}">S. mínima: ${seccionMinima} mm²</option>
    `;
    
    // Seleccionar la opción correcta en el dropdown
    if (usarMinima) {
        breakerSection.value = seccionMinima;
    } else {
        breakerSection.value = seccionRecomendada;
    }

    // Aislamiento recomendado
    if (tension >= 400) {
        breakerIsolation.value = '0.6/1KV XLPE RZ1-K Cu';
    } else {
        breakerIsolation.value = 'PVC 450/750V H07V-K Cu';
    }

    // Actualizar el objeto seleccionado
    selectedObject.text1 = intensidad;
    selectedObject.text2 = polaridad;   
    selectedObject.text3 = document.getElementById('breakerCurve').value;
    selectedObject.text4 = document.getElementById('breakerCuttingPower').value;

    let textoSeccion;

    switch (polaridad) {
        case "1P":
        case "F+N":
            textoSeccion = ` 1 x ${seccionFinal} + tt ${seccionFinal} mm²) Cu`;
            break;
        case "2P":
            textoSeccion = ` 2 x ${seccionFinal} + tt ${seccionFinal} mm²) Cu`;
            break;
        case "3P":
            textoSeccion = ` 3 x ${seccionFinal} + tt ${seccionFinal} mm²) Cu`;
            break;
        case "4P":
            textoSeccion = ` 4 x ${seccionFinal} + tt ${seccionFinal} mm²) Cu`;
            break;
        default:
            textoSeccion = `${polaridad} (${seccionFinal} mm²) Cu`;
    }

    selectedObject.vertText1 = textoSeccion;
    selectedObject.vertText2 = breakerIsolation.value;
    selectedObject.footerText2 = potencia.toString();

    // Actualizar campos en el modal de propiedades
    document.getElementById('propFooterText2').value = potencia;
    
    // IMPORTANTE: Actualizar también el campo de sección en el modal si existe
    const propSeccionField = document.getElementById('propVertText1');
    if (propSeccionField) {
        propSeccionField.value = textoSeccion;
    }

    redrawCanvas();
}

// También necesitas agregar este evento para cuando se cambie manualmente el dropdown
document.getElementById('breakerSection').addEventListener('change', function() {
    if (!selectedObject || selectedObject.componentId !== 'breaker') return;
    
    const selectedValue = this.value;
    if (selectedValue) {
        // Si el usuario selecciona manualmente una opción, actualizar el objeto
        const polaridad = document.getElementById('breakerPolarity').value;
        let textoSeccion;

        switch (polaridad) {
            case "1P":
            case "F+N":
                textoSeccion = ` 1 x ${selectedValue} + tt ${selectedValue} mm²) Cu`;
                break;
            case "2P":
                textoSeccion = ` 2 x ${selectedValue} + tt ${selectedValue} mm²) Cu`;
                break;
            case "3P":
                textoSeccion = ` 3 x ${selectedValue} + tt ${selectedValue} mm²) Cu`;
                break;
            case "4P":
                textoSeccion = ` 4 x ${selectedValue} + tt ${selectedValue} mm²) Cu`;
                break;
            default:
                textoSeccion = `${polaridad} (${selectedValue} mm²) Cu`;
        }

        selectedObject.vertText1 = textoSeccion;
        redrawCanvas();
    }
});
  


// Listeners para supply
document.getElementById('supplyPolarity').addEventListener('change', calcularSupplyAuto);
document.getElementById('supplyVoltage').addEventListener('change', calcularSupplyAuto);

// Constantes de la aplicación
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1200;
const DEFAULT_GRID_SIZE = 20;

// Elementos del DOM
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const gridOverlay = document.getElementById('gridOverlay');
const drawingArea = document.getElementById('drawingArea');
const propertiesModal = document.getElementById('propertiesModal');

// Variables de estado
let isDrawing = false;
let currentTool = 'move';
let startX, startY;
let currentColor = '#000000';
let currentLineWidth = 2;
let currentLineType = 'solid';
let gridSize = DEFAULT_GRID_SIZE;
let snapToGrid = true;
let showGrid = true;
let selectedObject = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let warningTooltip = null;
let warningTooltipTimeout = null;
 // Variable global para guardar el objeto pendiente

// --- NUEVAS VARIABLES DE ESTADO PARA DRAG & DROP ---
let isDraggingNewComponent = false;
let pendingComponent = null;
let dragStartX = 0;
let dragStartY = 0;


// Variables para conexiones
let isConnecting = false;
let currentConnection = null;
let connectionPoints = [];
let connections = [];
let temporaryIndicators = [];

// Historial y capas
let history = [];
let historyIndex = -1;
let layers = [];
let currentLayerId = null;
let canvasObjects = [];
// Hacer canvasObjects global para tooltip
window.canvasObjects = canvasObjects;

let guideLines = {
    horizontal: null,
    vertical: null
};
let showGuides = true;
// Base de datos de componentes eléctricos
const componentDatabase = [
    { 
        id: 'supply', 
        name: 'Suministro', 
        url: 'images/suministro.png', 
        width: 80, 
        height: 180,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' }, // Entrada acometida                      
            { x: 40, y: 180, type: 'output' }  // Salida a CGP , calcula la potencia aguas abajo de los objetos conectados en la parte inferior(output)y cambia el valor de potencia suppy
        ],
        defaultTexts: {
            fatherText: 'Suministro',
            text1: '230V',
            text2: 'F+N',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: 'Rz1-K(AS) 2 (1x16)mm² ',
            vertText2: '0,6/1KV XLPE AL',
            vertText3: 'LibreAlogenos',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'CGP', 
        name: 'Caja General de proteccion', 
        url: 'images/fusible.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },  
            { x: 40, y: 80, type: 'output' } 
        ],
        defaultTexts: {
            fatherText: 'CGP',
            text1: '230A',
            text2: 'F+N',
            text3: '50A',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'breaker', 
        name: 'Magnetotérmico', 
        url: 'images/breaker.png', 
        width: 80, 
        height: 180,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' }, 
             { x: 0, y: 40, type: 'output' },  //
            { x: 40, y: 180, type: 'output' }  //calcula la potencia aguas abajo de los objetos conectados en la parte inferior(output)y cambia el valor de potencia breaker
        ],
        defaultTexts: {
            fatherText: 'Magnetotérmico',
            text1: '25A',
            text2: '2P',
            text3: 'C',
            text4: '6KA',
            text5: '',  
            text6: '',
            vertText1: 'Rz1-K(AS) 3 (1x 6mm²)',
            vertText2: '450/750V PVC Cu',
             vertText3: 'LibreAlogenos',
            footerText: '',
			footerText2: '5300'
        }
    },
     
    { 
        id: 'rcd', 
        name: 'Diferencial', 
        url: 'images/RCD.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },  //
            { x: 40, y: 80, type: 'output' }  // calcula la potencia aguas abajo de los objetos conectados en la parte inferior(output)y cambia el valor de potencia rcd
        ],
        defaultTexts: {
            fatherText: 'Diferencial',
            text1: '40A',
            text2: 'F+N',
            text3: '30mA',
            text4: 'Instantaneo',
            text5: 'Clase A',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'contactorNO', 
        name: 'Contactor NO', 
        url: 'images/contactorNO.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },                        
            { x: 40, y: 80, type: 'output' }  
        ],
        defaultTexts: {
            fatherText: 'Contactor NO',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
            vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    
    { 
        id: 'contactorNA', 
        name: 'Contactor NA', 
        url: 'images/contactorNA.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },                    
            { x: 40, y: 80, type: 'output' }  
        ],
        defaultTexts: {
            fatherText: 'Contactor NA',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
            vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'seccionador', 
        name: 'seccionador', 
        url: 'images/seccionador.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },   
            { x: 40, y: 80, type: 'output' }   //Calcula la potencia aguas abajo de los objetos conectados en la parte inferior(output)y cambia el valor de potencia seccionador
        ],
        defaultTexts: {
            fatherText: 'seccionador',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
            vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    
    { 
        id: 'Stension', 
        name: 'SobreTensiones', 
        url: 'images/sobreTensiones.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 80, y: 40, type: 'input' }  

             
        ],
        defaultTexts: {
            fatherText: 'SobreTensiones',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'conmutador', 
        name: 'Conmutador', 
        url: 'images/conmutador.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 10, y: 0, type: 'input' },  // entrada 1
            { x: 70, y: 0, type: 'input' },  // entrada 2
            { x: 40, y: 80, type: 'output' } // salida unica
        ],
        defaultTexts: {
            fatherText: 'Conmutador',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'Grupo', 
        name: 'Grupo', 
        url: 'images/grupo.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
             
            { x: 40, y: 80, type: 'output' }  //Calcula la potencia aguas abajo de los objetos conectados en la parte inferior(output)y cambia el valor de potencia grupo
        ],
        defaultTexts: {
            fatherText: 'Grupo',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    
    { 
        id: 'Contador', 
        name: 'Contador intel.', 
        url: 'images/contador.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },   
            { x: 40, y: 80, type: 'output' }  // Calcula la potencia aguas abajo de los objetos conectados en la parte inferior(output)y cambia el valor de potencia contador
        ],
        defaultTexts: {
            fatherText: 'Contador intel.',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'Relog', 
        name: 'Temporizador', 
        url: 'images/relog.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y:0, type: 'input' },   
            { x: 40, y: 80, type: 'output' }  
        ],
        defaultTexts: {
            fatherText: 'Temporizador',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'SAI', 
        name: 'SAI UPS', 
        url: 'images/sai.png', 
        width: 160, 
        height: 180,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },   // entrada
            { x: 120, y: 0, type: 'input' },  //entrada 2
            { x: 80, y: 180, type: 'output' } // salida a carga
        ],
        defaultTexts: {
            fatherText: 'SAI UPS',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },
    { 
        id: 'Bcondesa', 
        name: 'Bateria Condensadores', 
        url: 'images/condensadores.png', 
        width: 80, 
        height: 180,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' }   
            
        ],
        defaultTexts: {
            fatherText: 'Bateria Condensadores',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
             vertText3: '',
            footerText: '',
			footerText2: ''
        }
    },

    
    { 
        id: 'tranfo', 
        name: 'Tranformador', 
        url: 'images/tranfo.png', 
        width: 80, 
        height: 80,
        connectionPoints: [
            { x: 40, y: 0, type: 'input' },   
            { x: 40, y: 80, type: 'output' } 
           
        ],
        defaultTexts: {
            fatherText: 'Tranformador',
            text1: '',
            text2: '',
            text3: '',
            text4: '',
            text5: '',  
            text6: '',
            vertText1: '',
            vertText2: '',
                vertText3: '',
            footerText: '',
			footerText2: ''
        }
    }
	
];


// Inicialización de la aplicación
function init() {
    
       
    // --- Actualización en tiempo real de propiedades del componente ---
    const propertiesModal = document.getElementById('propertiesModal');
    if (propertiesModal) {
        // Delegación de eventos para todos los inputs/selects dentro del modal
        propertiesModal.addEventListener('input', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                updateObjectProperties();
                // Cálculo automático en tiempo real
                if (selectedObject && selectedObject.type === 'component') {
                    if (selectedObject.componentId === 'breaker') {
                        calcularBreakerAuto();

                   

                    } else if (selectedObject.componentId === 'supply') {
                        calcularSupplyAuto();
                    } else if (selectedObject.componentId === 'rcd') {
                        calcularSumasRCD();
                    }
                }
            }
        });
       // Modifica el event listener del botón "Cancelar" del modal:
     document.getElementById('closePropertiesModal').addEventListener('click', function() {
    propertiesModal.classList.remove('active');
    
    // Si hay componente pendiente, cancelarlo
    if (pendingComponent) {
        cancelComponentPlacement();
    }
});


document.getElementById('addComponentBtn').addEventListener('click', function() {
    propertiesModal.classList.remove('active');
     if (pendingComponent) {
            // Activar modo colocación después de cerrar el modal
            currentTool = 'placeComponent';
            canvas.style.cursor = 'crosshair';
            updateStatus('Modo colocación: Haz clic en el canvas para colocar el componente. ESC para cancelar.');
            redrawCanvas();
        }
    });
        propertiesModal.addEventListener('change', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                updateObjectProperties();
                // Cálculo automático en tiempo real
                if (selectedObject && selectedObject.type === 'component') {
                    if (selectedObject.componentId === 'breaker') {
                        calcularBreakerAuto();
                     
                    } else if (selectedObject.componentId === 'supply') {
                        calcularSupplyAuto();
                    }else if (selectedObject.componentId === 'rcd') {
                        calcularSumasRCD();
                    }
                }
            }
        });
    }
    setupCanvas();
    setupEventListeners();
    createDefaultLayer();
    cargarPreferenciaSeccion();
     addDefaultSupply();
    
   


}// termina init


window.calcularPotenciaMagnetotermico = calcularPotenciaMagnetotermico;

function addDefaultSupply() {
    const compInfo = componentDatabase.find(c => c.id === 'supply');
    if (!compInfo) {
        console.error('No se encontró el componente supply en la base de datos');
        return;
    }

    console.log('Añadiendo supply automáticamente...');

    // Crear el objeto del componente supply
    const supplyComponent = {
        type: 'component',
        componentId: compInfo.id,
        image: null,
        x: 800, // Centrado horizontalmente
        y: 1, // 1px desde el borde superior
        width: compInfo.width,
        height: compInfo.height,
        connectionPoints: compInfo.connectionPoints ? [...compInfo.connectionPoints] : [],
        fatherText: compInfo.defaultTexts.fatherText,
        text1: compInfo.defaultTexts.text1,
        text2: compInfo.defaultTexts.text2,
        text3: compInfo.defaultTexts.text3,
        text4: compInfo.defaultTexts.text4,
        text5: compInfo.defaultTexts.text5,
        text6: compInfo.defaultTexts.text6,
        vertText1: compInfo.defaultTexts.vertText1,
        vertText2: compInfo.defaultTexts.vertText2,
        vertText3: compInfo.defaultTexts.vertText3,
        footerText: compInfo.defaultTexts.footerText,
        footerText2: compInfo.defaultTexts.footerText2,
        textColor: '#000000',
        text1Color: compInfo.defaultTexts.text1Color || '#ff0000',
        textFont: '10px Arial',
        layerId: currentLayerId
    };

    // Cargar la imagen
    const img = new Image();
     img.crossOrigin = "anonymous"; // <-- Añade esto
    img.onload = function() {
        supplyComponent.image = img;
        console.log('Imagen del supply cargada correctamente');
        redrawCanvas(); // Redibujar cuando la imagen esté cargada
    };
    img.onerror = function() {
        console.error('Error al cargar imagen del supply:', compInfo.url);
        // Aún así añadir el componente sin imagen
        redrawCanvas();
    };
    img.src = compInfo.url;

    // Añadir al canvas
    canvasObjects.push(supplyComponent);
    console.log('Supply añadido al canvasObjects:', canvasObjects);
    
    updateStatus('Supply añadido automáticamente al canvas.');
}









    // Funcion para el mensaje 

    function showWarningTooltip(x, y, message) {
    if (!warningTooltip) {
        warningTooltip = document.createElement('div');
        warningTooltip.id = 'warningTooltip';
        warningTooltip.style.position = 'fixed';
        warningTooltip.style.background = '#ce2313';
        warningTooltip.style.color = '#fff';
        warningTooltip.style.padding = '6px 10px';
        warningTooltip.style.borderRadius = '8px';
        warningTooltip.style.fontSize = '12px';
        warningTooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
        warningTooltip.style.pointerEvents = 'none';
        warningTooltip.style.zIndex = 9999;
        document.body.appendChild(warningTooltip);
    }
    warningTooltip.textContent = message;
    warningTooltip.style.left = (x + 8) + 'px';
    warningTooltip.style.top = (y + 8) + 'px';
    warningTooltip.style.display = 'block';

    if (typeof warningTooltipTimeout !== 'undefined' && warningTooltipTimeout) {
        clearTimeout(warningTooltipTimeout);
    }
    warningTooltipTimeout = setTimeout(() => {
        hideWarningTooltip();
    }, 2500);
}

    function hideWarningTooltip() {
        const warningTooltip = document.getElementById('warningTooltip');
        if (warningTooltip) warningTooltip.style.display = 'none';
        // Verificar si warningTooltipTimeout está definido antes de limpiarlo
        if (typeof warningTooltipTimeout !== 'undefined') {
            clearTimeout(warningTooltipTimeout);
        }
    }

     // Detectar hover sobre el círculo de advertencia y mostrar tooltip
    document.getElementById('drawingCanvas').addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        let found = false;
        for (const comp of window.canvasObjects || []) {
            if (comp._warningCircle) {
                const dx = mouseX - comp._warningCircle.x;
                const dy = mouseY - comp._warningCircle.y;
                if (Math.sqrt(dx*dx + dy*dy) <= comp._warningCircle.r) {
                    showWarningTooltip(e.clientX, e.clientY, 'Debe introducir,al menos,una linea aguas abajo con carga, o introducir descriccion de la carga');
                    found = true;
                    break;
                }
            }
        }
        if (!found) hideWarningTooltip();
    });



    document.getElementById('drawingCanvas').addEventListener('mouseleave', hideWarningTooltip);
    
    saveState();
    updateStatus('Aplicación lista. Selecciona una herramienta para comenzar.');
   
    setTool('move');
    gridSize = DEFAULT_GRID_SIZE;
    document.getElementById('gridSize').value = gridSize;
    updateGridOverlay();
    redrawCanvas();

// Configuración inicial del canvas
function setupCanvas() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    gridOverlay.style.width = `${canvas.width}px`;
    gridOverlay.style.height = `${canvas.height}px`;
        drawingArea.style.overflow = 'hidden'; // Prevent overflow in the drawing area
    updateGridOverlay();
    
}

// Actualiza la cuadrícula
function updateGridOverlay() {
    if (showGrid) {
        gridOverlay.style.display = 'block';
        gridOverlay.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        gridOverlay.style.backgroundImage = `
            linear-gradient(to right, rgba(80, 80, 80, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(80, 80, 80, 0.1) 1px, transparent 1px)
        `;
    } else {
        gridOverlay.style.display = 'none';
    }
}

// Configura los event listeners

    
  
function setupEventListeners() {
    // Eventos del canvas (asegúrate de que 'canvas' esté definido)
    if (canvas) {
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Detectar movimiento del mouse sin clic (solo si existe canvas)
        canvas.addEventListener('mousemove', function(e) {
            if (currentTool === 'move' && !isDragging) {
                const { x, y } = getCanvasCoordinates(e);
                const objBajoCursor = getObjectAtPosition(x, y);
                if (objBajoCursor && objBajoCursor.type === 'component') {
                    detectarZonaAutoConexion(objBajoCursor, x, y);
                    redrawCanvas();
                } else {
                    window.enZonaAutoConexion = false;
                    redrawCanvas();
                }
            }
        });

        // Hover para tooltip de advertencia
        canvas.addEventListener('mousemove', function(e) {
            // (ya tienes listener similar más abajo; si duplicas, mantenlo consistente)
        });
        canvas.addEventListener('mouseleave', hideWarningTooltip);
    }

    // Helper para registrar listeners con comprobación
    const on = (id, evt, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(evt, fn);
        // si no existe, no hacer nada (evita spam en consola)
    };

    // Botones de herramientas
    on('drawTool', 'click', () => setTool('draw'));
    on('moveTool', 'click', () => setTool('move'));
    on('selectTool', 'click', () => setTool('select'));
    on('ellipseTool', 'click', () => setTool('ellipse'));
    on('connectTool', 'click', () => setTool('connect'));
    on('CalcularTool', 'click', () => {
        setTool('Calcular');
        calcularTodo();
    });

    // Guardar/exportar
    on('saveSVG', 'click', exportToSVG);
    on('saveJSON', 'click', saveDiagramAsJSON);
    on('saveImage', 'click', saveAsImage);
    on('exportPngBtn', 'click', exportAsPNG);
    // Botón para buscar actualizaciones del Service Worker
    on('updateSWBtn', 'click', async () => {
        if (!('serviceWorker' in navigator)) {
            updateStatus('Service Worker no soportado en este navegador.');
            return;
        }
        updateStatus('Buscando actualizaciones...');
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) {
                updateStatus('No hay Service Worker registrado.');
                return;
            }
            await reg.update();
            updateStatus('Comprobación completa. Si hay una nueva versión se mostrará un aviso.');
            setTimeout(() => updateStatus(''), 4000);
        } catch (err) {
            console.error('Error al buscar actualizaciones del SW:', err);
            updateStatus('Error al buscar actualizaciones. Revisa la consola.');
        }
    });

     // Registrar botón Memoria PDF aquí (se asegura que el elemento exista)
    on('btnMemoria', 'click', async function () {
        console.log('📄 btnMemoria pulsado (listener dentro de setupEventListeners)');
        try {
            if (typeof window.exportarMemoriaTecnicaPDF !== 'function') {
                console.error('❌ exportarMemoriaTecnicaPDF no está definida:', window.exportarMemoriaTecnicaPDF);
                alert('Función "Memoria PDF" no cargada. Revisa la consola (F12) y el orden de carga de scripts.');
                return;
            }
            const res = window.exportarMemoriaTecnicaPDF();
            if (res && typeof res.then === 'function') {
                await res;
            }
            console.log('✅ exportarMemoriaTecnicaPDF ejecutada correctamente');
        } catch (err) {
            console.error('Error al ejecutar exportarMemoriaTecnicaPDF:', err);
            alert('Error al generar PDF. Revisa la consola F12 para detalles.');
        }
    });

    // Opciones de dibujo (con protección)
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) colorPicker.addEventListener('input', (e) => currentColor = e.target.value);
    const lineWidth = document.getElementById('lineWidth');
    if (lineWidth) lineWidth.addEventListener('input', (e) => currentLineWidth = e.target.value);
    on('lineType', 'change', (e) => currentLineType = e.target.value);

    // Opciones de cuadrícula
    on('showGrid', 'change', (e) => { showGrid = e.target.checked; updateGridOverlay(); });
    on('snapToGrid', 'change', (e) => { snapToGrid = e.target.checked; });
    on('gridSize', 'input', (e) => {
        let v = parseInt(e.target.value) || DEFAULT_GRID_SIZE;
        if (v % 10 !== 0) v = Math.round(v / 10) * 10;
        gridSize = v;
        e.target.value = gridSize;
        updateGridOverlay();
        redrawCanvas();
    });

    // Component buttons (verifica existencia)
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const selectedCompId = this.getAttribute('data-id');
            addComponentById(selectedCompId);
        });
    });

    // Delete / undo / redo / clear
    on('deleteImage', 'click', deleteSelectedObject);
    on('undoBtn', 'click', undoLastAction);
    on('redoBtn', 'click', redoLastAction);
    on('clearCanvas', 'click', clearCanvasConfirm);

    // Breaker: comprobar elementos antes de enlazar
    on('breakerIntensity', 'change', calcularBreakerAuto);
    on('breakerPolarity', 'change', calcularBreakerAuto);
    on('potencia', 'change', calcularBreakerAuto);
    on('length', 'change', calcularBreakerAuto);
    on('breakerSection', 'change', function() {
        if (!selectedObject || selectedObject.componentId !== 'breaker') return;
        // Tu lógica de cambio (ya definida más abajo) se ejecutará porque actualizarás selectedObject en updateObjectProperties
        calcularBreakerAuto();
    });

    // Supply listeners (si existen)
    on('supplyPolarity', 'change', calcularSupplyAuto);
    on('supplyVoltage', 'change', calcularSupplyAuto);

    // Propiedades modal y calcular botón
    on('propFooterText2', 'input', function(e){
        if (selectedObject && selectedObject.type === 'component') {
            selectedObject.footerText2 = e.target.value;
            saveState();
            redrawCanvas();
        }
    });

     const updateBtn = document.getElementById('updatePropertiesBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            if (selectedObject) {
                updateObjectProperties();
                // Recalcular según el tipo de componente
                if (selectedObject.type === 'component') {
                    switch(selectedObject.componentId) {
                        case 'breaker':
                            calcularBreakerAuto();
                            break;
                        case 'supply':
                            calcularSupplyAuto();
                            break;
                        case 'rcd':
                            calcularSumasRCD();
                            break;
                    }
                }
                redrawCanvas();
                updateStatus('Propiedades actualizadas');
            }
        });
    }
   

    // Modal: cerrar al hacer clic fuera
    if (propertiesModal) {
        propertiesModal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    }

    // Otros listeners ya definidos en tu archivo (te sugiero consolidarlos aquí para evitar duplicados)
    on('calcularRCDBtn', 'click', function() { calcularSumasRCD(); updateStatus('Cálculos de RCD completados.'); });
    on('addLayerBtn', 'click', addNewLayer);
    on('closeModal', 'click', closeModal);
    on('cancelModal', 'click', closeModal);
    on('confirmModalBtn', 'click', confirmModalAction);
    on('closeFileModal', 'click', closeFileModal);
    on('cancelFileModal', 'click', closeFileModal);
    on('confirmFileModal', 'click', confirmFileModalAction);

    // Mostrar guías checkbox
    const sg = document.getElementById('showGuides');
    if (sg) sg.addEventListener('change', (e) => { showGuides = e.target.checked; redrawCanvas(); });

    // Atajos de teclado
    document.addEventListener('keydown', handleKeyboardShortcuts);
     // asegurar attach
    attachBreakerPotenciaListeners();

}


    
    
   
  




// Activa el modo acoplado para un nuevo elemento

function activarModoAcoplado(nuevoElemento) {
  nuevoElemento.style.position = 'absolute';
  nuevoElemento.style.pointerEvents = 'none';
  document.body.appendChild(nuevoElemento);

  function moverConRaton(e) {
    nuevoElemento.style.left = e.pageX + 'px';
    nuevoElemento.style.top = e.pageY + 'px';
  }

  document.addEventListener('mousemove', moverConRaton);

  function desacoplar(e) {
    const output = document.elementFromPoint(e.clientX, e.clientY);

    if (output && output.classList.contains('output')) {
      nuevoElemento.style.pointerEvents = 'auto';
      document.removeEventListener('mousemove', moverConRaton);
      document.removeEventListener('click', desacoplar);
    } else {
      // ✨ Efecto visual: parpadeo rojo
      nuevoElemento.style.transition = 'box-shadow 0.2s';
      nuevoElemento.style.boxShadow = '0 0 10px red';
      setTimeout(() => {
        nuevoElemento.style.boxShadow = 'none';
      }, 300);

      // 💬 Mensaje temporal
      const aviso = document.createElement('div');
      aviso.textContent = 'Haz clic sobre una zona válida para desacoplar';
      aviso.style.position = 'fixed';
      aviso.style.top = '10px';
      aviso.style.left = '50%';
      aviso.style.transform = 'translateX(-50%)';
      aviso.style.background = '#f44336';
      aviso.style.color = 'white';
      aviso.style.padding = '8px 16px';
      aviso.style.borderRadius = '4px';
      aviso.style.zIndex = '1000';
      document.body.appendChild(aviso);
      setTimeout(() => aviso.remove(), 2000);
    }
  }

  document.addEventListener('click', desacoplar);
}




    
    
 function setTool(tool) {
     console.log('🔧 setTool llamado:', tool);


     // Si hay componente pendiente, prevenir cambios
   if (pendingComponent) {
        console.log('❌ Componente pendiente, bloqueando cambio de herramienta');
        if (tool !== 'placeComponent') {
            const confirmCancel = confirm('¿Cancelar la colocación del componente?');
            if (confirmCancel) {
                cancelComponentPlacement();
                // Continuar con el cambio
            } else {
                return;
            }
        }
    }

    currentTool = tool;
    updateToolUI(tool);


   if (tool === 'draw') {
        document.getElementById('drawTool').classList.add('active');
        canvas.style.cursor = 'crosshair';
        updateStatus('Modo dibujo: Haz clic y arrastra para dibujar líneas');
        showNoSelectionMessage();
    } else if (tool === 'ellipse') {
        document.getElementById('ellipseTool').classList.add('active');
        canvas.style.cursor = 'crosshair';
        updateStatus('Modo elipse: Haz clic y arrastra para dibujar una elipse');
        showNoSelectionMessage();
    } else if (tool === 'move') {
        document.getElementById('moveTool').classList.add('active');
        canvas.style.cursor = 'move';
        updateStatus('Modo mover: Selecciona y arrastra componentes para moverlos');
        if (!selectedObject) {
            showNoSelectionMessage();
        }
    } else if (tool === 'select') {
        document.getElementById('selectTool').classList.add('active-select');
        canvas.style.cursor = 'pointer';
        updateStatus('Modo selección: Haz clic en un componente para seleccionarlo');
        if (selectedObject) {
            showPropertiesPanel(selectedObject);
        }
    } else if (tool === 'connect') {
        document.getElementById('connectTool').classList.add('active');
        canvas.style.cursor = 'crosshair';
        canvas.classList.add('mode-connect');
        updateStatus('Modo conexión: Haz clic en un punto de conexión y arrastra a otro punto');
        showNoSelectionMessage();
    } else if (tool === 'Calcular') {
        document.getElementById('CalcularTool').classList.add('active');
        canvas.style.cursor = 'default';
        updateStatus('Modo cálculo: Mostrando resultados de cálculo');
        calcularTodo();
    } else if (tool === 'placeComponent') {
        canvas.style.cursor = 'crosshair';
        updateStatus('Modo colocación: Haz clic en el canvas para colocar el componente. ESC para cancelar.');
        showNoSelectionMessage();
    }

    redrawCanvas();
}


 

 


 function iniciarDragComponente(componente) {
    pendingComponent = componente;
    currentTool = 'dragNewComponent';
    updateToolUI('dragNewComponent');
    updateStatus('Arrastra el componente a la posición deseada. Se conectará automáticamente si está cerca de un punto de salida.');
}

// Inicia el dibujo o selección
function startDrawing(e) {
    const { x, y } = getCanvasCoordinates(e);
    startX = snapToGridCoordinate(x);
    startY = snapToGridCoordinate(y);

 // MODO DRAG & DROP PARA NUEVO COMPONENTE
    
    // ✅ MODO DRAG & DROP PARA NUEVO COMPONENTE
    if (currentTool === 'dragNewComponent' && pendingComponent) {
        console.log('🖱️ Iniciando arrastre de componente');
        // Iniciar arrastre del componente nuevo
        dragStartX = x - pendingComponent.x;
        dragStartY = y - pendingComponent.y;
        canvas.style.cursor = 'grabbing';
        return;
    }
    
    if (currentTool === 'draw' || currentTool === 'ellipse') {
        isDrawing = true;
    } else if (currentTool === 'move' || currentTool === 'select') {
        const obj = getObjectAtPosition(x, y);
        if (obj && (obj.type === 'component' || obj.type === 'ellipse' || obj.type === 'line')) {
            selectedObject = obj;
            dragOffsetX = x - obj.x;
            dragOffsetY = y - obj.y;
            isDragging = true;
             // Mostrar propiedades solo si la herramienta es 'select'
        if (currentTool === 'select') {
            showPropertiesPanel(obj);
        }
            redrawCanvas();
        } else {
            selectedObject = null;
            showNoSelectionMessage();
        }
    } else if (currentTool === 'connect') {
        const connectionPoint = getConnectionPointAtPosition(x, y);
        if (connectionPoint) {
            isConnecting = true;
            currentConnection = {
                from: connectionPoint,
                to: null,
                tempX: x,
                tempY: y
            };
        }
    }
     
}

function draw(e) {
    const { x, y } = getCanvasCoordinates(e);
     
    
    // ✅ MODO DRAG & DROP PARA NUEVO COMPONENTE
    if (currentTool === 'dragNewComponent' && pendingComponent) {
        // Actualizar posición del componente durante el arrastre
        pendingComponent.x = x - dragStartX;
        pendingComponent.y = y - dragStartY;
        
        // Limitar al área del canvas
        pendingComponent.x = Math.max(0, Math.min(canvas.width - pendingComponent.width, pendingComponent.x));
        pendingComponent.y = Math.max(0, Math.min(canvas.height - pendingComponent.height, pendingComponent.y));
        
        // ✅ DETECCIÓN DE ZONA DURANTE EL ARRASTRE
        detectarZonaAutoConexion(pendingComponent, x, y);
        
        redrawCanvas();
        return;
    }

   
   
    
    if ((currentTool === 'draw' || currentTool === 'ellipse') && isDrawing) {
        const snappedX = snapToGridCoordinate(x);
        const snappedY = snapToGridCoordinate(y);
        const alignedStartX = snapToGridCoordinate(startX);
        const alignedStartY = snapToGridCoordinate(startY);
        
        redrawCanvas();
        
        // Dibuja la línea temporal
        ctx.beginPath();
        if (currentTool === 'draw') {
            // Dibuja línea
            ctx.moveTo(alignedStartX, alignedStartY);
            ctx.lineTo(snappedX, snappedY);
        } else if (currentTool === 'ellipse') {
            // Dibuja elipse
            const centerX = (startX + snappedX) / 2;
            const centerY = (startY + snappedY) / 2;
            const radiusX = Math.abs(snappedX - startX) / 2;
            const radiusY = Math.abs(snappedY - startY) / 2;
            
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        }
        
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentLineWidth;
        
        if (currentLineType === 'dashed') {
            ctx.setLineDash([5, 3]);
        } else if (currentLineType === 'dotted') {
            ctx.setLineDash([2, 2]);
        } else {
            ctx.setLineDash([]);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (currentTool === 'move' && isDragging && selectedObject) {
        // Mueve el componente manteniendo el offset
        selectedObject.x = x - dragOffsetX;
        selectedObject.y = y - dragOffsetY;

        // Limita al área del canvas
        if (selectedObject.type === 'component') {
            selectedObject.x = Math.max(0, Math.min(canvas.width - selectedObject.width, selectedObject.x));
            selectedObject.y = Math.max(0, Math.min(canvas.height - selectedObject.height, selectedObject.y));
        }

        // Detectar alineaciones y ajustar si es necesario
        if (showGuides) {
            detectAlignments(selectedObject.x, selectedObject.y, selectedObject.width, selectedObject.height, selectedObject);
            // Calcular centro del objeto
            const centerX = selectedObject.x + selectedObject.width / 2;
            const centerY = selectedObject.y + selectedObject.height / 2;
            if (guideLines.horizontal !== null && Math.abs(centerY - guideLines.horizontal) <= 5) {
                selectedObject.y = guideLines.horizontal - selectedObject.height / 2;
            }
            if (guideLines.vertical !== null && Math.abs(centerX - guideLines.vertical) <= 5) {
                selectedObject.x = guideLines.vertical - selectedObject.width / 2;
            }
        }

        // DETECCIÓN DE ZONA DURANTE ARRASTRE
        detectarZonaAutoConexion(selectedObject, x, y);
        
        redrawCanvas();
    } else if (currentTool === 'move' && !isDragging) {
        // ✅ DETECCIÓN DE ZONA CUANDO EL RATÓN SE MUEVE SOBRE OBJETOS (SIN ARRASTRAR)
        const objBajoCursor = getObjectAtPosition(x, y);
        if (objBajoCursor && objBajoCursor.type === 'component') {
            detectarZonaAutoConexion(objBajoCursor, x, y);
            redrawCanvas();
        } else {
            // Si no hay objeto bajo el cursor, limpiar la zona de auto-conexión
            window.enZonaAutoConexion = false;
            redrawCanvas();
        }
    } else if (currentTool === 'connect' && isConnecting && currentConnection) {
        currentConnection.tempX = x;
        currentConnection.tempY = y;
        redrawCanvas();
    }
}

//Nuevo Funciones-------------------------------------------------------------------------
// Funci�n auxiliar para encontrar componentes conectados aguas abajo
function encontrarComponentesConectadosAguasAbajo(componenteInicial) {
    const componentesConectados = [];
    const visitados = new Set();
    
    function buscarAguasAbajo(componenteActual) {
        if (visitados.has(componenteActual)) return;
        visitados.add(componenteActual);
        
        // Buscar conexiones donde este componente es la fuente
        const conexionesSalientes = connections.filter(conn => 
            conn.from.component === componenteActual && 
            conn.from.point.type === 'output'
        );
        
        conexionesSalientes.forEach(conexion => {
            const componentDestino = conexion.to.component;
            if (componentDestino.type === 'component' && 
                !visitados.has(componentDestino) &&
                componentDestino !== componenteInicial) {
                
                componentesConectados.push(componentDestino);
                buscarAguasAbajo(componentDestino);
            }
        });
    }
    
    buscarAguasAbajo(componenteInicial);
    return componentesConectados;
}

// Funci�n para mostrar resultados en la tabla HTML
function mostrarResultadosRCD(resultados) {
    const tablaContainer = document.getElementById('teblaResultadosRCD');
    
    if (resultados.length === 0) {
        tablaContainer.innerHTML = '<p>No hay RCDs</p>';
        return;
    }
    
    let html = `
        <table border="1" style="width: 250px; max-width: 250px; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th style="padding: 4px; text-align: center;">RCD</th>
                    <th style="padding: 4px; text-align: center;">Fase</th>
                    <th style="padding: 4px; text-align: center;">P.Total</th>
                    <th style="padding: 4px; text-align: center;">A.total</th>
                    <th style="padding: 4px; text-align: center;">Conet</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    resultados.forEach((resultado, index) => {
        html += `
           <tr>
                <td style="padding: 4px; text-align: center;">${index + 1}</td>
                <td style="padding: 4px; text-align: center;">${resultado.fase}</td>
                <td style="padding: 4px; text-align: center;">${resultado.sumaPotencia.toFixed(0)}</td>
                <td style="padding: 4px; text-align: center;">${resultado.sumaIntensidad.toFixed(1)}</td>
                <td style="padding: 4px; text-align: center;">${resultado.cantidadComponentes}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    tablaContainer.innerHTML = html;
}

// =============================================
// FUNCIÓN PARA MOSTRAR INDICADOR TEMPORAL
// =============================================

function showTemporaryIndicator(x, y, type = 'connected', duration = 1000) {
    const indicator = {
        x: x,
        y: y,
        type: type, // 'connected', 'warning', 'info'
        timestamp: Date.now(),
        duration: duration
    };
    
    temporaryIndicators.push(indicator);
    
    // Redibujar para mostrar el indicador inmediatamente
    redrawCanvas();
    
    // Remover automáticamente después de la duración
    setTimeout(() => {
        const index = temporaryIndicators.indexOf(indicator);
        if (index > -1) {
            temporaryIndicators.splice(index, 1);
            redrawCanvas();
        }
    }, duration);
}

// =============================================
// FUNCIÓN PARA DIBUJAR INDICADORES TEMPORALES
// =============================================

function drawTemporaryIndicators(context = ctx) {
    const now = Date.now();
    
    // ✅ DIBUJAR INDICADOR PERSISTENTE DE ZONA DE AUTOCONEXIÓN
    if (window.enZonaAutoConexion) {
        drawWarningIndicator(context, window.puntoAutoConexionX, window.puntoAutoConexionY, 1.0);
    }
    
    // Dibujar indicadores temporales normales
    for (let i = temporaryIndicators.length - 1; i >= 0; i--) {
        const indicator = temporaryIndicators[i];
        const elapsed = now - indicator.timestamp;
        const progress = elapsed / indicator.duration;
        
        // Si ha expirado, eliminarlo
        if (progress >= 1) {
            temporaryIndicators.splice(i, 1);
            continue;
        }
        
        // Calcular opacidad (se desvanece al final)
        const opacity = 1 - progress;
        
        context.save();
        
        switch (indicator.type) {
            case 'connected':
                drawConnectedIndicator(context, indicator.x, indicator.y, opacity);
                break;
            case 'warning':
                drawWarningIndicator(context, indicator.x, indicator.y, opacity);
                break;
            case 'info':
                drawInfoIndicator(context, indicator.x, indicator.y, opacity);
                break;
        }
        
        context.restore();
    }
}


function drawConnectedIndicator(context, x, y, opacity) {
   
    context.save();
    context.strokeStyle = `rgba(76, 175, 80, ${opacity})`;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.beginPath();
    const halfLength = 80; // mitad de la longitud de la línea
    context.moveTo(x - halfLength, y);
    context.lineTo(x + halfLength, y);
    context.stroke();
    context.restore();
    
  
}
function drawWarningIndicator(context, x, y, opacity) {
    // Cruz (+) centrada en (x,y), tamaño 40x40, grosor 1px
    const half = 20; // mitad de 40px
    context.save();
    context.strokeStyle = `rgba(255, 152, 0, ${opacity})`;
    context.lineWidth = 1;
    context.lineCap = 'round';
    context.beginPath();

    context.moveTo(x - half, y - half);
    context.lineTo(x + half, y + half);
    context.moveTo(x - half, y + half);
    context.lineTo(x + half, y - half);
    context.stroke();
    context.restore();
}

function drawInfoIndicator(context, x, y, opacity) {
    // Círculo azul con "i"
    context.beginPath();
    context.arc(x, y, 12, 0, Math.PI * 2);
    context.fillStyle = `rgba(33, 150, 243, ${opacity * 0.8})`;
    context.fill();
    context.strokeStyle = `rgba(25, 118, 210, ${opacity})`;
    context.lineWidth = 2;
    context.stroke();
    
    // Letra "i"
    context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    context.font = 'bold 12px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('i', x, y);
}
// =============================================
// Termina INDICADORES TEMPORALES
// =============================================

function stopDrawing(e) {
    const { x, y } = getCanvasCoordinates(e);

    // ✅ MODO DRAG & DROP - SOLTAR COMPONENTE NUEVO
    if (currentTool === 'dragNewComponent' && pendingComponent) {
        console.log('🔄 Soltando componente en modo dragNewComponent');

        // ✅ Verificar si está en zona de conexión válida
        if (!window.enZonaAutoConexion) {
            updateStatus('❌ No se puede colocar: el componente debe estar cerca de un punto de salida válido.');
            return;
        }

        // ✅ Verificar si ya está conectado a ese origen (evitar duplicados)
        const inputPoint = pendingComponent.connectionPoints.find(p => p.type === 'input');
        if (inputPoint) {
            const yaConectado = connections.some(c =>
                c.from.component === window.componenteAutoConexion &&
                c.from.point === window.puntoAutoConexion &&
                c.to.component === pendingComponent
            );

            if (yaConectado) {
                updateStatus('⚠️ Este componente ya está conectado a esa salida.');
                return;
            }
        }

        // Verificar que la posición sea válida
        let isValidPosition = true;

        // Comprobar solapamiento con otros componentes
        for (const obj of canvasObjects) {
            if (obj.type === 'component' &&
                obj !== pendingComponent &&
                obj.x < pendingComponent.x + pendingComponent.width &&
                obj.x + obj.width > pendingComponent.x &&
                obj.y < pendingComponent.y + pendingComponent.height &&
                obj.y + obj.height > pendingComponent.y) {

                const overlapArea = Math.max(0, Math.min(pendingComponent.x + pendingComponent.width, obj.x + obj.width) - Math.max(pendingComponent.x, obj.x)) *
                                    Math.max(0, Math.min(pendingComponent.y + pendingComponent.height, obj.y + obj.height) - Math.max(pendingComponent.y, obj.y));

                const minArea = Math.min(pendingComponent.width * pendingComponent.height, obj.width * obj.height);

                if (overlapArea > minArea * 0.3) {
                    isValidPosition = false;
                    updateStatus('❌ Posición no válida: solapamiento con otro componente.');
                    break;
                }
            }
        }

        if (isValidPosition) {
            console.log('✅ Posición válida, procediendo con auto-conexión...');
            detectarZonaAutoConexion(pendingComponent, x, y);

            let fueConectado = false;

            if (window.enZonaAutoConexion && pendingComponent.type === 'component' && pendingComponent.connectionPoints) {
                const inputPoint = pendingComponent.connectionPoints.find(p => p.type === 'input');
                if (inputPoint) {
                    const inputX = pendingComponent.x + inputPoint.x;
                    const inputY = pendingComponent.y + inputPoint.y;

                    const nuevaConexion = {
                        from: {
                            component: window.componenteAutoConexion,
                            point: window.puntoAutoConexion
                        },
                        to: {
                            component: pendingComponent,
                            point: inputPoint
                        },
                        color: currentColor,
                        width: currentLineWidth,
                        lineType: currentLineType,
                        layerId: currentLayerId
                    };

                    connections.push(nuevaConexion);
                    fueConectado = true;

                    console.log('✅ Conexión automática establecida:', nuevaConexion);
                    updateStatus('¡Componente conectado automáticamente al soltarlo!');

                    setTimeout(() => {
                        showTemporaryIndicator(inputX, inputY, 'connected', 1500);
                    }, 100);
                }
            }

            canvasObjects.push(pendingComponent);
            selectedObject = pendingComponent;
            saveState();
            redrawCanvas();
            renderObjectsList();

            if (fueConectado) {
                calcularSumasRCD();
                updateStatus('Componente colocado y conectado automáticamente.');
            } else {
                updateStatus('Componente colocado correctamente.');
            }
        } else {
            updateStatus('Posición no válida: solapamiento excesivo con otro componente.');
            return;
        }

        pendingComponent = null;
        currentTool = 'move';
        updateToolUI('move');
        window.enZonaAutoConexion = false;
        console.log('🔄 Volviendo a modo move');
        return;
    }

    // ✅ DIBUJO DE LÍNEAS Y ELIPSES
    if ((currentTool === 'draw' || currentTool === 'ellipse') && isDrawing) {
        const snappedX = snapToGridCoordinate(x);
        const snappedY = snapToGridCoordinate(y);
        const alignedStartX = snapToGridCoordinate(startX);
        const alignedStartY = snapToGridCoordinate(startY);

        if (currentTool === 'draw') {
            const newLine = {
                type: 'line',
                x1: alignedStartX,
                y1: alignedStartY,
                x2: snappedX,
                y2: snappedY,
                color: currentColor,
                width: currentLineWidth,
                lineType: currentLineType,
                layerId: currentLayerId
            };
            canvasObjects.push(newLine);
        } else if (currentTool === 'ellipse') {
            const centerX = (startX + snappedX) / 2;
            const centerY = (startY + snappedY) / 2;
            const radiusX = Math.abs(snappedX - startX) / 2;
            const radiusY = Math.abs(snappedY - startY) / 2;
            const newEllipse = {
                type: 'ellipse',
                x: centerX - radiusX,
                y: centerY - radiusY,
                width: radiusX * 2,
                height: radiusY * 2,
                color: currentColor,
                widthLine: currentLineWidth,
                lineType: currentLineType,
                layerId: currentLayerId
            };
            canvasObjects.push(newEllipse);
        }

        isDrawing = false;
        saveState();
        redrawCanvas();
        return;
    }

    // ✅ MODO MOVE - SOLTAR OBJETO
    if (currentTool === 'move' && isDragging) {
        let fueConectado = false;

        if (window.enZonaAutoConexion && selectedObject && selectedObject.type === 'component' && selectedObject.connectionPoints) {
            const inputPoint = selectedObject.connectionPoints.find(p => p.type === 'input');
            if (inputPoint) {
                const inputX = selectedObject.x + inputPoint.x;
                const inputY = selectedObject.y + inputPoint.y;

                const yaConectado = connections.some(c =>
                    c.from.component === window.componenteAutoConexion &&
                    c.from.point === window.puntoAutoConexion &&
                    c.to.component === selectedObject
                );

                if (yaConectado) {
                    updateStatus('⚠️ Este componente ya está conectado a esa salida.');
                } else {
                    connections.push({
                        from: { component: window.componenteAutoConexion, point: window.puntoAutoConexion },
                        to: { component: selectedObject, point: inputPoint },
                        color: currentColor,
                        width: currentLineWidth,
                        lineType: currentLineType,
                        layerId: currentLayerId
                    });
                    fueConectado = true;
                    updateStatus('✅ Objeto conectado automáticamente al soltarlo.');
                    setTimeout(() => {
                        showTemporaryIndicator(inputX, inputY, 'connected', 1500);
                    }, 100);
                    calcularSumasRCD();
                }
            }
        }

        isDragging = false;
        saveState();
        if (fueConectado) redrawCanvas();
        return;
    }

    // ✅ MODO CONECTAR
    if (currentTool === 'connect' && isConnecting && currentConnection) {
        const connectionPoint = getConnectionPointAtPosition(x, y);
        if (connectionPoint) {
            currentConnection.to = connectionPoint;
            connections.push({
                from: currentConnection.from,
                to: currentConnection.to,
                color: currentColor,
                width: currentLineWidth,
                lineType: currentLineType,
                layerId: currentLayerId
            });
        }

        isConnecting = false;
        currentConnection = null;
        saveState();
        redrawCanvas();
        return;
    }

    // ✅ LIMPIAR ESTADO DE AUTO-CONEXIÓN
    window.enZonaAutoConexion = false;
}






function showConnectionPulse(x, y, radius = 30, duration = 1000) {
    const pulse = document.createElement('div');
    pulse.style.position = 'absolute';
    pulse.style.left = `${x - radius}px`;
    pulse.style.top = `${y - radius}px`;
    pulse.style.width = `${radius * 2}px`;
    pulse.style.height = `${radius * 2}px`;
    pulse.style.border = '2px solid #00f';
    pulse.style.borderRadius = '50%';
    pulse.style.opacity = '0.8';
    pulse.style.animation = `pulseAnim ${duration}ms ease-out`;
    pulse.style.pointerEvents = 'none';
    pulse.style.zIndex = 1000;

    document.body.appendChild(pulse);

    setTimeout(() => {
        pulse.remove();
    }, duration);
}

// CSS para animación (puedes incluirlo en tu hoja de estilos)
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulseAnim {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2); opacity: 0; }
}`;
document.head.appendChild(style);



// --- NUEVA FUNCIÓN PARA AUTO-CONEXIÓN INTELIGENTE ---
function autoConnectComponent(newComponent) {
    if (!newComponent.connectionPoints) return;


    
    // Buscar punto de entrada del nuevo componente
    const inputPoint = newComponent.connectionPoints.find(p => p.type === 'input');
    if (!inputPoint) return;
    
    const inputX = newComponent.x + inputPoint.x;
    const inputY = newComponent.y + inputPoint.y;
    
    // Buscar el output más cercano de otros componentes
    let closestOutput = null;
    let minDistance = 50; // Distancia máxima para auto-conexión

    
    for (const obj of canvasObjects) {
        if (obj === newComponent || obj.type !== 'component' || !obj.connectionPoints) continue;
        
        for (const outPoint of obj.connectionPoints) {
            if (outPoint.type !== 'output') continue;
            
            const outX = obj.x + outPoint.x;
            const outY = obj.y + outPoint.y;
            const distance = Math.sqrt(Math.pow(inputX - outX, 2) + Math.pow(inputY - outY, 2));
            
            if (distance < minDistance) {
                minDistance = distance;
                closestOutput = { component: obj, point: outPoint };
            }
        }
    }

    


    
    // Crear conexión automática si se encontró un output cercano
    if (closestOutput && minDistance <= 50) {
        // Verificar si ya existe conexión
        const existingConnection = connections.find(conn => 
            conn.from.component === closestOutput.component && 
            conn.from.point === closestOutput.point &&
            conn.to.component === newComponent
        );
        
        if (!existingConnection) {
            connections.push({
                from: closestOutput,
                to: { component: newComponent, point: inputPoint },
                color: currentColor,
                width: currentLineWidth,
                lineType: currentLineType,
                layerId: currentLayerId
            });
            updateStatus('¡Conexión automática establecida!');
            const pulseX = inputX;
            const pulseY = inputY;
             showConnectionPulse(pulseX, pulseY);
             calcularSumasRCD();

        }
    }
}






// Obtiene coordenadas del canvas
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
	
    return {
        x: e.clientX - rect.left ,
        y: e.clientY - rect.top
    };
}

// Ajusta coordenadas a la cuadrícula
function snapToGridCoordinate(coord) {
    if (!snapToGrid) return coord;
    
    // Asegurar que el snap es consistente con el gridSize
    const snapped = Math.round(coord / gridSize) * gridSize;
    
    // Ajuste adicional para evitar desfases por decimales
    return Math.round(snapped * 10) / 10;
}

// Redibuja todo el canvas
function redrawCanvas(context = ctx) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Rellenar con fondo blanco si es un contexto temporal
    if (context !== ctx) {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
        
     // Dibujar conexiones primero
    connections.forEach(conn => {
        if (conn.layerId !== currentLayerId) return;        
        drawConnection(conn, context);
    });
    
    // Dibujar objetos del canvas
   canvasObjects.forEach(obj => {
        if (obj.layerId !== currentLayerId) return;
        
        if (obj.type === 'line') {
            drawLineObject(obj, context);
        } else if (obj.type === 'component') {
            drawComponentObject(obj, context);
        } else if (obj.type === 'ellipse') {
            drawEllipseObject(obj, context);
        }
    });
     // ✅ DIBUJAR COMPONENTE PENDIENTE (SEMI-TRANSPARENTE)
    if (currentTool === 'dragNewComponent' && pendingComponent) {
        context.globalAlpha = 0.7;
        drawComponentObject(pendingComponent, context);
        context.globalAlpha = 1.0;
    }

   
    
    // Dibujar puntos de conexión y guías
    if (currentTool === 'connect' || currentTool === 'dragNewComponent') {
        drawConnectionPoints(context);
    }

     
    
    
    // Dibujar conexión temporal si estamos en modo conexión
    if (currentTool === 'connect' && isConnecting && currentConnection) {
        context.beginPath();
        context.moveTo(
            currentConnection.from.component.x + currentConnection.from.point.x, 
            currentConnection.from.component.y + currentConnection.from.point.y
        );
        context.lineTo(currentConnection.tempX, currentConnection.tempY);
        
        context.strokeStyle = currentColor;
        context.lineWidth = currentLineWidth;
        
        if (currentLineType === 'dashed') {
            context.setLineDash([2, 5]);
        } else if (currentLineType === 'dotted') {
            context.setLineDash([2, 5]);
        } else {
            context.setLineDash([]);
        }
        
        context.stroke();
        context.setLineDash([]);
    }
    
    // Dibujar puntos de conexión si estamos en modo conexión
    if (currentTool === 'connect') {
        canvasObjects.forEach(obj => {
            if (obj.type === 'component' && obj.connectionPoints) {
                obj.connectionPoints.forEach(point => {
                    const globalX = obj.x + point.x;
                    const globalY = obj.y + point.y;
                    
                    context.beginPath();
                    context.arc(globalX, globalY, 4, 0, Math.PI * 2);
                    context.fillStyle = point.type === 'input' ? '#2ecc71' : 
                                      point.type === 'output' ? '#e74c3c' : '#3498db';
                    context.fill();
                    context.strokeStyle = '#fff';
                    context.lineWidth = 1;
                    context.stroke();
                });
            }
        });
    }

   // Si estamos en modo cálculo, actualizar resultados RCD
if (currentTool === 'Calcular') {
    calcularSumasRCD();
}
    // Dibujar indicadores temporales
drawTemporaryIndicators(context);
}

// Dibuja todos los puntos de conexión
function drawConnectionPoints(context = ctx) {
    canvasObjects.forEach(obj => {
        if (obj.type === 'component' && obj.connectionPoints) {
            obj.connectionPoints.forEach(point => {
                const globalX = obj.x + point.x;
                const globalY = obj.y + point.y;

                context.beginPath();
                context.arc(globalX, globalY, 5, 0, Math.PI * 2);

                // Color diferente según el tipo de conexión
                if (point.type === 'input') {
                    context.fillStyle = '#2ecc71'; // Verde para entradas
                } else if (point.type === 'output') {
                    context.fillStyle = '#e74c3c'; // Rojo para salidas
                } else {
                    context.fillStyle = '#3498db'; // Azul para otros tipos
                }

                context.fill();
                context.strokeStyle = '#fff';
                context.lineWidth = 2;
                context.stroke();
            });
        }
    });
}

// Dibuja una conexión entre componentes
function drawConnection(conn, context = ctx) {
    const fromX = conn.from.component.x + conn.from.point.x;
    const fromY = conn.from.component.y + conn.from.point.y;
    const toX = conn.to.component.x + conn.to.point.x;
    const toY = conn.to.component.y + conn.to.point.y;
    
    // Dibujar línea ortogonal (con ángulos rectos)
    context.beginPath();
    context.moveTo(fromX, fromY);
    
    // Primera parte vertical u horizontal según posición
    if (Math.abs(fromX - toX) > Math.abs(fromY - toY)) {
        // Más diferencia en X que en Y - empezar horizontal
        context.lineTo(toX, fromY);
        context.lineTo(toX, toY);
    } else {
        // Más diferencia en Y que en X - empezar vertical
        context.lineTo(fromX, toY);
        context.lineTo(toX, toY);
    }
    
    context.strokeStyle = conn.color || currentColor;
    context.lineWidth = conn.width || currentLineWidth;
    
    if (conn.lineType === 'dashed') {
        context.setLineDash([5, 3]);
    } else if (conn.lineType === 'dotted') {
        context.setLineDash([2, 2]);
    } else {
        context.setLineDash([]);
    }
    
    context.stroke();
    context.setLineDash([]);
}

// Dibuja un objeto de línea
function drawLineObject(line, context = ctx) {
    context.beginPath();
    context.moveTo(line.x1, line.y1);
    context.lineTo(line.x2, line.y2);
    
    context.strokeStyle = line.color || currentColor;
    context.lineWidth = line.width || currentLineWidth;
    
    if (line.lineType === 'dashed') {
        context.setLineDash([5, 3]);
    } else if (line.lineType === 'dotted') {
        context.setLineDash([2, 5]);
    } else {
        context.setLineDash([]);
    }
    
    context.stroke();
    context.setLineDash([]);
    
    // Resaltado de selección
    if (line === selectedObject) {
        context.strokeStyle = '#4CAF50';
        context.lineWidth = 2;
        context.setLineDash([5, 3]);
        context.beginPath();
        context.moveTo(line.x1, line.y1);
        context.lineTo(line.x2, line.y2);
        context.stroke();
        context.setLineDash([]);
    }
}




function snapToConnectionPoints(comp, tolerance = 10) {
    // Buscar puntos de conexión de otros componentes que sean outputs y estén cerca de los inputs del componente pendiente
    for (let obj of canvasObjects) {
        if (obj.type === 'component' && obj.connectionPoints) {
            for (let point of obj.connectionPoints) {
                if (point.type === 'output') {
                    const globalX = obj.x + point.x;
                    const globalY = obj.y + point.y;

                    // Verificar si alguno de los puntos de entrada del componente pendiente está cerca
                    for (let compPoint of comp.connectionPoints) {
                        if (compPoint.type === 'input') {
                            const compGlobalX = comp.x + compPoint.x;
                            const compGlobalY = comp.y + compPoint.y;
                            const distance = Math.sqrt(Math.pow(globalX - compGlobalX, 2) + Math.pow(globalY - compGlobalY, 2));
                            if (distance <= tolerance) {
                                // Ajustar la posición del componente pendiente para que los puntos coincidan
                                comp.x = globalX - compPoint.x;
                                comp.y = globalY - compPoint.y;
                                return; // Solo acoplamos al primero que encontremos
                            }
                        }
                    }
                }
            }
        }
    }
}

// Dibuja un objeto componente
function drawComponentObject(comp, context = ctx) {
    if (comp.image) {
        context.drawImage(comp.image, comp.x, comp.y, comp.width, comp.height);
    } else {
        // Dibujar un placeholder si la imagen no está cargada
        context.strokeStyle = '#999';
        context.lineWidth = 1;
        context.strokeRect(comp.x, comp.y, comp.width, comp.height);
        context.fillStyle = '#f8f9fa';
        context.fillRect(comp.x, comp.y, comp.width, comp.height);
        
        context.fillStyle = '#333';
        context.font = '10px Arial';
        context.textAlign = 'center';
        context.fillText(comp.componentId, comp.x + comp.width/2, comp.y + comp.height/2);
        context.textAlign = 'left';
    }
    
    // Configuración de texto
    context.fillStyle = comp.textColor || '#000000';
    context.font = comp.textFont || '10px Arial';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    
    // Textos horizontales (derecha del componente)
    if (comp.fatherText) context.fillText(comp.fatherText, comp.x + 50, comp.y + 0);// padre
    if (comp.text1) context.fillText(comp.text1, comp.x + 50, comp.y + 10);// Intensidad
    if (comp.text2) context.fillText(comp.text2, comp.x + 50, comp.y + 20);// Polaridad
    if (comp.text3) context.fillText(comp.text3, comp.x + 50, comp.y + 30); // Curva
    if (comp.text4) context.fillText(comp.text4, comp.x + 50, comp.y + 40);// poder de corte
    if (comp.text5) context.fillText(comp.text5, comp.x + 50, comp.y + 50);
    if (comp.text6) context.fillText(comp.text6, comp.x + 50, comp.y + 60);
    
    // Textos verticales (girados 90°)
    if (comp.vertText1 || comp.vertText2 || comp.footerText2 || comp.vertText3) {
        context.save();
        context.translate(comp.x + 50, comp.y + comp.height - 1);
        context.rotate(-Math.PI / 2);
        if (comp.vertText1) context.fillText(comp.vertText1, 0, 0);
        context.restore();
        
        context.save();
        context.translate(comp.x + 60, comp.y + comp.height - 1);
        context.rotate(-Math.PI / 2);
        if (comp.vertText2) context.fillText(comp.vertText2, 0, 0);
        context.restore();

        context.save();
        context.translate(comp.x + 70, comp.y + comp.height - 1);
        context.rotate(-Math.PI / 2);
        if (comp.vertText3) context.fillText(comp.vertText3, 0, 0);
        context.restore();

         context.save();
        context.translate(comp.x + 20, comp.y + comp.height - 20);
        context.rotate(-Math.PI / 2);
    if (comp.footerText2)context.fillText(comp.footerText2, 0, 0);
        context.restore();

        
    }
    
    // Texto pie de imagen (centrado debajo)
    if (comp.footerText) {
        context.textAlign = 'center';
        context.fillText(comp.footerText, comp.x + comp.width / 2, comp.y + comp.height + 15);
        context.textAlign = 'left';
    }
	
	
    
    // Resaltado de selección
    if (comp === selectedObject) {
        context.strokeStyle = '#4CAF50';
        context.lineWidth = 2;
        context.setLineDash([5, 3]);
        context.strokeRect(comp.x - 3, comp.y - 3, comp.width + 6, comp.height + 6);
        context.setLineDash([]);
    }

    // --- Círculo de advertencia si no tiene footerText y no tiene conexiones de salida ---
    // 1. ¿footerText vacío?
    const isFooterEmpty = !comp.footerText || comp.footerText.trim() === '';
    // 2. ¿tiene alguna conexión de salida?
    const hasOutputConnection = connections.some(c => c.from && c.from.component === comp);
    if (isFooterEmpty && !hasOutputConnection) {
        // Dibuja círculo rojo con exclamación en la esquina superior izquierda del componente (lejos del output)
        context.save();
        context.beginPath();
        const cx = comp.x + 40;
        const cy = comp.y + 80;
        context.arc(cx, cy, 8, 0, 2 * Math.PI);
        context.fillStyle = '#e7877fff';
        context.shadowColor = '#fff';
        context.shadowBlur = 4;
        context.fill();
        context.shadowBlur = 0;
        context.font = 'bold 15px Arial';
        context.fillStyle = '#fff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('!', cx, cy+1);
        context.restore();
        // Guardar la posición del círculo para el tooltip
        if (!comp._warningCircle) comp._warningCircle = {};
        comp._warningCircle.x = cx;
        comp._warningCircle.y = cy;
        comp._warningCircle.r = 11;
    } else {
        comp._warningCircle = null;
    }
}

// Dibuja un objeto elipse
function drawEllipseObject(ellipse, context = ctx) {
    context.beginPath();
    context.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, Math.PI * 2);
    
    context.strokeStyle = ellipse.color || currentColor;
    context.lineWidth = ellipse.width || currentLineWidth;
    
    if (ellipse.lineType === 'dashed') {
        context.setLineDash([5, 3]);
    } else if (ellipse.lineType === 'dotted') {
        context.setLineDash([2, 2]);
    } else {
        context.setLineDash([]);
    }
    
    context.stroke();
    context.setLineDash([]);
    
    // Resaltado de selección
    if (ellipse === selectedObject) {
        context.strokeStyle = '#4CAF50';
        context.lineWidth = 2;
        context.setLineDash([5, 3]);
        context.beginPath();
        context.ellipse(ellipse.x, ellipse.y, ellipse.radiusX + 3, ellipse.radiusY + 3, 0, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
    }
}

function toggleShowGuides(value) {
    // si no se pasa value, alterna; si se pasa, fuerza true/false
    if (typeof value === 'undefined') showGuides = !showGuides;
    else showGuides = !!value;
    const checkbox = document.getElementById('showGuides');
    if (checkbox) checkbox.checked = showGuides;
    redrawCanvas();
}



// Detecta si el objeto se alinea con otros objetos
function detectAlignments(x, y, width, height, ignoreObject = null) {
    guideLines.horizontal = null;
    guideLines.vertical = null;
    
   showGuides = true; // Forzar mostrar guías al detectar alineaciones
    
    const tolerance = 2; // Tolerancia más pequeña para mejor precisión
    
    // Puntos de referencia del objeto actual
    const centerX = x + width / 2;
const centerY = y + height / 2;
const left = centerX - width / 2;
const right = centerX + width / 2;
const top = centerY - height / 2;
const bottom = centerY + height / 2;

    
    // Comprobar alineación con otros objetos
    canvasObjects.forEach(obj => {
        if (obj === ignoreObject || obj.layerId !== currentLayerId || obj.type !== 'component') return;
        
        const objLeft = obj.x;
        const objRight = obj.x + obj.width;
        const objTop = obj.y;
        const objBottom = obj.y + obj.height;
        const objCenterX = obj.x + obj.width / 2;
        const objCenterY = obj.y + obj.height / 2;
        
        // Alineaciones horizontales (misma Y)
        if (Math.abs(top - objTop) <= tolerance) guideLines.horizontal = objTop;
        else if (Math.abs(centerY - objCenterY) <= tolerance) guideLines.horizontal = objCenterY;
        else if (Math.abs(bottom - objBottom) <= tolerance) guideLines.horizontal = objBottom;
        else if (Math.abs(top - objBottom) <= tolerance) guideLines.horizontal = objBottom;
        else if (Math.abs(bottom - objTop) <= tolerance) guideLines.horizontal = objTop;
        
        // Alineaciones verticales (misma X)
        if (Math.abs(left - objLeft) <= tolerance) guideLines.vertical = objLeft;
        else if (Math.abs(centerX - objCenterX) <= tolerance) guideLines.vertical = objCenterX;
        else if (Math.abs(right - objRight) <= tolerance) guideLines.vertical = objRight;
        else if (Math.abs(left - objRight) <= tolerance) guideLines.vertical = objRight;
        else if (Math.abs(right - objLeft) <= tolerance) guideLines.vertical = objLeft;
    });
    
    // Comprobar alineación con el centro del canvas
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    if (Math.abs(centerX - canvasCenterX) <= tolerance) {
        guideLines.vertical = canvasCenterX;
    }
    if (Math.abs(centerY - canvasCenterY) <= tolerance) {
        guideLines.horizontal = canvasCenterY;
    }
    // Comprobar alineación con bordes del canvas
    if (Math.abs(left - 0) <= tolerance) guideLines.vertical = 0;
    if (Math.abs(right - canvas.width) <= tolerance) guideLines.vertical = canvas.width;
    if (Math.abs(top - 0) <= tolerance) guideLines.horizontal = 0;
    if (Math.abs(bottom - canvas.height) <= tolerance) guideLines.horizontal = canvas.height;
}

// ✅ FUNCIÓN AUXILIAR MEJORADA PARA DETECTAR ZONAS DE AUTO-CONEXIÓN
function detectarZonaAutoConexion(componente, mouseX, mouseY) {
    window.enZonaAutoConexion = false;
    window.puntoAutoConexionX = 0;
    window.puntoAutoConexionY = 0;
    window.componenteAutoConexion = null;
    window.puntoAutoConexion = null;

    if (!componente || !componente.connectionPoints) {
       
        return;
    }

    // Buscar input principal del componente
    const inputPoint = componente.connectionPoints.find(p => p.type === 'input');
    if (!inputPoint) {
        
        return;
    }

    const inputX = componente.x + inputPoint.x;
    const inputY = componente.y + inputPoint.y;
    
    
    
    // Buscar output cercano de otros componentes
    for (const obj of canvasObjects) {
        // ✅ EXCLUIR EL COMPONENTE ACTUAL
        if (obj === componente || obj.type !== 'component' || !obj.connectionPoints) continue;
        
        for (const outPoint of obj.connectionPoints) {
            if (outPoint.type !== 'output') continue;

            const outX = obj.x + outPoint.x;
            const outY = obj.y + outPoint.y;

            const distX = Math.abs(inputX - outX);
            const distY = Math.abs(inputY - outY);

            // Tolerancias ajustadas
            const horizontalTolerance = 40;
            const verticalTolerance = 15;

            let enZona = false;

            if (distY <= verticalTolerance && distX <= horizontalTolerance) {
                enZona = true;
            } else if (distX <= 20 && distY <= 20) {
                enZona = true;
            }

            if (enZona) {
                window.enZonaAutoConexion = true;
                window.puntoAutoConexionX = outX;
                window.puntoAutoConexionY = outY;
                window.componenteAutoConexion = obj;
                window.puntoAutoConexion = outPoint;
                
               
                return;
            }
        }
    }
    
   
}

// Encuentra un objeto en una posición dada
function getObjectAtPosition(x, y) {
    // Primero verifica componentes (en orden inverso para seleccionar el superior)
    for (let i = canvasObjects.length - 1; i >= 0; i--) {
        const obj = canvasObjects[i];
        
        if (obj.layerId !== currentLayerId) continue;
        
        if (obj.type === 'component') {
            if (x >= obj.x && x <= obj.x + obj.width && 
                y >= obj.y && y <= obj.y + obj.height) {
                return obj;
            }
        } else if (obj.type === 'line') {
            // Verifica proximidad a la línea
            if (isPointNearLine(x, y, obj.x1, obj.y1, obj.x2, obj.y2, 5)) {
                return obj;
            }
        } else if (obj.type === 'ellipse') {
            // Verifica si el punto está dentro de la elipse
            const dx = (x - obj.x) / obj.radiusX;
            const dy = (y - obj.y) / obj.radiusY;
            if (dx * dx + dy * dy <= 1) {
                return obj;
            }
        }
    }
    return null;
}

// Encuentra un punto de conexión en una posición dada
function getConnectionPointAtPosition(x, y) {
    for (let i = 0; i < canvasObjects.length; i++) {
        const obj = canvasObjects[i];
        if (obj.type === 'component' && obj.connectionPoints) {
            for (let j = 0; j < obj.connectionPoints.length; j++) {
                const point = obj.connectionPoints[j];
                const globalX = obj.x + point.x;
                const globalY = obj.y + point.y;
                
                // Verifica si el punto está cerca del punto de conexión
                const distance = Math.sqrt(Math.pow(x - globalX, 2) + Math.pow(y - globalY, 2));
                if (distance <= 8) { // Radio de 8px para hacer click
                    return {
                        component: obj,
                        point: point
                    };
                }
            }
        }
    }
    return null;
}

// Función auxiliar para verificar si un punto está cerca de una línea
function isPointNearLine(px, py, x1, y1, x2, y2, threshold) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Calcula la distancia del punto a la línea
    const distance = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / length;
    
    // Verifica si está dentro del umbral y dentro de los límites del segmento
    if (distance > threshold) return false;
    
    const dotProduct = ((px - x1) * dx + (py - y1) * dy) / (length * length);
    return dotProduct >= 0 && dotProduct <= 1;
}

// Añade un componente al canvas por ID

    function addComponentById(compId) {
    const compInfo = componentDatabase.find(c => c.id === compId);
    if (!compInfo) return;
   

    console.log('➕ Creando componente:', compId);

    // Crear el objeto del componente
    const newComponent = {
        type: 'component',
        componentId: compInfo.id,
        image: null,
        x: 100, // Posición inicial visible
        y: 100,
        width: compInfo.width,
        height: compInfo.height,
        connectionPoints: compInfo.connectionPoints ? [...compInfo.connectionPoints] : [],
        fatherText: compInfo.defaultTexts.fatherText,
        text1: compInfo.defaultTexts.text1,
        text2: compInfo.defaultTexts.text2,
        text3: compInfo.defaultTexts.text3,
        text4: compInfo.defaultTexts.text4,
        text5: compInfo.defaultTexts.text5,
        text6: compInfo.defaultTexts.text6,
        vertText1: compInfo.defaultTexts.vertText1,
        vertText2: compInfo.defaultTexts.vertText2,
        vertText3: compInfo.defaultTexts.vertText3,
        footerText: compInfo.defaultTexts.footerText,
        footerText2: compInfo.defaultTexts.footerText2,
        textColor: '#000000',
        textFont: '10px Arial',
        layerId: currentLayerId
    };

    // Cargar la imagen
    const img = new Image();
	img.crossOrigin = "anonymous"; // <-- Añade esto
    img.onload = function() {
        newComponent.image = img;
        console.log('✅ Imagen cargada:', compInfo.url);
        redrawCanvas();
    };
    img.onerror = function() {
        console.error('❌ Error al cargar imagen:', compInfo.url);
        // Continuar sin imagen
        redrawCanvas();
    };
    img.src = compInfo.url;

    // ✅ ESTABLECER COMPONENTE PENDIENTE Y ACTIVAR DRAG
    pendingComponent = newComponent;
    selectedObject = newComponent;

    // ✅ ABRIR MODAL DE PROPIEDADES INMEDIATAMENTE
    showPropertiesPanel(newComponent);   
   
    
    console.log('🎯 Modo drag activado para:', compId);
    updateStatus('Arrastra el componente a la posición deseada. Se conectará automáticamente si está cerca de un punto de salida.');
    
    redrawCanvas();
}



function updateToolUI(tool) {
    // Limpiar todas las clases activas
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active', 'active-select');
    });
    
    canvas.classList.remove('mode-connect');

    if (tool === 'draw') {
        document.getElementById('drawTool').classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'ellipse') {
        document.getElementById('ellipseTool').classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'move') {
        document.getElementById('moveTool').classList.add('active');
        canvas.style.cursor = 'move';
    } else if (tool === 'select') {
        document.getElementById('selectTool').classList.add('active-select');
        canvas.style.cursor = 'pointer';
    } else if (tool === 'connect') {
        document.getElementById('connectTool').classList.add('active');
        canvas.style.cursor = 'crosshair';
        canvas.classList.add('mode-connect');
    } else if (tool === 'Calcular') {
        document.getElementById('CalcularTool').classList.add('active');
        canvas.style.cursor = 'default';
    } else if (tool === 'dragNewComponent') {
        // ✅ MODO DRAG PARA NUEVO COMPONENTE
        canvas.style.cursor = 'grab';
        updateStatus('Arrastrando nuevo componente...');
    }
}


// Elimina el objeto seleccionado
function deleteSelectedObject() {
    if (!selectedObject) {
        updateStatus('No hay objeto seleccionado para eliminar.');
        return;
    }
    
    // Eliminar también las conexiones relacionadas con este objeto
    if (selectedObject.type === 'component') {
        connections = connections.filter(conn => 
            conn.from.component !== selectedObject && conn.to.component !== selectedObject
        );
    }
    
    const index = canvasObjects.indexOf(selectedObject);
    if (index !== -1) {
        canvasObjects.splice(index, 1);
        selectedObject = null;
        showNoSelectionMessage();
        saveState();
        redrawCanvas();
         calcularSumasRCD();
        updateStatus('Objeto eliminado.');
    }
	 // Cerrar el modal después de eliminar
            propertiesModal.classList.remove('active');
}

// Muestra el panel de propiedades para un objeto

   function showPropertiesPanel(obj) {
    if (obj.type === 'component') {
        // Ocultar todos los grupos de propiedades primero
        document.querySelectorAll('.property-group').forEach(group => {
            group.style.display = 'none';
        });
        
        document.getElementById('propFooterText').value = obj.footerText || '';
        document.getElementById('propFooterText2').value = obj.footerText2 || '';
        document.getElementById('propFatherText').value = obj.fatherText || '';
        document.getElementById('propTextColor').value = obj.textColor || '#000000';
        document.getElementById('propFontSize').value = obj.textFont || '10px Arial';
        
        // Mostrar solo las propiedades relevantes para este componente
        switch(obj.componentId) {
            case 'supply':
                document.querySelector('.supply-props').style.display = 'block';
                break;
            case 'breaker':
                document.querySelector('.breaker-props').style.display = 'block';
                
                break;
            case 'compact':
                document.querySelector('.compact-props').style.display = 'block';
                break;

            case 'rcd':
                document.querySelector('.rcd-props').style.display = 'block';
				 // Guardar la fase seleccionada
                 const faseSelector = document.getElementById('rcdFase');
                if (faseSelector) {
                  selectedObject.fase = faseSelector.value;
                }
                break;
            case 'contactorNO':
            case 'contactorNA':
                document.querySelector('.contactor-props').style.display = 'block';
                break;
            case 'SAI':
                document.querySelector('.sai-props').style.display = 'block';
                break;
            case 'Bcondesa':
                document.querySelector('.capacitor-props').style.display = 'block';
                break;
            case 'tranfo':
                document.querySelector('.transformer-props').style.display = 'block';
                break;
            case 'seccionador':
                document.querySelector('.seccionador-props').style.display = 'block';
                break;
            case 'Stension':
                document.querySelector('.overtension-props').style.display = 'block';
                break;
            case 'Relog':
                document.querySelector('.timer-props').style.display = 'block';
                break;
            case 'Contador':
                document.querySelector('.counter-props').style.display = 'block';
                break;
            case 'conmutador':
                document.querySelector('.switch-props').style.display = 'block';
                break;
            case 'Grupo':
                document.querySelector('.group-props').style.display = 'block';
                break;
                
        }

        // Configurar el botón "Aceptar" específicamente para componentes pendientes
        const addComponentBtn = document.getElementById('addComponentBtn');
        if (obj === pendingComponent) {
            addComponentBtn.style.display = 'inline-block';
            addComponentBtn.textContent = 'Aceptar y Colocar';

              // ✅ CONFIGURAR EL EVENTO CLICK PARA INICIAR EL DRAG & DROP
            addComponentBtn.onclick = function() {
                // Cerrar el modal
                propertiesModal.classList.remove('active');
                
                // ✅ ACTIVAR MODO DRAG & DROP DESPUÉS DE ACEPTAR
                currentTool = 'dragNewComponent';
                updateToolUI('dragNewComponent');
                canvas.style.cursor = 'grab';
            
             console.log('🎯 Modo drag activado después de aceptar propiedades');
                updateStatus('Arrastra el componente a la posición deseada. Se conectará automáticamente si está cerca de un punto de salida.');
                redrawCanvas();
            };
        } else {
            addComponentBtn.style.display = 'none';
        }
        
        // Mostrar el modal
        propertiesModal.classList.add('active');
        
        // Actualizar título del modal
        const compInfo = componentDatabase.find(c => c.id === obj.componentId);
        document.getElementById('propertiesModalTitle').textContent = 
            `Propiedades: ${compInfo ? compInfo.name : 'Componente'}`;
    }
}
function cancelComponentPlacement() {
    if (pendingComponent) {
        pendingComponent = null;
        selectedObject = null;
        currentTool = 'move';
        
        // Actualizar UI
        updateToolUI('move');
        canvas.style.cursor = 'move';
        updateStatus('Colocación cancelada. Modo mover activado.');
        redrawCanvas();
    }
}

// --- ACTUALIZAR EL EVENT LISTENER DEL BOTÓN CERRAR MODAL ---
document.getElementById('closePropertiesModal').addEventListener('click', function() {
    propertiesModal.classList.remove('active');
    
    // Si hay componente pendiente, cancelarlo al cerrar el modal
    if (pendingComponent) {
        const confirmCancel = confirm('¿Cancelar la colocación del componente?');
        if (confirmCancel) {
            cancelComponentPlacement();
        } else {
            // Si el usuario elige no cancelar, mantener el modal abierto
            propertiesModal.classList.add('active');
            return;
        }
    }
});


// Muestra el mensaje de no selección
        function showNoSelectionMessage() {
            propertiesModal.classList.remove('active');
        }

// Actualiza las propiedades del objeto seleccionado
function updateObjectProperties() {
    if (!selectedObject || selectedObject.type !== 'component') return;
    
    // Obtener valores de los campos de texto
    selectedObject.footerText = document.getElementById('propFooterText').value;
	selectedObject.footerText2 = document.getElementById('propFooterText2').value;
    selectedObject.fatherText = document.getElementById('propFatherText').value;
    selectedObject.textColor = document.getElementById('propTextColor').value;
    selectedObject.textFont = document.getElementById('propFontSize').value;
    
    // Actualizar propiedades según el tipo de componente
    switch(selectedObject.componentId) {
        case 'supply':
            selectedObject.text2 = document.getElementById('supplyPolarity').value;             
            selectedObject.text5 = document.getElementById('supplyVoltage').value;
            selectedObject.vertText1 = document.getElementById('supplySection').value;
            selectedObject.vertText2 = document.getElementById('supplyIsolation').value;
            selectedObject.vertText3 = document.getElementById('supplyStandards').value;
            break;
        case 'breaker':
            selectedObject.text1 = document.getElementById('breakerIntensity').value;
            selectedObject.text2 = document.getElementById('breakerPolarity').value;           
            selectedObject.text3 = document.getElementById('breakerCurve').value;
            selectedObject.text4 = document.getElementById('breakerCuttingPower').value;
            selectedObject.vertText1 = document.getElementById('breakerSection').value;
            selectedObject.vertText2 = document.getElementById('breakerIsolation').value;
            selectedObject.vertText3 = document.getElementById('breakerStandards').value;
           
             // Ejecutar cálculo automático si es breaker
    if (selectedObject === pendingComponent) { // ✅ CAMBIADO: pendingComponentObj por pendingComponent
        if (selectedObject.componentId === 'breaker') {
            calcularBreakerAuto();
        }
    }

   
            break;
        case 'rcd':
            selectedObject.fase = document.getElementById('rcdFase').value;
            selectedObject.text1 = document.getElementById('rcdIntensity').value;
            selectedObject.text2 = document.getElementById('rcdPolarity').value;            
            selectedObject.text3 = document.getElementById('rcdSensitivity').value;
            selectedObject.text4 = document.getElementById('rcdClass').value;
            selectedObject.text5 = document.getElementById('rcdType').value;
            selectedObject.text6 = document.getElementById('rcdConfiguracion').value;
            
            break;
        case 'contactorNO':
        case 'contactorNA':
            selectedObject.text2 = document.getElementById('contactorPolarity').value;
            selectedObject.text1 = document.getElementById('contactorIntensity').value;
            selectedObject.text3 = document.getElementById('contactorCoilVoltage').value;
            selectedObject.text4 = document.getElementById('contactorFunction').value;
            break;
        case 'SAI':
            selectedObject.text3 = document.getElementById('saiPower').value;
            selectedObject.text4 = document.getElementById('saiInputVoltage').value;
            selectedObject.text5 = document.getElementById('saiOutputVoltage').value;
            selectedObject.text6 = document.getElementById('saiAutonomy').value;
            break;
        case 'Bcondesa':
            selectedObject.text1 = document.getElementById('capacitorPower').value;
            selectedObject.text2 = document.getElementById('capacitorVoltage').value;
            selectedObject.text3 = document.getElementById('capacitorSteps').value;
            selectedObject.text4 = document.getElementById('capacitorRegulation').value;
            break;
        case 'tranfo':
            selectedObject.text1 = document.getElementById('transformerPower').value;
            selectedObject.text2 = document.getElementById('transformerPrimaryVoltage').value;
            selectedObject.text3 = document.getElementById('transformerSecondaryVoltage').value;
            selectedObject.text4 = document.getElementById('transformerConnection').value;
            break;
        case 'seccionador':            
            selectedObject.text1 = document.getElementById('seccionadorIntensity').value;
            selectedObject.text2 = document.getElementById('seccionadorPolarity').value;
            selectedObject.text3 = document.getElementById('seccionadorCuttingPower').value;
            selectedObject.text4 = document.getElementById('seccionadorVoltage').value;
            selectedObject.text5 = document.getElementById('ContactType').value;
            selectedObject.text6 = document.getElementById('Frecuencia').value;
            break;
        case 'Stension':           
            selectedObject.text1 = document.getElementById('TipoST').value;
            selectedObject.text2 = document.getElementById('maximaDescarga').value;
            selectedObject.text3 = document.getElementById('Protection').value;
            selectedObject.text4 = document.getElementById('PolaridadST').value;
            break;
        case 'Relog':
            selectedObject.text1 = document.getElementById('timerFunction').value;
            selectedObject.text2 = document.getElementById('timerRange').value;
            selectedObject.text3 = document.getElementById('timerVoltage').value;
            selectedObject.text4 = document.getElementById('timerContacts').value;
            break;
        case 'Contador':
            selectedObject.text1 = document.getElementById('counterType').value;
            selectedObject.text2 = document.getElementById('counterVoltage').value;
            selectedObject.text3 = document.getElementById('counterFrequency').value;
            selectedObject.text4 = document.getElementById('counterOutput').value;
            break;
        case 'conmutador':
            selectedObject.text1 = document.getElementById('switchIntensity').value;
            selectedObject.text2 = document.getElementById('switchVoltage').value;
            selectedObject.text3 = document.getElementById('switchPositions').value;
            selectedObject.text4 = document.getElementById('switchControl').value;
            break;
        case 'Grupo':
            selectedObject.text1 = document.getElementById('groupTotalIntensity').value;
            selectedObject.text3 = document.getElementById('groupCircuits').value;           
            selectedObject.text4 = document.getElementById('groupProtection').value;
            selectedObject.text5 = document.getElementById('groupProtectionDegree').value;
            break;
           
    }
    
   //  saveState();   No guardar estado aún porque el componente no está en el canvas
    redrawCanvas();
    calcularSumasRCD();
    updateStatus('Propiedades del componente actualizadas.');
    // No cerrar el modal automáticamente en edición en tiempo real
  }

// Funcion Calculo de potencia

function calcularTodo() {
    console.log('Función calcularTodo ejecutada');

    // 1. Calcular potencias (código existente)
    const hijosMap = new Map();
    canvasObjects.forEach(obj => {
        if (obj.type === 'component') {
            hijosMap.set(obj, []);
        }
    });
    
    connections.forEach(conn => {
        if (conn.from && conn.from.point.type === 'output' && conn.to && conn.to.point.type === 'input') {
            if (hijosMap.has(conn.from.component)) {
                hijosMap.get(conn.from.component).push(conn.to.component);
            }
        }
    });

    // 2. Recorrido DFS para sumar toda la potencia de los descendientes
   function calcularPotenciaDFS(comp, visitados) {
        if (!visitados) visitados = new Set();
        if (visitados.has(comp)) return 0;
        visitados.add(comp);
        const hijos = hijosMap.get(comp) || [];
        if (!hijos.length) {
            const val = parseFloat(comp.footerText2);
            return isNaN(val) ? 0 : val;
        }
        let suma = 0;
        hijos.forEach(hijo => {
            suma += calcularPotenciaDFS(hijo, new Set(visitados));
        });
        comp.footerText2 = suma.toString();
        return suma;
    }
    // 3. Buscar el supply y lanzar el cálculo desde ahí
      const suministro = canvasObjects.find(obj => obj.type === 'component' && obj.componentId === 'supply');
    if (suministro) {
        calcularPotenciaDFS(suministro);

        // ✅ NUEVO: Recalcular propiedades del supply después de calcular potencias
        setTimeout(() => {
            selectedObject = suministro;
            calcularSupplyAuto();
            selectedObject = null;
        }, 100);
    }

    if (!suministro) {
        updateStatus('No se encontró un componente de suministro en el lienzo.');
        return;
    }

    const potenciaW = parseFloat(suministro.footerText2 || '0');
    const voltajeText = suministro.text2 || '0V';
    const voltaje = parseFloat(voltajeText.replace('V', '').replace('CA', '').trim());

    if (isNaN(potenciaW) || isNaN(voltaje) || voltaje === 0) {
        updateStatus('Los valores de potencia o voltaje no son válidos.');
        return;
    }

   const potenciaKW = potenciaW / 1000;
    const corriente = potenciaW / (Math.sqrt(3) * voltaje);
    const longitudCable = 30;
    const resistenciaPorKm = 1.91;
    const resistenciaTotal = resistenciaPorKm * (longitudCable / 1000);
    const caidaTension = Math.sqrt(3) * corriente * resistenciaTotal;
    const calibres = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 150, 175, 200, 225, 250];
    const proteccion = calibres.find(c => c >= corriente) || '≥250A';

     const tablaSeccion = [
     { seccion: '1.5 mm²', maxA: 14 },
        { seccion: '2.5 mm²', maxA: 20 },
        { seccion: '4 mm²', maxA: 25 },
        { seccion: '6 mm²', maxA: 32 },
        { seccion: '10 mm²', maxA: 40 },
        { seccion: '16 mm²', maxA: 63 },
        { seccion: '25 mm²', maxA: 80 },
        { seccion: '35 mm²', maxA: 100 },
        { seccion: '50 mm²', maxA: 125 },
        { seccion: '70 mm²', maxA: 160 },
        { seccion: '95 mm²', maxA: 200 },
        { seccion: '120 mm²', maxA: 225 },
        { seccion: '150 mm²', maxA: 260 }
    ];
    
    let seccionCable = '≥150 mm²';
    for (let i = 0; i < tablaSeccion.length; i++) {
        if (corriente <= tablaSeccion[i].maxA) {
            seccionCable = tablaSeccion[i].seccion;
            break;
        }
    }

    const horasDia = 8;
    const diasMes = 30;
    const consumoMensualKWh = potenciaKW * horasDia * diasMes;

    const resultadoPanel = document.getElementById('resultadoCalculoPanel');
    resultadoPanel.innerHTML = `
         <strong>Potencia instalada:</strong> ${potenciaW} W (${potenciaKW.toFixed(2)} kW)<br>
        <strong>Tensión del sistema:</strong> ${voltaje} V<br>
        <strong>Corriente estimada:</strong> ${corriente.toFixed(2)} A<br>
        <strong>Caída de tensión estimada:</strong> ${caidaTension.toFixed(2)} V<br>
        <strong>Protección recomendada:</strong> ${proteccion} A<br>
        <strong>Sección de cable recomendada:</strong> ${seccionCable}<br>
        <strong>Consumo mensual estimado:</strong> ${consumoMensualKWh.toFixed(2)} kWh<br>
        <strong>Costo mensual estimado:</strong> $${(consumoMensualKWh * 0.15).toFixed(2)} (a 0.15 €/kWh)
    `;
    
    updateStatus('Cálculos completados. Mostrando resultados.');
    redrawCanvas();
    calcularSumasRCD();
}

// ✅ AGREGAR: Event listeners para recalcular automáticamente cuando cambien componentes
document.addEventListener('DOMContentLoaded', function() {
    // Recalcular supply cuando se añaden/eliminan conexiones
    const originalPush = Array.prototype.push;
    Array.prototype.push = function() {
        const result = originalPush.apply(this, arguments);
        if (this === connections) {
            setTimeout(recalcularSupply, 100);
        }
        return result;
    };

 // Observar cambios en footerText2 de componentes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-footertext2') {
                recalcularSupply();
            }
        });
    });
});
   
 function guardarPreferenciaSeccion() {
    const usarMinima = document.getElementById("usarSeccionMinima").checked;
    localStorage.setItem("preferenciaSeccion", usarMinima ? "minima" : "recomendada");
}

function cargarPreferenciaSeccion() {
    const preferencia = localStorage.getItem("preferenciaSeccion");
    const checkbox = document.getElementById("usarSeccionMinima");
    if (checkbox) {
        checkbox.checked = (preferencia === "minima");
    }
}

// Exportar como PNG
function exportAsPNG() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    redrawCanvas(tempCtx); // Dibuja todo en el canvas temporal

    const link = document.createElement('a');
    link.download = 'diagrama-unifilar.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

// Manejo del historial
function saveState() {
    // Elimina estados futuros si estamos en medio del historial
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }

    // Clonamos profundamente los objetos, incluyendo las imágenes
    const stateToSave = {
        canvasObjects: canvasObjects.map(obj => {
            if (obj.type === 'component') {
                return {
                    ...obj,
                    image: null, // No guardamos la imagen directamente
                    componentId: obj.componentId // Guardamos el ID para reconstruir
                };
            }
            return {...obj};
        }),
        connections: connections.map(conn => ({
            ...conn,
            from: {
                component: { id: conn.from.component.id }, // Solo guardamos el ID
                point: {...conn.from.point}
            },
            to: {
                component: { id: conn.to.component.id }, // Solo guardamos el ID
                point: {...conn.to.point}
            }
        })),
        layers: [...layers],
        currentLayerId: currentLayerId,
        gridSize: gridSize,
        snapToGrid: snapToGrid,
        showGrid: showGrid
    };

    history.push(stateToSave);
    historyIndex = history.length - 1;

    // Limita el historial a 50 estados
    if (history.length > 50) {
        history.shift();
        historyIndex--;
    }

    updateUndoRedoButtons();
}

function undoLastAction() {
    if (historyIndex <= 0) {
        updateStatus('Nada que deshacer.');
        return;
    }
    
    historyIndex--;
    loadStateFromHistory();
    updateStatus('Acción deshecha.');
}

function redoLastAction() {
    if (historyIndex >= history.length - 1) {
        updateStatus('Nada que rehacer.');
        return;
    }
    
    historyIndex++;
    loadStateFromHistory();
    updateStatus('Acción rehecha.');
}

function loadStateFromHistory() {
    const state = history[historyIndex];
    
    // Reconstruimos los objetos del canvas
    canvasObjects = state.canvasObjects.map(obj => {
        if (obj.type === 'component') {
            // Reconstruimos la imagen del componente
            const compInfo = componentDatabase.find(c => c.id === obj.componentId);
            if (compInfo) {
                const img = new Image();
                img.src = compInfo.url;
                
                return {
                    ...obj,
                    image: img,
                    connectionPoints: compInfo.connectionPoints ? [...compInfo.connectionPoints] : []
                };
            }
        }
        return {...obj};
    });

    // Reconstruimos las conexiones
    connections = state.connections.map(conn => {
        const fromComponent = canvasObjects.find(c => c.id === conn.from.component.id);
        const toComponent = canvasObjects.find(c => c.id === conn.to.component.id);
        
        if (fromComponent && toComponent) {
            return {
                ...conn,
                from: {
                    component: fromComponent,
                    point: {...conn.from.point}
                },
                to: {
                    component: toComponent,
                    point: {...conn.to.point}
                }
            };
        }
        return null;
    }).filter(conn => conn !== null);

    layers = [...state.layers];
    currentLayerId = state.currentLayerId;
    gridSize = state.gridSize || DEFAULT_GRID_SIZE;
    snapToGrid = state.snapToGrid !== undefined ? state.snapToGrid : true;
    showGrid = state.showGrid !== undefined ? state.showGrid : true;
    
    // Actualizar controles de la UI
    document.getElementById('gridSize').value = gridSize;
    document.getElementById('snapToGrid').checked = snapToGrid;
    document.getElementById('showGrid').checked = showGrid;
    
    selectedObject = null;
    showNoSelectionMessage();
    redrawCanvas();
    updateLayersList();
    updateUndoRedoButtons();
    updateGridOverlay();
}

// Función de carga de JSON eliminada
/* 
document.getElementById('loadJSON').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
*/
/*
      const data = JSON.parse(e.target.result);
      rebuildDiagram(data);
    } catch (err) {
      console.error('Error al cargar el archivo JSON:', err);
      alert('Archivo inválido o corrupto.');
    }
  };
  reader.readAsText(file);
});
*/


function rebuildDiagram(data) {
  const container = document.getElementById('drawingContainer');
  container.innerHTML = '';

  // Reconstruir componentes
  data.components.forEach(item => {
    const el = document.createElement('div');
    el.classList.add('component', 'exportable');
    el.id = item.id;
    el.setAttribute('data-type', item.type);
    el.setAttribute('data-label', item.label);
    el.style.position = 'absolute';
    el.style.left = item.x + 'px';
    el.style.top = item.y + 'px';
    el.style.width = item.width + 'px';
    el.style.height = item.height + 'px';
    el.style.backgroundColor = 'lightgray';
    el.style.border = '1px solid black';
    el.innerText = item.label;

    container.appendChild(el);
  });

  // Reconstruir conexiones
  data.connections.forEach(conn => {
    const fromEl = document.getElementById(conn.from);
    const toEl = document.getElementById(conn.to);
    if (fromEl && toEl) {
      const line = document.createElement('div');
      line.classList.add('connection');
      line.setAttribute('data-from', conn.from);
      line.setAttribute('data-to', conn.to);
      line.style.position = 'absolute';
      line.style.borderTop = '2px solid black';

      // Posición básica (puedes mejorar esto con cálculo de ángulos)
      const x1 = fromEl.offsetLeft + fromEl.offsetWidth / 2;
      const y1 = fromEl.offsetTop + fromEl.offsetHeight;
      const x2 = toEl.offsetLeft + toEl.offsetWidth / 2;
      const y2 = toEl.offsetTop;

      line.style.left = Math.min(x1, x2) + 'px';
      line.style.top = Math.min(y1, y2) + 'px';
      line.style.width = Math.abs(x2 - x1) + 'px';
      line.style.height = '2px';

      container.appendChild(line);
    }
  });
}



function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = historyIndex <= 0;
    document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
}

// Manejo de capas
function createDefaultLayer() {
    const layerId = generateId();
    layers.push({
        id: layerId,
        name: 'Capa 1',
        visible: true
    });
    currentLayerId = layerId;
    updateLayersList();
}

  function addNewLayer() {
                const layerId = generateId();
                const layerName = `Capa ${layers.length + 1}`;
                
                layers.push({
                    id: layerId,
                    name: layerName,
                    visible: true
                });
                
                currentLayerId = layerId;
                saveState();
                updateLayersList();
                updateStatus(`Nueva capa "${layerName}" creada.`);
            }
    

function toggleLayerVisibility(layerId) {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
        layer.visible = !layer.visible;
        redrawCanvas();
        updateLayersList();
    }
}

function updateLayersList() {
    const layersList = document.getElementById('layersList');
    layersList.innerHTML = '';
    
    layers.forEach(layer => {
        const layerItem = document.createElement('div');
        layerItem.className = `layer-item ${layer.id === currentLayerId ? 'active' : ''}`;
        layerItem.innerHTML = `
            <div class="layer-visibility ${layer.visible ? 'visible' : ''}">
                <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
            </div>
            <span>${layer.name}</span>
        `;
        
        layerItem.addEventListener('click', () => {
            currentLayerId = layer.id;
            updateLayersList();
            redrawCanvas();
        });
        
        const visibilityToggle = layerItem.querySelector('.layer-visibility');
        visibilityToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
        });
        
        layersList.appendChild(layerItem);
    });
}

function toggleLayersPanel() {
    const panel = document.getElementById('layersPanel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

// Manejo de archivos y proyectos
function newProject() {
    showModal('Nuevo proyecto', '¿Estás seguro de que quieres crear un nuevo proyecto? Se perderán los cambios no guardados.', () => {
        canvasObjects = [];
        connections = [];
        selectedObject = null;
        showNoSelectionMessage();
        createDefaultLayer();
        saveState();
        redrawCanvas();
        updateStatus('Nuevo proyecto creado.');
    });
}

function saveProject() {
    const projectData = {
        canvasObjects: canvasObjects.map(obj => {
            if (obj.type === 'component') {
                return {
                    ...obj,
                    image: null, // No guardamos la imagen
                    componentId: obj.componentId
                };
            }
            return {...obj};
        }),
        connections: connections.map(conn => ({
            ...conn,
            from: {
                component: { id: conn.from.component.id },
                point: {...conn.from.point}
            },
            to: {
                component: { id: conn.to.component.id },
                point: {...conn.to.point}
            }
        })),
        layers: [...layers],
        currentLayerId: currentLayerId,
        gridSize: gridSize,
        snapToGrid: snapToGrid,
        showGrid: showGrid,
        version: '1.0'
    };
    
    localStorage.setItem('electricalProject', JSON.stringify(projectData));
    updateStatus('Proyecto guardado en el navegador.');
}

function loadProject() {
    const savedData = localStorage.getItem('electricalProject');
    if (savedData) {
        try {
            const project = JSON.parse(savedData);
            
            // Reconstruir objetos del canvas
            canvasObjects = project.canvasObjects.map(obj => {
                if (obj.type === 'component') {
                    const compInfo = componentDatabase.find(c => c.id === obj.componentId);
                    if (compInfo) {
                        const img = new Image();
                        img.src = compInfo.url;
                        
                        return {
                            ...obj,
                            image: img,
                            connectionPoints: compInfo.connectionPoints ? [...compInfo.connectionPoints] : []
                        };
                    }
                }
                return {...obj};
            });
            
            // Reconstruir conexiones
            connections = project.connections.map(conn => {
                const fromComponent = canvasObjects.find(c => c.id === conn.from.component.id);
                const toComponent = canvasObjects.find(c => c.id === conn.to.component.id);
                
                if (fromComponent && toComponent) {
                    return {
                        ...conn,
                        from: {
                            component: fromComponent,
                            point: {...conn.from.point}
                        },
                        to: {
                            component: toComponent,
                            point: {...conn.to.point}
                        }
                    };
                }
                return null;
            }).filter(conn => conn !== null);
            
            layers = project.layers || [];
            currentLayerId = project.currentLayerId || (layers.length > 0 ? layers[0].id : null);
            gridSize = project.gridSize || DEFAULT_GRID_SIZE;
            snapToGrid = project.snapToGrid !== undefined ? project.snapToGrid : true;
            showGrid = project.showGrid !== undefined ? project.showGrid : true;
            
            // Actualizar controles de la UI
            document.getElementById('gridSize').value = gridSize;
            document.getElementById('snapToGrid').checked = snapToGrid;
            document.getElementById('showGrid').checked = showGrid;
            
            selectedObject = null;
            showNoSelectionMessage();
            redrawCanvas();
            updateLayersList();
            updateStatus('Proyecto cargado desde el navegador.');
        } catch (error) {
            console.error('Error al cargar proyecto:', error);
            updateStatus('Error al cargar el proyecto.');
        }
    } else {
        updateStatus('No hay proyectos guardados.');
    }
}

function exportProject() {
    const projectData = {
        canvasObjects: canvasObjects.map(obj => {
            if (obj.type === 'component') {
                return {
                    ...obj,
                    image: null, // No exportamos la imagen
                    componentId: obj.componentId
                };
            }
            return {...obj};
        }),
        connections: connections.map(conn => ({
            ...conn,
            from: {
                component: { id: conn.from.component.id },
                point: {...conn.from.point}
            },
            to: {
                component: { id: conn.to.component.id },
                point: {...conn.to.point}
            }
        })),
        layers: [...layers],
        currentLayerId: currentLayerId,
        gridSize: gridSize,
        snapToGrid: snapToGrid,
        showGrid: showGrid,
        version: '1.0'
    };
    
    document.getElementById('fileModalTitle').textContent = 'Exportar Proyecto';
    document.getElementById('fileData').value = JSON.stringify(projectData, null, 2);
    document.getElementById('fileModal').classList.add('active');
    document.getElementById('confirmFileModal').onclick = function() {
        const data = document.getElementById('fileData').value;
        try {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `diagrama-electrico-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            updateStatus('Proyecto exportado como archivo JSON.');
            closeFileModal();
        } catch (error) {
            console.error('Error al exportar:', error);
            updateStatus('Error al exportar el proyecto.');
        }
    };
}

function importProject() {
    document.getElementById('fileModalTitle').textContent = 'Importar Proyecto';
    document.getElementById('fileData').value = '';
    document.getElementById('fileModal').classList.add('active');
    document.getElementById('confirmFileModal').onclick = function() {
        try {
            const project = JSON.parse(document.getElementById('fileData').value);
            
            // Validar el formato del proyecto
            if (!project.canvasObjects || !Array.isArray(project.canvasObjects)) {
                throw new Error('Formato de proyecto inválido');
            }
            
            // Reconstruir objetos del canvas
            canvasObjects = project.canvasObjects.map(obj => {
                if (obj.type === 'component') {
                    const compInfo = componentDatabase.find(c => c.id === obj.componentId);
                    if (compInfo) {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.src = compInfo.url;
                        
                        return {
                            ...obj,
                            image: img,
                            connectionPoints: compInfo.connectionPoints ? [...compInfo.connectionPoints] : []
                        };
                    }
                }
                return {...obj};
            });
            
            // Reconstruir conexiones
            connections = project.connections ? project.connections.map(conn => {
                const fromComponent = canvasObjects.find(c => c.id === conn.from.component.id);
                const toComponent = canvasObjects.find(c => c.id === conn.to.component.id);
                
                if (fromComponent && toComponent) {
                    return {
                        ...conn,
                        from: {
                            component: fromComponent,
                            point: {...conn.from.point}
                        },
                        to: {
                            component: toComponent,
                            point: {...conn.to.point}
                        }
                    };
                }
                return null;
            }).filter(conn => conn !== null) : [];
            
            layers = project.layers || [];
            currentLayerId = project.currentLayerId || (layers.length > 0 ? layers[0].id : null);
            gridSize = project.gridSize || DEFAULT_GRID_SIZE;
            snapToGrid = project.snapToGrid !== undefined ? project.snapToGrid : true;
            showGrid = project.showGrid !== undefined ? project.showGrid : true;
            
            // Actualizar controles de la UI
            document.getElementById('gridSize').value = gridSize;
            document.getElementById('snapToGrid').checked = snapToGrid;
            document.getElementById('showGrid').checked = showGrid;
            
            selectedObject = null;
            showNoSelectionMessage();
            redrawCanvas();
            updateLayersList();
            saveState();
            updateStatus('Proyecto importado correctamente.');
            closeFileModal();
        } catch (error) {
            console.error('Error al importar:', error);
            updateStatus('Error al importar el proyecto. Verifica el formato del archivo.');
        }
    };
}






function exportToSVG() {
  const container = document.getElementById('drawingContainer'); // tu área de trabajo
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("xmlns", svgNS);
  svg.setAttribute("width", container.offsetWidth);
  svg.setAttribute("height", container.offsetHeight);

  const elements = container.querySelectorAll('.exportable'); // ajusta esta clase según tu sistema

  elements.forEach(el => {
    const x = el.offsetLeft;
    const y = el.offsetTop;
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    // Rectángulo base
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("fill", "lightgray");
    rect.setAttribute("stroke", "black");
    svg.appendChild(rect);

    // Texto del componente
    const label = el.getAttribute('data-label') || el.innerText || 'Componente';
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x + 5);
    text.setAttribute("y", y + 15);
    text.setAttribute("font-size", "12");
    text.textContent = label;
    svg.appendChild(text);
  });

  // Serializar y descargar
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'diagrama_unifilar.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// Función para dibujar todo excepto las imágenes
function drawCanvasWithoutImages(ctx) {
    // No dibujamos la cuadrícula en la exportación
    
    // Dibujar las conexiones directamente
    // Dibujamos todas las líneas y conexiones
    canvasObjects.forEach(obj => {
        if (obj.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(obj.x1, obj.y1);
            ctx.lineTo(obj.x2, obj.y2);
            ctx.strokeStyle = obj.color || '#5f5d5dff';
            ctx.lineWidth = obj.width || 1;
            ctx.stroke();
        }
    });
    
    // Dibujar los textos y elementos que no son imágenes
    canvasObjects.forEach(obj => {
        if (obj.type !== 'component') {
            // Dibujar objetos que no son componentes directamente
            if (obj.type === 'text') {
                ctx.font = obj.font || '14px Arial';
                ctx.fillStyle = obj.color || '#000000';
                ctx.textAlign = obj.textAlign || 'left';
                ctx.fillText(obj.text, obj.x, obj.y);
            } else if (obj.type === 'ellipse') {
                ctx.beginPath();
                ctx.ellipse(obj.x, obj.y, obj.radiusX, obj.radiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = obj.fillColor || 'transparent';
                ctx.fill();
                ctx.strokeStyle = obj.strokeColor || '#000000';
                ctx.lineWidth = obj.lineWidth || 1;
                ctx.stroke();
            }
        } else {
            // Para componentes, dibujar solo los textos y bordes, no la imagen
            // Guardar el contexto actual
            ctx.save();
            
            // Dibujar un rectángulo blanco donde iría la imagen
            ctx.fillStyle = 'white';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            
            // Dibujar borde del componente
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            
            // Configurar el estilo de texto
            ctx.fillStyle = obj.textColor || '#000000';
            ctx.font = obj.textFont || '10px Arial';
            ctx.textAlign = 'center';
            
            // Dibujar los textos del componente
            if (obj.fatherText) {
                ctx.fillText(obj.fatherText, obj.x + obj.width / 2, obj.y - 5);
            }
            
            if (obj.text1) {
                ctx.fillText(obj.text1, obj.x + obj.width / 2, obj.y + 15);
            }
            
            if (obj.text2) {
                ctx.fillText(obj.text2, obj.x + obj.width / 2, obj.y + 30);
            }
            
            // Restaurar el contexto
            ctx.restore();
        }
    });
}

// Función para dibujar solo los textos de un componente
function drawComponentTexts(component, ctx) {
    // Guardar el contexto actual
    ctx.save();
    
    // Dibujar un rectángulo blanco donde iría la imagen
    ctx.fillStyle = 'white';
    ctx.fillRect(component.x, component.y, component.width, component.height);
    
    // Dibujar borde del componente
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(component.x, component.y, component.width, component.height);
    
    // Configurar el estilo de texto
    ctx.fillStyle = component.textColor || '#000000';
    ctx.font = component.textFont || '10px Arial';
    ctx.textAlign = 'center';
    
    // Dibujar los textos del componente
    if (component.fatherText) {
        ctx.fillText(component.fatherText, component.x + component.width / 2, component.y - 5);
    }
    
    if (component.text1) {
        ctx.fillText(component.text1, component.x + component.width / 2, component.y + 15);
    }
    
    if (component.text2) {
        ctx.fillText(component.text2, component.x + component.width / 2, component.y + 30);
    }
    
    if (component.text3) {
        ctx.fillText(component.text3, component.x + component.width / 2, component.y + 45);
    }
    
    if (component.text4) {
        ctx.fillText(component.text4, component.x + component.width / 2, component.y + 60);
    }
    
    if (component.text5) {
        ctx.fillText(component.text5, component.x + component.width / 2, component.y + 75);
    }
    
    if (component.text6) {
        ctx.fillText(component.text6, component.x + component.width / 2, component.y + 90);
    }
    
    // Textos verticales
    ctx.save();
    ctx.translate(component.x - 10, component.y + component.height / 2);
    ctx.rotate(-Math.PI / 2);
    if (component.vertText1) {
        ctx.fillText(component.vertText1, 0, 0);
    }
    ctx.restore();
    
    ctx.save();
    ctx.translate(component.x + component.width + 10, component.y + component.height / 2);
    ctx.rotate(-Math.PI / 2);
    if (component.vertText2) {
        ctx.fillText(component.vertText2, 0, 0);
    }
    ctx.restore();
    
    // Texto de pie
    if (component.footerText) {
        ctx.fillText(component.footerText, component.x + component.width / 2, component.y + component.height + 15);
    }
    
    if (component.footerText2) {
        ctx.fillText(component.footerText2, component.x + component.width / 2, component.y + component.height + 30);
    }
    
    // Restaurar el contexto
    ctx.restore();
}

// Función para dibujar las imágenes manualmente
function drawImagesManually(ctx) {
    canvasObjects.forEach(obj => {
        if (obj.type === 'component' && obj.image) {
            try {
                ctx.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height);
            } catch (e) {
                console.error('Error al dibujar imagen:', e);
                // Si falla, dibujar un rectángulo como respaldo
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                ctx.strokeStyle = '#000000';
                ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            }
        }
    });
}

function saveAsImage() {
    // Verificar si hay objetos en el canvas
    if (canvasObjects.length === 0 && connections.length === 0) {
        showModal('Advertencia', 'No hay componentes en el lienzo para exportar.');
        return;
    }

    try {
        // Crear un canvas temporal para asegurar que todo se renderice correctamente
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Rellenar con fondo blanco
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Dibujar el contenido sin imágenes primero
        drawCanvasWithoutImages(tempCtx);
        
        // Dibujar las imágenes manualmente
        drawImagesManually(tempCtx);
        
        // Exportar el canvas como WebP (mejor calidad y menor tamaño)
        const link = document.createElement('a');
        link.download = 'diagrama-electrico-' + new Date().toISOString().slice(0,10) + '.webp';
        
        // Usar blob con formato WebP para mejor calidad y menor tamaño
        tempCanvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            updateStatus('Diagrama exportado como imagen WebP.');
        }, 'image/webp', 0.9);
    } catch (error) {
        console.error('Error al exportar diagrama:', error);
        updateStatus('Error al exportar el diagrama.');
    }
}

function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    
}
function closeModal() {
    document.getElementById('confirmModal').classList.remove('active');
    modalCallback = null;
}

function updateStatus(message) {
    document.getElementById('statusMessage').textContent = message;
}
function cerrarModal() {
    if (modal) {
        modal.classList.remove("show");
        console.log("Modal cerrado");
        
        // Si hay un componente pendiente al cancelar, limpiarlo
        if (pendingComponentObj) {
            pendingComponentObj = null;
            selectedObject = null;
            currentTool = 'select';
            setTool('select');
            updateStatus('Colocación cancelada.');
        }
    }
}

// Helper: attach listeners para recalcular potencia automáticamente
function attachBreakerPotenciaListeners() {
    const intensityEl = document.getElementById('breakerIntensity');
    const polarityEl = document.getElementById('breakerPolarity');
    const outSpan = document.getElementById('potenciaSoportada');
    if (!outSpan) return;

    const handler = () => {
        try { calcularPotenciaMagnetotermico(); }
        catch (err) { console.error('calcularPotenciaMagnetotermico error:', err); }
    };

    if (intensityEl) {
        intensityEl.addEventListener('change', handler);
        intensityEl.addEventListener('input', handler);
    }
    if (polarityEl) {
        polarityEl.addEventListener('change', handler);
    }

    // recalculo inicial
    handler();

    // cuando se abra el modal (por si el elemento se crea dinámicamente)
    if (window.MutationObserver && propertiesModal) {
        const mo = new MutationObserver(() => {
            if (propertiesModal.classList.contains('active')) handler();
        });
        mo.observe(propertiesModal, { attributes: true, attributeFilter: ['class'] });
    }
}


function saveDiagramAsJSON() {
  const container = document.getElementById('drawingContainer');
  const elements = container.querySelectorAll('.exportable');

  const components = [];
  const connections = [];

  elements.forEach((el, index) => {
    const id = el.id || `comp${index}`;
    el.id = id; // asigna si no tiene

    components.push({
      id,
      type: el.getAttribute('data-type') || 'unknown',
      label: el.getAttribute('data-label') || el.innerText || 'Componente',
      x: el.offsetLeft,
      y: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight
    });
  });

  // Recorre las líneas de conexión
  const lines = container.querySelectorAll('.connection'); // ajusta la clase si usas otra
  lines.forEach(line => {
    const from = line.getAttribute('data-from');
    const to = line.getAttribute('data-to');
    if (from && to) {
      connections.push({ from, to, type: 'line' });
    }
  });

  const json = JSON.stringify({ components, connections }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'diagrama_completo.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}






// Función de exportación eliminada y reemplazada por saveAsImage



function clearCanvasConfirm() {
    showModal('Confirmar limpieza', '¿Estás seguro de que quieres limpiar todo el lienzo? Esta acción no se puede deshacer.', () => {
        canvasObjects = [];
        connections = [];
        selectedObject = null;
        showNoSelectionMessage();
        saveState();
        redrawCanvas();
        updateStatus('Lienzo limpiado.');
    });
}

// Modales
let modalCallback = null;

function showModal(title, message, callback) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    modalCallback = callback;
    document.getElementById('confirmModal').classList.add('active');
}



function confirmModalAction() {
    if (modalCallback) {
        modalCallback();
    }
    closeModal();
}

function closeFileModal() {
    document.getElementById('fileModal').classList.remove('active');
}

function confirmFileModalAction() {
    // La acción se define cuando se abre el modal (export/import)
}

// Utilidades
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}



// Manejo de atajos de teclado
function handleKeyboardShortcuts(e) {
    // Ignorar atajos si el foco está en un input, textarea o select
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
    }

  // ESC para cancelar colocación de componente
    if (e.key === 'Escape' && currentTool === 'dragNewComponent' && pendingComponent) {
        cancelComponentPlacement();
        e.preventDefault();
        return;
    }

    

    // Ctrl+Z para deshacer
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoLastAction();
    }
    // Ctrl+Y para rehacer
    else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redoLastAction();
    }
    // Teclas para cambiar herramientas
    else if (e.key === 'd' || e.key === 'D') {
        setTool('draw');
    }
    else if (e.key === 'm' || e.key === 'M') {
        setTool('move');
    }
    else if (e.key === 'e' || e.key === 'E') {
        setTool('ellipse');
    }
    else if (e.key === 's' || e.key === 'S') {
        setTool('select');
    }
    else if (e.key === 'c' || e.key === 'C') {
        setTool('connect');
    }
}
const campos = [
  "breakerIntensity",
  "breakerPolarity",
  "potencia",
  "length",
  "usarSeccionMinima",
  "breakerCurve",
  "breakerCuttingPower"
];

campos.forEach(id => {
  const elemento = document.getElementById(id);
  if (elemento) {
    const tipoEvento = elemento.type === "checkbox" ? "change" : "input";
    elemento.addEventListener(tipoEvento, calcularBreakerAuto);
  }
});


// Renderiza la lista de objetos en el panel izquierdo
function renderObjectsList() {
    const panel = document.getElementById('objectsListPanel');
    if (!panel) return;
    panel.innerHTML = ''; // Limpiar lista

    canvasObjects.forEach((obj, idx) => {
        if (obj.type !== 'component') return;
        const compInfo = componentDatabase.find(c => c.id === obj.componentId);
        const item = document.createElement('div');
        item.className = 'object-list-item' + (obj === selectedObject ? ' selected' : '');
        item.innerHTML = `
            <span style="cursor:pointer;">${idx + 1}.${compInfo ? compInfo.name : obj.componentId}</span>
            <button class="edit-btn" title="Editar">&#9998;</button>
            <button class="delete-btn" title="Eliminar">&#128465;</button>
        `;
        // Seleccionar para editar
        item.querySelector('.edit-btn').onclick = () => {
            selectedObject = obj;
            showPropertiesPanel(obj);
            redrawCanvas();
            renderObjectsList();
        };
        // Eliminar
        item.querySelector('.delete-btn').onclick = () => {
            selectedObject = obj;
            deleteSelectedObject();
            renderObjectsList();
        };
        // Selección al hacer clic en el nombre
        item.querySelector('span').onclick = () => {
            selectedObject = obj;
            showPropertiesPanel(obj);
            redrawCanvas();
            renderObjectsList();
        };
        panel.appendChild(item);
    });
}

// Llama a renderObjectsList cada vez que se modifica canvasObjects
function updateObjectsListAndRedraw() {
    redrawCanvas();
    renderObjectsList();
}


const originalDeleteSelectedObject = deleteSelectedObject;
deleteSelectedObject = function(...args) {
    originalDeleteSelectedObject.apply(this, args);
    renderObjectsList();
};








document.addEventListener('DOMContentLoaded', function() {
    init();
    renderObjectsList();
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileModal = document.getElementById('fileModalMenu');
    const fileModalClose = document.querySelector('.file-modal-close');
    const fileModalCloseBtn = document.getElementById('fileModalCloseBtn');
    
     if (!fileMenuBtn || !fileModal) return;
    
    // Abrir modal
    fileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        fileModal.classList.add('active');
    });
    
    // Cerrar modal - múltiples formas
    function closeFileModal() {
        fileModal.classList.remove('active');
    }
    
    // Cerrar con botón X
    if (fileModalClose) {
        fileModalClose.addEventListener('click', closeFileModal);
    }
    
    // Cerrar con botón "Cerrar"
    if (fileModalCloseBtn) {
        fileModalCloseBtn.addEventListener('click', closeFileModal);
    }
    
    // Cerrar haciendo click fuera del modal
    fileModal.addEventListener('click', function(e) {
        if (e.target === fileModal) {
            closeFileModal();
        }
    });
    
    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && fileModal.classList.contains('active')) {
            closeFileModal();
        }
    });
    
    // Prevenir que los clicks dentro del modal lo cierren
    document.querySelector('.file-modal-content').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // --- Listener explícito y seguro para botón "Memoria PDF" ---
    (function attachSingleMemoriaListener() {
    const btn = document.getElementById('btnMemoria');
    if (!btn) {
        console.warn('attachSingleMemoriaListener: btnMemoria no encontrado');
        return;
    }

    // Reemplaza el botón por un clon para eliminar listeners previos
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', async function (ev) {
        ev.stopPropagation();
        console.log('📄 btnMemoria click único');

        // Comprobaciones rápidas
        console.log('➡️ window.exportarMemoriaTecnicaPDF tipo:', typeof window.exportarMemoriaTecnicaPDF);
        if (typeof window.exportarMemoriaTecnicaPDF !== 'function') {
            console.error('❌ exportarMemoriaTecnicaPDF no está definida. Comprueba que script/exportar_memoria_pdf.js se cargue antes de app.js.');
            alert('Función "Memoria PDF" no disponible. Revisa la consola (F12).');
            return;
        }

        try {
            const maybePromise = window.exportarMemoriaTecnicaPDF();
            if (maybePromise && typeof maybePromise.then === 'function') {
                await maybePromise;
            }
            console.log('✅ exportarMemoriaTecnicaPDF ejecutada correctamente');
        } catch (err) {
            console.error('Error al ejecutar exportarMemoriaTecnicaPDF:', err);
            alert('Error al generar PDF. Revisa la consola (F12).');
        }
    }, { passive: true });
})();
});

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                console.log('✅ Service Worker registrado:', reg.scope);

                // Si ya hay un SW esperando, avisar al usuario
                if (reg.waiting) {
                    notifyUpdateReady(reg);
                }

                // Cuando aparece un nuevo SW en proceso de instalación
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Nuevo contenido listo para ser activado
                                notifyUpdateReady(reg);
                            }
                        });
                    }
                });

            }).catch(err => console.error('❌ Error al registrar SW:', err));

        // Cuando el nuevo SW toma control, recargar para usar la nueva versión
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            console.log('🔁 Service worker activado: recargando para aplicar actualización');
            window.location.reload();
        });
  });
}

// Muestra una barra flotante para notificar que hay una actualización disponible
function notifyUpdateReady(registration) {
    try {
        // Evitar crear múltiples banners
        if (document.getElementById('updateBanner')) return;

        const banner = document.createElement('div');
        banner.id = 'updateBanner';
        banner.style.cssText = `position:fixed;left:16px;right:16px;bottom:24px;z-index:10000;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:12px 14px;background:#fff;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.12);font-family:Arial,Helvetica,sans-serif`;

        const text = document.createElement('div');
        text.style.cssText = 'color:#222;font-size:14px;flex:1;margin-right:12px';
        text.textContent = 'Hay una nueva versión de la aplicación disponible.';

        const actions = document.createElement('div');

        const laterBtn = document.createElement('button');
        laterBtn.textContent = 'Más tarde';
        laterBtn.style.cssText = 'margin-right:8px;padding:8px 10px;background:#f1f1f1;border:none;border-radius:6px;cursor:pointer';
        laterBtn.onclick = () => { banner.remove(); };

        const updateBtn = document.createElement('button');
        updateBtn.textContent = 'Actualizar';
        updateBtn.style.cssText = 'padding:8px 12px;background:#0d47a1;color:#fff;border:none;border-radius:6px;cursor:pointer';
        updateBtn.onclick = async () => {
            // Comunicar al SW que haga skipWaiting
            const waitingWorker = registration.waiting;
            if (!waitingWorker) {
                console.warn('No hay worker esperando');
                banner.remove();
                return;
            }
            // Enviar mensaje para forzar activación
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            // Opcional: mostrar feedback mientras se activa
            updateBtn.disabled = true;
            updateBtn.textContent = 'Actualizando...';
        };

        actions.appendChild(laterBtn);
        actions.appendChild(updateBtn);

        banner.appendChild(text);
        banner.appendChild(actions);

        document.body.appendChild(banner);
    } catch (err) {
        console.error('Error mostrando notificación de actualización:', err);
    }
}

// Detectar cuando se puede instalar
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
    // Mostrar botón flotante de instalación (si no existe ya)
    if (!document.getElementById('btnInstall')) {
        const btn = document.createElement('button');
        btn.id = 'btnInstall';
        btn.setAttribute('aria-label', 'Instalar EsquemaPro');
        btn.textContent = 'Instalar App';
        // Dejar estilos a CSS (inline usados solo como fallback)
        btn.style.cssText = `z-index:99999`; 
        document.body.appendChild(btn);

        btn.onclick = () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(choice => {
                if (choice.outcome === 'accepted') {
                    console.log('👍 Usuario aceptó instalar');
                } else {
                    console.log('👎 Usuario rechazó instalar');
                }
                deferredPrompt = null;
                btn.remove();
            });
        };
    }
  btn.onclick = () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        console.log('👍 Usuario aceptó instalar');
      } else {
        console.log('👎 Usuario rechazó instalar');
      }
      deferredPrompt = null;
      btn.remove();
    });
  };
});


