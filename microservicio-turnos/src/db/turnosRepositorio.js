import { obtenerPool, sql } from './conexion.js';


export const listarTurnosConfirmados = async () => {
    const pool = await obtenerPool();
    const resultado = await pool.request().query(`
        SELECT LOWER(CONVERT(VARCHAR(36), t.TurnoId)) AS id,
               p.Apellido + N', ' + p.Nombre AS paciente,
               CONVERT(VARCHAR(10), t.Fecha, 23) AS fecha,
               CONVERT(VARCHAR(5), t.Hora, 108) AS hora,
               t.Estado AS estado
        FROM dbo.Turnos t
        JOIN dbo.Pacientes p ON p.PacienteId = t.PacienteId
        WHERE t.Estado = 'confirmado'
        ORDER BY t.Fecha, t.Hora;
    `);
    return resultado.recordset;
};



export const insertarTurno = async ({ turnoId, dni, nombre, apellido, fecha, hora }) => {
    const pool = await obtenerPool();
    const resultado = await pool.request()
        .input('TurnoId', sql.UniqueIdentifier, turnoId)
        .input('Dni', sql.VarChar(10), dni)
        .input('Nombre', sql.NVarChar(60), nombre)
        .input('Apellido', sql.NVarChar(60), apellido)
        .input('Fecha', sql.VarChar(10), fecha)
        .input('Hora', sql.VarChar(5), hora)
        .query(`
            SET XACT_ABORT ON;

            -- Si este mismo pedido ya se guardó (por ejemplo, un reintento), no hacemos nada
            IF EXISTS (SELECT 1 FROM dbo.Turnos WHERE TurnoId = @TurnoId)
            BEGIN
                SELECT CAST(0 AS BIT) AS creado;
                RETURN;
            END

            BEGIN TRANSACTION;

            DECLARE @PacienteId INT;
            SELECT @PacienteId = PacienteId
            FROM dbo.Pacientes WITH (UPDLOCK, HOLDLOCK)
            WHERE Dni = @Dni;

            IF @PacienteId IS NULL
            BEGIN
                INSERT INTO dbo.Pacientes (Dni, Nombre, Apellido) VALUES (@Dni, @Nombre, @Apellido);
                SET @PacienteId = SCOPE_IDENTITY();
            END

            INSERT INTO dbo.Turnos (TurnoId, PacienteId, Fecha, Hora)
            VALUES (@TurnoId, @PacienteId, CAST(@Fecha AS DATE), CAST(@Hora AS TIME(0)));

            COMMIT TRANSACTION;
            SELECT CAST(1 AS BIT) AS creado;
        `);
    return resultado.recordset[0].creado;
};



export const cancelarTurno = async (turnoId) => {
    const pool = await obtenerPool();
    const resultado = await pool.request()
        .input('TurnoId', sql.UniqueIdentifier, turnoId)
        .query(`UPDATE dbo.Turnos SET Estado = 'cancelado' WHERE TurnoId = @TurnoId AND Estado = 'confirmado';`);
    return resultado.rowsAffected[0] > 0;
};



export const esViolacion = (error, nombreRestriccion) => {
    const numero = error.number ?? error.originalError?.info?.number;
    return (numero === 2601 || numero === 2627) && String(error.message).includes(nombreRestriccion);
};