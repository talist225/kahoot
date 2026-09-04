import { ANSWER_CONFIG, TIME_LIMITS, POINT_OPTIONS } from '../../utils/constants';
import { t } from '../../i18n';

const colorMap = ['red', 'blue', 'yellow', 'green'];

export default function QuestionEditor({ question, index, onChange, onRemove, onMoveUp, onMoveDown, onDuplicate, totalQuestions }) {
  function updateField(field, value) {
    onChange({ ...question, [field]: value });
  }

  function updateAnswer(answerIndex, field, value) {
    const newAnswers = question.answers.map((a, i) =>
      i === answerIndex ? { ...a, [field]: value } : { ...a }
    );
    if (field === 'isCorrect' && value) {
      newAnswers.forEach((a, i) => {
        if (i !== answerIndex) a.isCorrect = false;
      });
    }
    onChange({ ...question, answers: newAnswers });
  }

  function addAnswer() {
    if (question.answers.length >= 4) return;
    const nextColor = colorMap[question.answers.length];
    onChange({
      ...question,
      answers: [...question.answers, { text: '', isCorrect: false, color: nextColor }],
    });
  }

  function removeAnswer(answerIndex) {
    if (question.answers.length <= 2) return;
    const remaining = question.answers.filter((_, i) => i !== answerIndex).map((a, i) => ({ ...a, color: colorMap[i] }));
    if (!remaining.some((a) => a.isCorrect)) remaining[0].isCorrect = true;
    onChange({ ...question, answers: remaining });
  }

  const iconBtn = 'text-white/60 hover:text-white disabled:opacity-20 text-sm px-1';

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-white">{t('questionNumber', { index: index + 1 })}</h3>
        <div className="flex items-center gap-2">
          <button onClick={onMoveUp} disabled={!onMoveUp} className={iconBtn} title={t('moveUp')} aria-label={t('moveUp')}>▲</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} className={iconBtn} title={t('moveDown')} aria-label={t('moveDown')}>▼</button>
          <button onClick={onDuplicate} className={iconBtn} title={t('duplicate')} aria-label={t('duplicate')}>⧉</button>
          {totalQuestions > 1 && (
            <button onClick={onRemove} className="text-red-300 hover:text-red-100 text-sm font-semibold ms-2">
              {t('remove')}
            </button>
          )}
        </div>
      </div>

      <input
        type="text"
        value={question.text}
        onChange={(e) => updateField('text', e.target.value)}
        placeholder={t('enterQuestion')}
        className="w-full bg-white/20 text-white placeholder-white/50 rounded-lg px-4 py-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-white/50"
      />

      <input
        type="url"
        value={question.image || ''}
        onChange={(e) => updateField('image', e.target.value)}
        placeholder={t('imageUrl')}
        dir="ltr"
        className="w-full bg-white/10 text-white placeholder-white/30 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30 text-left placeholder:text-right"
      />
      {question.image && (
        <img src={question.image} alt="" className="max-h-32 rounded-lg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.answers.map((answer, i) => (
          <div
            key={i}
            className="relative rounded-lg p-3 flex items-center gap-3"
            style={{ backgroundColor: ANSWER_CONFIG[i]?.color || '#666' }}
          >
            <span className="text-white text-xl w-8 text-center">{ANSWER_CONFIG[i]?.label}</span>
            <input
              type="text"
              value={answer.text}
              onChange={(e) => updateAnswer(i, 'text', e.target.value)}
              placeholder={t('answerPlaceholder', { index: i + 1 })}
              className="flex-1 bg-white/20 text-white placeholder-white/50 rounded px-3 py-2 outline-none min-w-0"
            />
            <button
              type="button"
              onClick={() => updateAnswer(i, 'isCorrect', true)}
              title={t('markCorrect')}
              aria-label={t('markCorrect')}
              className={`w-8 h-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-all
                ${answer.isCorrect ? 'bg-white border-white text-green-600' : 'border-white/50 text-transparent hover:border-white'}`}
            >
              ✓
            </button>
            {question.answers.length > 2 && (
              <button type="button" onClick={() => removeAnswer(i)} className="text-white/50 hover:text-white text-sm shrink-0">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {question.answers.length < 4 && (
        <button
          type="button"
          onClick={addAnswer}
          className="text-white/60 hover:text-white border border-dashed border-white/30 rounded-lg w-full py-2 text-sm"
        >
          + {t('addAnswer')}
        </button>
      )}

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-white/60 text-sm block mb-1">{t('timeLimit')}</label>
          <select
            value={question.timeLimit}
            onChange={(e) => updateField('timeLimit', Number(e.target.value))}
            className="bg-white/20 text-white rounded px-3 py-2 outline-none"
          >
            {TIME_LIMITS.map((tl) => (
              <option key={tl} value={tl}>{tl} {t('seconds')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-white/60 text-sm block mb-1">{t('pointsLabel')}</label>
          <select
            value={question.points}
            onChange={(e) => updateField('points', Number(e.target.value))}
            className="bg-white/20 text-white rounded px-3 py-2 outline-none"
          >
            {POINT_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
