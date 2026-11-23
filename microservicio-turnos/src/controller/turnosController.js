import { randomUUID } from 'node:crypto';
import { listarTurnosConfirmados, insertarTurno, cancelarTurno, esViolacion } from '../db/TurnosRepositorio.js';



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

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGEX_DNI = /^\d{7,8}$/; // 


const limpiar = (texto) => String(texto ?? '').trim().replace(/\s+/g, ' ');


const validarSolicitud = ({ dni, nombre, apellido, fecha, hora }) => {
    if (!REGEX_DNI.test(dni)) return "El DNI debe tener 7 u 8 números, sin puntos.";
    if (!nombre || nombre.length > 60) return "Ingrese el nombre del paciente (máximo 60 caracteres).";
    if (!apellido || apellido.length > 60) return "Ingrese el apellido del paciente (máximo 60 caracteres).";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(new Date(fecha).getTime())) {
        return "La fecha no tiene un formato válido.";
    }
    if (fecha < fechaHoy()) return "La fecha no puede ser anterior a hoy.";
    if (!HORARIOS_VALIDOS.includes(hora)) return "El horario elegido no es un horario de atención válido.";
    if (fecha === fechaHoy() && hora <= horaAhora()) return "Ese horario ya pasó. Elija uno posterior.";
    return null;
};








export const getTurnos = async (req, res) => {
    try {
        res.json(await listarTurnosConfirmados());
    } catch (error) {
        console.error('[BD] Error al listar turnos:', error.message);
        res.status(503).json({ mensaje: "No se pudo consultar la base de datos. Intente nuevamente." });
    }
};






export const crearTurno = async (req, res) => {
    const cuerpo = req.body ?? {};
    const datos = {
        dni: String(cuerpo.dni ?? '').trim(),
        nombre: limpiar(cuerpo.nombre),
        apellido: limpiar(cuerpo.apellido),
        fecha: String(cuerpo.fecha ?? '').trim(),
        hora: String(cuerpo.hora ?? '').trim()
    };

    const error = validarSolicitud(datos);
    if (error) {
        return res.status(400).json({ mensaje: error });
    }




    const turnoId = REGEX_UUID.test(cuerpo.id ?? '') ? cuerpo.id.toLowerCase() : randomUUID();
    const turno = { id: turnoId, paciente: `${datos.apellido}, ${datos.nombre}`, fecha: datos.fecha, hora: datos.hora };

    try {
        const creado = await insertarTurno({ turnoId, ...datos });
        if (!creado) {
            return res.status(200).json({ mensaje: "Ese turno ya estaba registrado.", turno });
        }
        console.log(`[🎉 ÉXITO] Turno confirmado: ${turno.paciente} el ${turno.fecha} a las ${turno.hora}`);
        return res.status(201).json({ mensaje: "Turno confirmado.", turno });
    } catch (err) {
        if (esViolacion(err, 'UX_Turnos_Fecha_Hora')) {
            console.log(`[❌ RECHAZADO] Horario ocupado: ${turno.fecha} ${turno.hora}`);
            return res.status(409).json({ mensaje: "Ese horario ya fue reservado. Elija otro." });
        }
        console.error('[BD] Error al guardar el turno:', err.message);
        return res.status(503).json({ mensaje: "No se pudo guardar el turno. Intente nuevamente." });
    }
};





export const eliminarTurno = async (req, res) => {
    const { id } = req.params;
    if (!REGEX_UUID.test(id)) {
        return res.status(400).json({ mensaje: "Identificador de turno inválido." });
    }

    try {
        const cancelado = await cancelarTurno(id);
        if (!cancelado) {
            return res.status(404).json({ mensaje: "El turno no existe o ya estaba cancelado." });
        }
        console.log(`[🗑️ CANCELADO] Turno ${id}`);
        return res.json({ mensaje: "Turno cancelado." });
    } catch (error) {
        console.error('[BD] Error al cancelar el turno:', error.message);
        return res.status(503).json({ mensaje: "No se pudo cancelar el turno. Intente nuevamente." });
    }
};