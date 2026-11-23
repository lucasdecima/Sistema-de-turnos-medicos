import sql from 'mssql';


const VARIABLES_OBLIGATORIAS = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

const crearConfig = () => {
    const faltantes = VARIABLES_OBLIGATORIAS.filter((nombre) => !process.env[nombre]);
    if (faltantes.length > 0) {
        throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
    }

    return {
        server: process.env.DB_SERVER,
        port: Number(process.env.DB_PORT) || 1433,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            encrypt: true,                                              
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true' 
        },
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
    };
};

let promesaPool = null;


export const obtenerPool = () => {
    if (!promesaPool) {
        const pool = new sql.ConnectionPool(crearConfig());
        pool.on('error', (error) => console.error('[BD] Error en el pool:', error.message));
        promesaPool = pool.connect().catch((error) => {
            promesaPool = null; 
            throw error;
        });
    }
    return promesaPool;
};


export const cerrarPool = async () => {
    if (promesaPool) {
        const pool = await promesaPool;
        await pool.close();
        promesaPool = null;
    }
};

export { sql };