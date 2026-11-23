import { randomUUID } from 'node:crypto';
import { obtenerPool, cerrarPool } from './conexion.js';
import { insertarTurno, listarTurnosConfirmados, cancelarTurno, esViolacion } from './TurnosRepositorio.js';

const FECHA = '2030-03-15';
const HORA = '10:00';
const paciente = { dni: '20000099', nombre: 'Prueba', apellido: 'Script' };

const verificar = (condicion, texto) => {
    console.log(`${condicion ? 'OK    ' : 'FALLÓ '} ${texto}`);
    if (!condicion) process.exitCode = 1;
};

const idA = randomUUID();

try {
    verificar(await insertarTurno({ turnoId: idA, ...paciente, fecha: FECHA, hora: HORA }) === true,
        '1. Se guarda un turno nuevo');

    verificar(await insertarTurno({ turnoId: idA, ...paciente, fecha: FECHA, hora: HORA }) === false,
        '2. Repetir el mismo pedido no duplica el turno');

    let rechazado = false;
    try {
        await insertarTurno({ turnoId: randomUUID(), dni: '20000001', nombre: 'María', apellido: 'Gómez', fecha: FECHA, hora: HORA });
    } catch (error) {
        rechazado = esViolacion(error, 'UX_Turnos_Fecha_Hora');
        if (!rechazado) console.error('   Error distinto del esperado:', error.message);
    }
    verificar(rechazado, '3. La base rechaza otro turno en el mismo horario');

    const lista = await listarTurnosConfirmados();
    const mio = lista.find((t) => t.id === idA);
    verificar(Boolean(mio), '4. El turno aparece en la lista');
    console.log('      Así lo ve el frontend:', mio);

    verificar(await cancelarTurno(idA) === true, '5. Se cancela el turno');
    verificar(await cancelarTurno(idA) === false, '6. Cancelar dos veces no hace nada');

    verificar(await insertarTurno({ turnoId: randomUUID(), ...paciente, fecha: FECHA, hora: HORA }) === true,
        '7. Después de cancelar, el horario queda libre otra vez');
} catch (error) {
    console.error('Error inesperado:', error.message);
    process.exitCode = 1;
} finally {
    
    try {
        const pool = await obtenerPool();
        await pool.request().query(
            `DELETE FROM dbo.Turnos WHERE Fecha = '${FECHA}'; DELETE FROM dbo.Pacientes WHERE Dni = '${paciente.dni}';`
        );
        console.log('Limpieza: datos de prueba borrados.');
    } catch (error) {
        console.error('No se pudo limpiar:', error.message);
    }
    await cerrarPool();
}