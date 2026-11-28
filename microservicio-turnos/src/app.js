import express from 'express';
import cors from 'cors';
import turnosRoutes from './routes/turnosRoutes.js';
import { obtenerPool, cerrarPool } from './db/conexion.js';

const app = express();

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ruta de salud: Kubernetes la consulta cada pocos segundos para saber si el programa sigue vivo.
// Va ANTES del mensaje de cada petición para no llenar la consola.
app.get('/health', (req, res) => {
    res.json({ estado: 'ok' });
});

// Mensaje en consola por cada petición recibida
app.use((req, res, next) => {
    console.log(`[INSTANCIA PUERTO ${PORT}] Atendiendo petición: ${req.method} ${req.url}`);
    next();
});

app.use('/api', turnosRoutes);

const servidor = app.listen(PORT, () => {
    console.log(`[MICROSERVICIO TURNOS] Instancia corriendo en http://localhost:${PORT}`);

    // Probamos la conexión con SQL Server al arrancar, para enterarnos enseguida si algo está mal.
    // Si falla, el servidor sigue en pie y reintenta la conexión cuando llega el próximo pedido.
    (async () => {
        try {
            await obtenerPool();
            console.log('[BD] Conectado a SQL Server.');
        } catch (error) {
            console.error(`[BD] No se pudo conectar a SQL Server: ${error.message}`);
        }
    })();
});

// APAGADO ORDENADO: cuando Kubernetes reemplaza un pod le envía la señal SIGTERM.
// Dejamos de aceptar pedidos nuevos, terminamos los que están en curso, cerramos la base y salimos.
const apagar = (senal) => {
    console.log(`[APAGADO] Señal ${senal} recibida. Cerrando...`);
    servidor.close(async () => {
        try { await cerrarPool(); } catch { /* ya estaba cerrado */ }
        console.log('[APAGADO] Listo.');
        process.exit(0);
    });
    // Si algo no termina en 10 segundos, salimos igual
    setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));