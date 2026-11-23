import { Router } from 'express';
import { getTurnos, crearTurno, eliminarTurno } from '../controller/turnosController.js';

const router = Router();



router.get('/turnos', getTurnos);
router.post('/turnos', crearTurno);
router.delete('/turnos/:id', eliminarTurno);

export default router;