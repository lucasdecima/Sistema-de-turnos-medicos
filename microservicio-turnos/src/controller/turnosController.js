
const baseDatosTurnos = [
    { id: 1, paciente: "Paciente de Prueba", fecha: "2026-06-30", hora: "16:00", estado: "confirmado" }
];


const colaEventos = [];
let procesando = false;


const procesarSiguienteEvento = async () => {
   
    if (colaEventos.length === 0) {
        procesando = false;
        return;
    }

    procesando = true;
    const evento = colaEventos.shift(); 
    
    console.log(`[Worker] Procesando asíncronamente el turno para: ${evento.datos.paciente}`);

    
    await new Promise(resolve => setTimeout(resolve, 2000));

    
    const existe = baseDatosTurnos.find(t => t.fecha === evento.datos.fecha && t.hora === evento.datos.hora);

    if (!existe) {
        baseDatosTurnos.push({
            id: baseDatosTurnos.length + 1,
            ...evento.datos,
            estado: "confirmado"
        });
        console.log(`[🎉 ÉXITO] Turno confirmado y guardado para: ${evento.datos.paciente}`);
    } else {
        console.log(`[❌ RECHAZADO] Conflicto de horario para: ${evento.datos.paciente}`);
    }

    
    procesarSiguienteEvento();
};




export const getTurnos = (req, res) => {
    res.json(baseDatosTurnos);
};


export const crearTurno = (req, res) => {
    const { paciente, fecha, hora } = req.body;

    if (!paciente || !fecha || !hora) {
        return res.status(400).json({ mensaje: "Faltan datos obligatorios (paciente, fecha u hora)." });
    }

    
    const nuevoEvento = {
        tipo: 'TurnoSolicitado',
        datos: { paciente, fecha, hora },
        fechaRegistro: new Date()
    };

    
    colaEventos.push(nuevoEvento);
    console.log(`[Event Broker] Evento 'TurnoSolicitado' recibido. Fila actual: ${colaEventos.length}`);

    
    if (!procesando) {
        procesarSiguienteEvento();
    }

    
    res.status(202).json({ 
        mensaje: "Tu solicitud ha entrado a la fila de procesamiento de la clínica. Verifica el estado en unos instantes." 
    });
};