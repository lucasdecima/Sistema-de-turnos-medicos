import { randomUUID } from 'node:crypto';





const PEER_URL = process.env.PEER_URL;

const LIMITE_COLA = Number(process.env.LIMITE_COLA) || 5;


const turnos = new Map();


const eliminados = new Set();



turnos.set('semilla-1', {
    id: 'semilla-1',
    paciente: "Paciente de Prueba (Profesor)",
    fecha: "2026-06-30",
    hora: "16:00",
    estado: "confirmado",
    creado: "2000-01-01T00:00:00.000Z"
});



const HORARIOS_VALIDOS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', 
    '15:00', '15:30', '16:00', '16:30', '17:00'  
];

const dosDigitos = (n) => String(n).padStart(2, '0');
const fechaHoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
};
const horaAhora = () => {
    const d = new Date();
    return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
};



const validarFechaYHora = (fecha, hora) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(new Date(fecha).getTime())) {
        return "La fecha no tiene un formato válido.";
    }
    if (fecha < fechaHoy()) return "La fecha no puede ser anterior a hoy.";
    if (!HORARIOS_VALIDOS.includes(hora)) return "El horario elegido no es un horario de atención válido.";
    if (fecha === fechaHoy() && hora <= horaAhora()) return "Ese horario ya pasó. Elija uno posterior.";
    return null;
};


const colaEventos = [];
let procesando = false;


const esMasAntiguo = (a, b) => a.creado < b.creado || (a.creado === b.creado && a.id < b.id);


const fusionar = (turnosEntrantes = [], eliminadosEntrantes = []) => {
    
    for (const id of eliminadosEntrantes) {
        eliminados.add(id);
        turnos.delete(id);
    }

    
    for (const t of turnosEntrantes) {
        if (eliminados.has(t.id) || turnos.has(t.id)) continue; 

        const choque = [...turnos.values()].find(x => x.fecha === t.fecha && x.hora === t.hora);
        if (!choque) {
            turnos.set(t.id, t);
        } else if (esMasAntiguo(t, choque)) {
            
            turnos.delete(choque.id);
            eliminados.add(choque.id);
            turnos.set(t.id, t);
        } else {
            eliminados.add(t.id);
        }
    }
};


const llamarAlPeer = async (ruta, opciones = {}) => {
    if (!PEER_URL) return null;
    try {
        const res = await fetch(PEER_URL + ruta, { ...opciones, signal: AbortSignal.timeout(2000) });
        return res.ok ? await res.json().catch(() => ({})) : null;
    } catch {
        console.log(`[Réplica] No se pudo contactar a ${PEER_URL} (se sincronizará más tarde).`);
        return null;
    }
};

const sincronizarConPeer = async () => {
    const estado = await llamarAlPeer('/api/interno/estado');
    if (estado) fusionar(estado.turnos, estado.eliminados);
};




export const iniciarSincronizacion = () => {
    if (!PEER_URL) return;
    sincronizarConPeer();
    setInterval(sincronizarConPeer, 5000);
};



const procesarSiguienteEvento = async () => {
    if (colaEventos.length === 0) {
        procesando = false;
        return;
    }

    procesando = true;
    const evento = colaEventos.shift();
    const { id, paciente, fecha, hora } = evento.datos;

    console.log(`[Worker] Procesando asíncronamente el turno para: ${paciente}`);

    try {
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        const yaProcesado = turnos.has(id) || eliminados.has(id); 
        const horarioOcupado = [...turnos.values()].some(t => t.fecha === fecha && t.hora === hora);

        if (yaProcesado) {
            console.log(`[♻️ IGNORADO] El turno ${id} ya estaba procesado o fue cancelado.`);
        } else if (horarioOcupado) {
            console.log(`[❌ RECHAZADO] Conflicto de horario para: ${paciente}`);
        } else {
            const turno = { id, paciente, fecha, hora, estado: "confirmado", creado: new Date().toISOString() };
            turnos.set(id, turno);
            console.log(`[🎉 ÉXITO] Turno confirmado y guardado para: ${paciente}`);

            
            llamarAlPeer('/api/interno/replicar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turno })
            });
        }
    } catch (error) {
        
        console.error('[Worker] Error procesando evento:', error);
    }

    procesarSiguienteEvento();
};




export const getTurnos = (req, res) => {
    res.json([...turnos.values()]);
};





export const crearTurno = (req, res) => {
    
    const { id, paciente, fecha, hora } = req.body;

    if (!paciente || !fecha || !hora) {
        return res.status(400).json({ mensaje: "Faltan datos obligatorios (paciente, fecha u hora)." });
    }

    const errorFechaHora = validarFechaYHora(fecha, hora);
    if (errorFechaHora) {
        return res.status(400).json({ mensaje: errorFechaHora });
    }

    
    if (colaEventos.length >= LIMITE_COLA) {
        console.log(`[⚠️ SATURADO] Fila llena (${colaEventos.length}). Rechazo la petición.`);
        return res.status(503).json({ mensaje: "Nodo saturado, intente nuevamente." });
    }

    colaEventos.push({
        tipo: 'TurnoSolicitado',
        datos: { id: id || randomUUID(), paciente, fecha, hora },
        fechaRegistro: new Date()
    });
    console.log(`[Event Broker] Evento 'TurnoSolicitado' recibido. Fila actual: ${colaEventos.length}`);

    if (!procesando) {
        procesarSiguienteEvento();
    }

    
    
    res.status(202).json({
        mensaje: "Tu solicitud ha entrado a la fila de procesamiento de la clínica. Verifica el estado en unos instantes."
    });
};



export const eliminarTurno = (req, res) => {
    const { id } = req.params;
    const existia = turnos.delete(id);
    eliminados.add(id); 
    console.log(`[🗑️ ELIMINADO] Turno ${id} (${existia ? 'existía en este nodo' : 'no estaba en este nodo'})`);
    res.json({ mensaje: "Turno eliminado.", existia });
};



export const estadoInterno = (req, res) => {
    res.json({ turnos: [...turnos.values()], eliminados: [...eliminados] });
};

export const replicarInterno = (req, res) => {
    const { turno } = req.body;
    if (!turno || !turno.id) return res.status(400).json({ mensaje: "Falta el turno a replicar." });
    fusionar([turno]);
    res.json({ ok: true });
};
