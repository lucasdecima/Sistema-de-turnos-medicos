import express from 'express';
import proxy from 'express-http-proxy';

const app = express();
const PORT = 8000;


const servidoresTurnos = [
    { url: 'http://localhost:3001', activo: true },
    { url: 'http://localhost:3002', activo: true }
];

let indiceActual = 0;
let cacheTurnos = null;
let cacheExpiraEn = 0;

app.use(express.static('../public'));


app.get('/api/turnos', (req, res, next) => {
    const ahora = Date.now();
    if (cacheTurnos && ahora < cacheExpiraEn) {
        console.log(`[CACHÉ] Sirviendo desde memoria RAM del Gateway.`);
        return res.json(cacheTurnos);
    }
    next();
});


app.use('/api/turnos', (req, res, next) => {
    
    let servidoresDisponibles = servidoresTurnos.filter(s => s.activo);

    
    if (servidoresDisponibles.length === 0) {
        servidoresTurnos.forEach(s => s.activo = true);
        servidoresDisponibles = servidoresTurnos;
    }

    
    indiceActual = indiceActual % servidoresDisponibles.length;
    const servidorSeleccionado = servidoresDisponibles[indiceActual];
    indiceActual = (indiceActual + 1) % servidoresDisponibles.length;

    console.log(`[BALANCEADOR] Intentando enviar petición a: ${servidorSeleccionado.url}`);

    
    proxy(servidorSeleccionado.url, {
        proxyReqPathResolver: () => '/api/turnos',
        
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            if (userReq.method === 'GET' && proxyRes.statusCode === 200) {
                cacheTurnos = JSON.parse(proxyResData.toString());
                cacheExpiraEn = Date.now() + 5000;
            }
            return proxyResData;
        },
        
        proxyErrorHandler: (err, res, next) => {
            console.log(`[🚨 FALLO] El servidor ${servidorSeleccionado.url} está caído de verdad.`);
            
            
            servidorSeleccionado.activo = false;

            
            const elOtroServidor = servidoresTurnos.find(s => s.url !== servidorSeleccionado.url);
            
            if (elOtroServidor && elOtroServidor.activo) {
                console.log(`[🛡️ RESILIENCIA] Avisando al sistema. La próxima petición irá directo a: ${elOtroServidor.url}`);
            }

            
            setTimeout(() => {
                servidorSeleccionado.activo = true;
                console.log(`[🔄 RECONEXIÓN] Re-activando ${servidorSeleccionado.url} para pruebas de salud.`);
            }, 10000);

            
            res.status(503).json({ 
                mensaje: "Saturación temporal en este nodo. Por favor, presione 'Reservar' nuevamente para conectar con la réplica de respaldo." 
            });
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`[GATEWAY MEJORADO] Escuchando en http://localhost:${PORT}`);
});