import express from 'express';
import cors from 'cors';
import turnosRoutes from './routes/turnosRoutes.js';
import { obtenerPool } from './db/conexion.js';

const app = express();

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


app.use((req, res, next) => {
    console.log(`[INSTANCIA PUERTO ${PORT}] Atendiendo petición: ${req.method} ${req.url}`);
    next();
});

app.use('/api', turnosRoutes);

app.listen(PORT, () => {
    console.log(`[MICROSERVICIO TURNOS] Instancia corriendo en http://localhost:${PORT}`);




    
    (async () => {
        try {
            await obtenerPool();
            console.log('[BD] Conectado a SQL Server.');
        } catch (error) {
            console.error(`[BD] No se pudo conectar a SQL Server: ${error.message}`);
        }
    })();
});