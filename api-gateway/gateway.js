import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = process.env.PORT || 8000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TIMEOUT_MS = 3000;          
const PAUSA_NODO_CAIDO_MS = 5000; 





const urlsNodos = (process.env.NODOS || 'http://localhost:3001,http://localhost:3002')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
const nodos = urlsNodos.map((url) => ({ url, caidoHasta: 0 }));

let cacheTurnos = null;
let cacheExpiraEn = 0;

app.use(express.json());

// Ruta de salud: Kubernetes la consulta para saber si el gateway sigue vivo
app.get('/health', (req, res) => {
    res.json({ estado: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'public')));



const estaDisponible = (nodo) => Date.now() >= nodo.caidoHasta;


const nodosDisponibles = () => {
    const sanos = nodos.filter(estaDisponible);
    return sanos.length > 0 ? sanos : nodos;
};

const marcarCaido = (nodo, motivo) => {
    nodo.caidoHasta = Date.now() + PAUSA_NODO_CAIDO_MS;
    console.log(`[🚨 FALLO] ${nodo.url} fuera de servicio por ${PAUSA_NODO_CAIDO_MS / 1000}s (${motivo}).`);
};



const llamar = async (nodo, metodo, ruta, cuerpo) => {
    const res = await fetch(nodo.url + ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const datos = await res.json().catch(() => ({}));
    return { status: res.status, datos };
};



const reenviar = async (metodo, ruta, cuerpo) => {
    let ultimaRespuesta = null;

    for (const nodo of nodosDisponibles()) {
        try {
            const r = await llamar(nodo, metodo, ruta, cuerpo);
            if (r.status < 500) {
                console.log(`[BALANCEADOR] ${metodo} ${ruta} atendido por ${nodo.url}`);
                return r;
            }
            ultimaRespuesta = r;
            marcarCaido(nodo, `respondió ${r.status}`);
        } catch (error) {
            marcarCaido(nodo, 'sin conexión o timeout');
        }
    }

    return {
        status: ultimaRespuesta?.status || 503,
        datos: { mensaje: ultimaRespuesta?.datos?.mensaje || "No hay servidores disponibles en este momento." }
    };
};






app.get('/api/turnos', async (req, res) => {
    if (cacheTurnos && Date.now() < cacheExpiraEn) {
        console.log(`[🚀 CACHÉ] Sirviendo desde memoria RAM del Gateway.`);
        return res.json(cacheTurnos);
    }

    const r = await reenviar('GET', '/api/turnos');
    if (r.status === 200 && Array.isArray(r.datos)) {
        cacheTurnos = r.datos;
        cacheExpiraEn = Date.now() + 3000;
    }
    res.status(r.status).json(r.datos);
});


app.post('/api/turnos', async (req, res) => {
    const r = await reenviar('POST', '/api/turnos', { ...req.body, id: randomUUID() });
    cacheTurnos = null; 
    res.status(r.status).json(r.datos);
});





app.delete('/api/turnos/:id', async (req, res) => {
    const r = await reenviar('DELETE', `/api/turnos/${encodeURIComponent(req.params.id)}`);
    cacheTurnos = null;
    res.status(r.status).json(r.datos);
});

const servidor = app.listen(PORT, () => {
    console.log(`[GATEWAY] Escuchando en http://localhost:${PORT}`);
});

// APAGADO ORDENADO: Kubernetes envía SIGTERM antes de reemplazar un pod.
// Dejamos de aceptar pedidos nuevos, terminamos los que están en curso y salimos.
const apagar = (senal) => {
    console.log(`[APAGADO] Señal ${senal} recibida. Cerrando...`);
    servidor.close(() => {
        console.log('[APAGADO] Listo.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref(); // si algo no termina en 10 s, salimos igual
};
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));