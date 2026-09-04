import { useState } from 'react';
import QuestionEditor from './QuestionEditor';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { t } from '../../i18n';

const emptyQuestion = () => ({
  text: '',
  image: '',
  timeLimit: 20,
  points: 1000,
  answers: [
    { text: '', isCorrect: true, color: 'red' },
    { text: '', isCorrect: false, color: 'blue' },
    { text: '', isCorrect: false, color: 'yellow' },
    { text: '', isCorrect: false, color: 'green' },
  ],
});

export default function QuizCreator({ quiz, onSave, onCancel, saving = false }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [questions, setQuestions] = useState(
    quiz?.questions?.length ? quiz.questions : [emptyQuestion()]
  );

  function updateQuestion(index, updated) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveQuestion(index, dir) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function duplicateQuestion(index) {
    setQuestions((prev) => {
      const { _id, ...copy } = prev[index];
      const cloned = { ...copy, answers: copy.answers.map(({ _id: aid, ...a }) => ({ ...a })) };
      return [...prev.slice(0, index + 1), cloned, ...prev.slice(index + 1)];
    });
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function handleSave() {
    if (!title.trim()) return toast(t('enterQuizTitle'), 'error');
    if (questions.some((q) => !q.text.trim())) return toast(t('allQuestionsNeedText'), 'error');
    if (questions.some((q) => !q.answers.some((a) => a.isCorrect))) return toast(t('eachQuestionNeedsCorrect'), 'error');
    if (questions.some((q) => q.answers.some((a) => !a.text.trim()))) return toast(t('allAnswersNeedText'), 'error');

    onSave({ title: title.trim(), description: description.trim(), questions });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">{quiz?._id ? t('editQuiz') : t('createQuiz')}</h1>
        <Button size="sm" onClick={onCancel}>→ {t('back')}</Button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('quizTitle')}
          className="w-full bg-white/20 text-white placeholder-white/50 rounded-xl px-5 py-4 text-2xl font-bold outline-none focus:ring-2 focus:ring-white/50"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('quizDescription')}
          className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-white/30"
        />
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionEditor
            key={q._id || i}
            question={q}
            index={i}
            onChange={(updated) => updateQuestion(i, updated)}
            onRemove={() => removeQuestion(i)}
            onMoveUp={i > 0 ? () => moveQuestion(i, -1) : null}
            onMoveDown={i < questions.length - 1 ? () => moveQuestion(i, 1) : null}
            onDuplicate={() => duplicateQuestion(i)}
            totalQuestions={questions.length}
          />
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full border-2 border-dashed border-white/30 rounded-xl py-4 text-white/60 hover:text-white hover:border-white/60 transition-colors text-lg font-semibold"
      >
        + {t('addQuestion')}
      </button>

      <div className="flex gap-3 justify-end pt-4 pb-8">
        <Button variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
        <Button variant="success" onClick={handleSave} disabled={saving}>
          💾 {t('saveQuiz')}
        </Button>
      </div>
    </div>
  );
}
