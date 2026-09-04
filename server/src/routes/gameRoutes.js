import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { createGame, getGameByPin, getGameResults } from '../controllers/gameController.js';

const router = Router();

router.post('/create', requireAdmin, createGame);
router.get('/:pin', getGameByPin);
router.get('/:pin/results', getGameResults);

export default router;
