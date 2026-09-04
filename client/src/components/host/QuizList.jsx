import { motion } from 'framer-motion';
import { quizAPI } from '../../utils/api';
import { t, formatDate } from '../../i18n';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

export default function QuizList({ quizzes, loading, onEdit, onDelete, onHost, onDuplicate, onExport }) {
  if (loading) return <LoadingSpinner text={t('loadingQuizzes')} />;

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/60 text-xl mb-4">{t('noQuizzes')}</p>
        <p className="text-white/40">{t('createFirstQuiz')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {quizzes.map((quiz, i) => (
        <motion.div
          key={quiz._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 10) * 0.05 }}
          className="bg-white/10 backdrop-blur rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white truncate">{quiz.title}</h3>
            {quiz.description && <p className="text-white/70 text-sm truncate">{quiz.description}</p>}
            <p className="text-white/60 text-sm mt-1">
              {t('questionCount', { count: quiz.questionCount })} • {t('timesPlayed', { count: quiz.timesPlayed || 0 })} • {formatDate(quiz.createdAt, false)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="success" onClick={() => onHost(quiz._id)}>
              ▶ {t('host')}
            </Button>
            <Button size="sm" variant="secondary" onClick={async () => {
              try {
                const { data } = await quizAPI.getById(quiz._id);
                onEdit(data);
              } catch (e) { console.error(e); }
            }}>
              ✏ {t('edit')}
            </Button>
            {onDuplicate && (
              <Button size="sm" variant="blue" onClick={() => onDuplicate(quiz._id)}>
                ⧉ {t('duplicate')}
              </Button>
            )}
            {onExport && (
              <Button size="sm" variant="blue" onClick={() => onExport(quiz._id)}>
                ⬇ {t('export')}
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => onDelete(quiz)}>
              🗑
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
