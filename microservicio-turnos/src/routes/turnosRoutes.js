import { Router } from 'express';
import { getTurnos, crearTurno, eliminarTurno, estadoInterno, replicarInterno } from '../controller/turnosController.js';

const router = Router();


router.get('/turnos', getTurnos);
router.post('/turnos', crearTurno);
router.delete('/turnos/:id', eliminarTurno);


router.get('/interno/estado', estadoInterno);
router.post('/interno/replicar', replicarInterno);

export default router;
