import { obtenerPool, cerrarPool } from './conexion.js';

try {
    const pool = await obtenerPool();

    const identidad = await pool.request().query('SELECT DB_NAME() AS base, USER_NAME() AS usuario');
    console.log('Conectado a:', identidad.recordset[0]);

    const pacientes = await pool.request().query('SELECT COUNT(*) AS cantidad FROM dbo.Pacientes');
    console.log('Pacientes en la base:', pacientes.recordset[0].cantidad);

    const turnos = await pool.request().query('SELECT COUNT(*) AS cantidad FROM dbo.Turnos');
    console.log('Turnos en la base:', turnos.recordset[0].cantidad);


    const permisos = await pool.request().query(
        "SELECT HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'CREATE TABLE') AS puedeCrearTablas"
    );
    console.log('¿Puede crear tablas? (0 = no, es lo correcto):', permisos.recordset[0].puedeCrearTablas);
} catch (error) {
    console.error('No se pudo conectar o consultar:', error.message);
    process.exitCode = 1;
} finally {
    await cerrarPool();
}