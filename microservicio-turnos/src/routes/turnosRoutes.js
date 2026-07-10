import { Router } from 'express';
import { getTurnos, crearTurno } from '../controller/turnosController.js';

const router = Router();


router.get('/turnos', getTurnos);       
router.post('/turnos', crearTurno);     

export default router; 