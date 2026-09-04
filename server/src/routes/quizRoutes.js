import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz,
  importQuizzes,
} from '../controllers/quizController.js';

const router = Router();

// Everything about quizzes is admin-only (players never need this API).
router.use(requireAdmin);

router.get('/', getAllQuizzes);
router.post('/import', importQuizzes);
router.get('/:id', getQuizById);
router.post('/', createQuiz);
router.put('/:id', updateQuiz);
router.delete('/:id', deleteQuiz);
router.post('/:id/duplicate', duplicateQuiz);

export default router;
