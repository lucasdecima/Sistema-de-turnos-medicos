import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = 8000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TIMEOUT_MS = 3000;          
const PAUSA_NODO_CAIDO_MS = 5000; 



const nodos = [
    { url: 'http://localhost:3001', caidoHasta: 0 },
    { url: 'http://localhost:3002', caidoHasta: 0 }
];

let cacheTurnos = null;
let cacheExpiraEn = 0;

app.use(express.json());
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


const esMasAntiguo = (a, b) => a.creado < b.creado || (a.creado === b.creado && a.id < b.id);



app.get('/api/turnos', async (req, res) => {
    if (cacheTurnos && Date.now() < cacheExpiraEn) {
        console.log(`[🚀 CACHÉ] Sirviendo desde memoria RAM del Gateway.`);
        return res.json(cacheTurnos);
    }

    const consultados = nodosDisponibles();
    const respuestas = await Promise.allSettled(consultados.map(n => llamar(n, 'GET', '/api/turnos')));

    const porHorario = new Map(); 
    let algunoRespondio = false;

    respuestas.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.status === 200 && Array.isArray(r.value.datos)) {
            algunoRespondio = true;
            for (const t of r.value.datos) {
                const clave = `${t.fecha} ${t.hora}`;
                const actual = porHorario.get(clave);
                if (!actual || esMasAntiguo(t, actual)) porHorario.set(clave, t);
            }
        } else {
            marcarCaido(consultados[i], 'no respondió al listar');
        }
    });

    if (!algunoRespondio) {
        return res.status(503).json({ mensaje: "No hay servidores disponibles en este momento." });
    }

    cacheTurnos = [...porHorario.values()].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    cacheExpiraEn = Date.now() + 3000;
    console.log(`[BALANCEADOR] Lista unificada de ${consultados.length} nodo(s): ${cacheTurnos.length} turno(s).`);
    res.json(cacheTurnos);
});



app.post('/api/turnos', async (req, res) => {
    
    const cuerpo = { ...req.body, id: randomUUID() };
    let ultimaRespuesta = null;

    for (const nodo of nodosDisponibles()) {
        try {
            const r = await llamar(nodo, 'POST', '/api/turnos', cuerpo);
            if (r.status < 500) {
                console.log(`[BALANCEADOR] POST atendido por ${nodo.url}`);
                cacheTurnos = null; 
                return res.status(r.status).json(r.datos);
            }
            ultimaRespuesta = r; 
            marcarCaido(nodo, `respondió ${r.status}`);
        } catch (error) {
            marcarCaido(nodo, 'sin conexión o timeout');
        }
    }

    res.status(ultimaRespuesta?.status || 503).json({
        mensaje: ultimaRespuesta?.datos?.mensaje || "No hay servidores disponibles en este momento."
    });
});




app.delete('/api/turnos/:id', async (req, res) => {
    const consultados = nodosDisponibles();
    const ruta = `/api/turnos/${encodeURIComponent(req.params.id)}`;
    const respuestas = await Promise.allSettled(consultados.map(n => llamar(n, 'DELETE', ruta)));

    let algunoOk = false;
    respuestas.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.status < 300) algunoOk = true;
        else marcarCaido(consultados[i], 'no respondió al eliminar');
    });

    if (!algunoOk) {
        return res.status(503).json({ mensaje: "No hay servidores disponibles en este momento." });
    }
    
    cacheTurnos = null;
    res.json({ mensaje: "Turno eliminado." });
});

app.listen(PORT, () => {
    console.log(`[GATEWAY] Escuchando en http://localhost:${PORT}`);
});
