const URL_API = 'http://localhost:8000/api/turnos'; 





const HORARIOS = {
    'Mañana': ['08:00', '08:30', '09:00', '09:30', '10:00'],
    'Tarde':  ['15:00', '15:30', '16:00', '16:30', '17:00']
};
const TODOS_LOS_HORARIOS = Object.values(HORARIOS).flat();

const lista = document.getElementById('lista-turnos');
const form = document.getElementById('form-turno');
const mensaje = document.getElementById('mensaje');
const inputFecha = document.getElementById('fecha');
const selectHora = document.getElementById('hora');
const disponibilidad = document.getElementById('disponibilidad');

let turnosActuales = []; 



const dosDigitos = (n) => String(n).padStart(2, '0');

function fechaHoy() {
    const d = new Date();
    return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

function horaAhora() {
    const d = new Date();
    return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.className = esError ? 'error' : '';
}





function actualizarHorarios() {
    const fecha = inputFecha.value;
    const horaElegida = selectHora.value; 
    selectHora.innerHTML = '';
    disponibilidad.textContent = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    selectHora.appendChild(placeholder);

    if (!fecha) {
        placeholder.textContent = 'Primero elija una fecha';
        selectHora.disabled = true;
        return;
    }
    if (fecha < fechaHoy()) {
        placeholder.textContent = 'Fecha no válida';
        selectHora.disabled = true;
        disponibilidad.textContent = 'No se pueden solicitar turnos en fechas anteriores a hoy.';
        return;
    }

    placeholder.textContent = 'Seleccione un horario';
    selectHora.disabled = false;

    const ocupados = new Set(turnosActuales.filter(t => t.fecha === fecha).map(t => t.hora));
    const esHoy = fecha === fechaHoy();
    const resumen = [];

    for (const [franja, horas] of Object.entries(HORARIOS)) {
        const grupo = document.createElement('optgroup');
        grupo.label = franja;
        let libres = 0;

        for (const hora of horas) {
            const ocupado = ocupados.has(hora);
            const pasado = esHoy && hora <= horaAhora();

            const opcion = document.createElement('option');
            opcion.value = hora;
            opcion.textContent = ocupado ? `${hora} · Ocupado` : pasado ? `${hora} · No disponible` : hora;
            opcion.disabled = ocupado || pasado;
            if (!opcion.disabled) libres++;
            grupo.appendChild(opcion);
        }

        selectHora.appendChild(grupo);
        resumen.push(`${franja}: ${libres} de ${horas.length} disponibles`);
    }

    disponibilidad.textContent = resumen.join(' · ');


    const sigueLibre = [...selectHora.options].some(o => o.value === horaElegida && !o.disabled);
    if (sigueLibre) selectHora.value = horaElegida;
}




function crearFila(turno) {
    const li = document.createElement('li');

    const info = document.createElement('div');
    const nombre = document.createElement('div');
    nombre.className = 'paciente';
    nombre.textContent = turno.paciente;
    const detalle = document.createElement('div');
    detalle.className = 'detalle';
    detalle.textContent = `${turno.fecha} · ${turno.hora} hs`;
    info.append(nombre, detalle);

    const acciones = document.createElement('div');
    acciones.className = 'acciones';

    const estado = document.createElement('span');
    estado.className = 'estado';
    estado.textContent = 'Confirmado';

    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.className = 'eliminar';
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.addEventListener('click', () => eliminarTurno(turno));

    acciones.append(estado, btnEliminar);
    li.append(info, acciones);
    return li;
}




async function cargarTurnos() {
    try {
        const res = await fetch(URL_API);
        const turnos = await res.json();
        if (!res.ok) throw new Error(turnos.mensaje || 'Error al obtener los turnos');

        turnosActuales = turnos;
        actualizarHorarios(); 

        lista.innerHTML = '';

        if (turnos.length === 0) {
            const vacio = document.createElement('li');
            vacio.className = 'vacio';
            vacio.textContent = 'No hay turnos confirmados.';
            lista.appendChild(vacio);
            return;
        }

        turnos.forEach(turno => lista.appendChild(crearFila(turno)));
    } catch (error) {
        console.error("Error al cargar los turnos:", error);
        mostrarMensaje(error.message || 'No se pudo conectar con el servidor.', true);
    }
}




async function eliminarTurno(turno) {
    if (!confirm(`¿Eliminar el turno de ${turno.paciente}?`)) return;

    try {
        const res = await fetch(`${URL_API}/${encodeURIComponent(turno.id)}`, { method: 'DELETE' });
        const resultado = await res.json();
        mostrarMensaje(resultado.mensaje, !res.ok);
        if (res.ok) cargarTurnos();
    } catch (error) {
        mostrarMensaje('Error al conectar con el servidor.', true);
    }
}




function validarSolicitud(paciente, fecha, hora) {
    if (!paciente) return 'Ingrese el nombre del paciente.';
    if (!fecha) return 'Elija una fecha.';
    if (fecha < fechaHoy()) return 'La fecha no puede ser anterior a hoy.';
    if (!TODOS_LOS_HORARIOS.includes(hora)) return 'Elija uno de los horarios disponibles.';
    if (fecha === fechaHoy() && hora <= horaAhora()) return 'Ese horario ya pasó. Elija uno posterior.';
    return null;
}



form.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const paciente = document.getElementById('paciente').value.trim();
    const fecha = inputFecha.value;
    const hora = selectHora.value;

    const error = validarSolicitud(paciente, fecha, hora);
    if (error) {
        mostrarMensaje(error, true);
        return;
    }

    try {
        const res = await fetch(URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paciente, fecha, hora })
        });

        const resultado = await res.json();
        mostrarMensaje(resultado.mensaje, !res.ok);

        if (res.ok) {
            form.reset();
            inputFecha.min = fechaHoy();
            actualizarHorarios();
            setTimeout(cargarTurnos, 2500);
            setTimeout(cargarTurnos, 6000);
        }
    } catch (error) {
        mostrarMensaje('Error al conectar con el servidor.', true);
    }
});



inputFecha.addEventListener('change', () => {
    mostrarMensaje('');
    actualizarHorarios();
    cargarTurnos(); 
});

document.getElementById('btn-actualizar').addEventListener('click', cargarTurnos);


inputFecha.min = fechaHoy();
actualizarHorarios();
cargarTurnos();
