import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  login,
  verify,
  getStats,
  listGames,
  getGame,
  deleteGame,
  endGame,
  kickPlayerFromGame,
  clearFinishedGames,
  getAdminSettings,
  updateAdminSettings,
  exportData,
  uploadBubbleImage,
  deleteBubbleImage,
} from '../controllers/adminController.js';

const router = Router();

router.post('/login', login);

router.use(requireAdmin);

router.get('/verify', verify);
router.get('/stats', getStats);
router.get('/games', listGames);
router.get('/games/:id', getGame);
router.delete('/games/:id', deleteGame);
router.post('/games/:id/end', endGame);
router.post('/games/:id/kick', kickPlayerFromGame);
router.post('/games/clear-finished', clearFinishedGames);
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.post('/settings/bubble-image', uploadBubbleImage);
router.delete('/settings/bubble-image/:index', deleteBubbleImage);
router.get('/export', exportData);

export default router;
