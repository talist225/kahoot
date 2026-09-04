import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAPI, errorMessage } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { hostSession } from '../../utils/storage';
import { ANSWER_CONFIG } from '../../utils/constants';
import { t, formatDate, formatNumber, STATUS_LABELS, ENDED_BY_LABELS } from '../../i18n';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

export default function AdminGameDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [game, setGame] = useState(null);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    try {
      const { data } = await adminAPI.game(id);
      setGame(data);
    } catch (err) {
      toast(errorMessage(err), 'error');
      navigate('/admin/games');
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!game || game.status === 'finished') return;
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [game?.status, id]);

  if (!game) return <LoadingSpinner />;

  const questions = game.quiz?.questions || [];
  const isActive = game.status !== 'finished';

  async function endGame() {
    if (!confirm(t('endGameAdminConfirm', { pin: game.pin }))) return;
    try { await adminAPI.endGame(game._id); await load(); } catch (err) { toast(errorMessage(err), 'error'); }
  }

  async function deleteGame() {
    if (!confirm(t('deleteGameConfirm', { pin: game.pin }))) return;
    try { await adminAPI.deleteGame(game._id); navigate('/admin/games'); } catch (err) { toast(errorMessage(err), 'error'); }
  }

  async function kick(p) {
    if (!confirm(`${t('kickPlayer')}: ${p.nickname}?`)) return;
    try { await adminAPI.kickPlayer(game._id, p.playerId); await load(); } catch (err) { toast(errorMessage(err), 'error'); }
  }

  function continueAsHost() {
    hostSession.set({ pin: game.pin, quizId: game.quizId });
    navigate(`/host/${game.quizId}`);
  }

  // per-question stats
  const questionStats = questions.map((q, qi) => {
    const counts = q.answers.map(() => 0);
    let correct = 0;
    game.players.forEach((p) => {
      const a = p.answers?.find((x) => x.questionIndex === qi);
      if (a) {
        if (a.answerId >= 0 && a.answerId < counts.length) counts[a.answerId]++;
        if (a.isCorrect) correct++;
      }
    });
    return { counts, correct, answered: counts.reduce((s, c) => s + c, 0) };
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/admin/games')} className="text-white/60 hover:text-white text-sm">→ {t('games')}</button>
          <h1 className="text-3xl font-black text-white mt-1">
            {t('gameDetails')} · <span className="ltr-nums">{game.pin}</span>
          </h1>
          <p className="text-white/70 text-lg">{game.quizTitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isActive && <Button size="sm" variant="blue" onClick={continueAsHost}>🎤 {t('continueAsHost')}</Button>}
          {isActive && <Button size="sm" variant="secondary" onClick={endGame}>⏹ {t('endNow')}</Button>}
          {!isActive && <Button size="sm" variant="success" onClick={() => window.open(`/results/${game.pin}`, '_blank')}>🏆 {t('openResultsPage')}</Button>}
          <Button size="sm" variant="danger" onClick={deleteGame}>🗑 {t('delete')}</Button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-white">
        <Meta label={t('status')} value={STATUS_LABELS[game.status]} />
        <Meta label={t('players')} value={game.players.length} />
        <Meta label={t('questions')} value={game.status === 'playing' ? `${game.currentQuestion + 1} / ${game.totalQuestions}` : game.totalQuestions} />
        <Meta label={t('endedBy')} value={ENDED_BY_LABELS[game.endedBy] ?? '—'} />
        <Meta label={t('created')} value={formatDate(game.createdAt)} />
        <Meta label={t('started')} value={formatDate(game.startedAt)} />
        <Meta label={t('finished')} value={formatDate(game.finishedAt)} />
        <Meta label={t('lock')} value={game.locked ? '🔒' : '—'} />
      </div>

      {/* Players */}
      <section className="bg-white/10 rounded-xl overflow-hidden">
        <h2 className="text-xl font-bold text-white px-4 py-3 bg-black/20">{t('leaderboard')}</h2>
        {game.players.length === 0 ? (
          <p className="text-white/50 p-4">{t('noPlayers')}</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-white text-sm">
              <thead className="text-white/60">
                <tr>
                  <th className="text-start px-4 py-2">#</th>
                  <th className="text-start px-4 py-2">{t('player')}</th>
                  <th className="text-center px-4 py-2">{t('score')}</th>
                  <th className="text-center px-4 py-2">{t('correct')}</th>
                  <th className="text-center px-4 py-2 hidden md:table-cell">{t('joinedAt')}</th>
                  <th className="text-center px-4 py-2">{t('status')}</th>
                  <th className="text-end px-4 py-2">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {game.players.map((p) => {
                  const correct = p.answers?.filter((a) => a.isCorrect).length || 0;
                  const open = expanded === p.playerId;
                  return (
                    <Fragment key={p.playerId}>
                      <tr className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-2 font-black ltr-nums">{p.rank}</td>
                        <td className="px-4 py-2 font-semibold">{p.nickname}</td>
                        <td className="px-4 py-2 text-center ltr-nums">{formatNumber(p.score)}</td>
                        <td className="px-4 py-2 text-center ltr-nums">{correct}/{p.answers?.length || 0}</td>
                        <td className="px-4 py-2 text-center text-white/60 hidden md:table-cell">{formatDate(p.joinedAt)}</td>
                        <td className="px-4 py-2 text-center">
                          {game.status === 'finished' ? '—' : p.connected ? <span className="text-kahoot-green">● {t('connected')}</span> : <span className="text-white/40">○ {t('disconnected')}</span>}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setExpanded(open ? null : p.playerId)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md">{open ? '▲' : '▼'} {t('answers')}</button>
                            {isActive && <button onClick={() => kick(p)} className="bg-kahoot-red hover:bg-red-700 px-3 py-1 rounded-md">{t('kick')}</button>}
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-black/20">
                          <td colSpan={7} className="px-4 py-3">
                            {p.answers?.length ? (
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {p.answers.slice().sort((a, b) => a.questionIndex - b.questionIndex).map((a) => {
                                  const q = questions[a.questionIndex];
                                  return (
                                    <div key={a.questionIndex} className={`rounded-lg p-2 text-xs ${a.isCorrect ? 'bg-kahoot-green/40' : 'bg-kahoot-red/40'}`}>
                                      <p className="font-bold truncate">{a.questionIndex + 1}. {q?.text || '—'}</p>
                                      <p>
                                        <span className="me-1">{ANSWER_CONFIG[a.answerId]?.label}</span>
                                        {q?.answers?.[a.answerId]?.text || '—'} · {a.isCorrect ? '✓' : '✗'} · +{a.points} · <span className="ltr-nums">{(a.timeToAnswer / 1000).toFixed(1)}s</span>
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : <p className="text-white/50 text-sm">—</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Per-question breakdown */}
      {questions.length > 0 && (
        <section className="bg-white/10 rounded-xl overflow-hidden">
          <h2 className="text-xl font-bold text-white px-4 py-3 bg-black/20">{t('answerDetails')}</h2>
          <div className="divide-y divide-white/10">
            {questions.map((q, qi) => {
              const s = questionStats[qi];
              const correctIdx = q.answers.findIndex((a) => a.isCorrect);
              return (
                <div key={qi} className="p-4 text-white">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-bold">{qi + 1}. {q.text}</p>
                    <p className="text-white/60 text-sm whitespace-nowrap">{t('correctCount', { count: s.correct, total: s.answered })}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {q.answers.map((a, ai) => (
                      <div key={ai} className={`rounded-lg px-3 py-2 flex items-center gap-2 ${ai === correctIdx ? 'ring-2 ring-white' : 'opacity-80'}`} style={{ backgroundColor: ANSWER_CONFIG[ai]?.color }}>
                        <span>{ANSWER_CONFIG[ai]?.label}</span>
                        <span className="flex-1 truncate text-sm">{a.text}</span>
                        <span className="font-black ltr-nums">{s.counts[ai]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="bg-white/10 rounded-lg p-3">
      <p className="text-white/50 text-xs">{label}</p>
      <p className="font-bold ltr-nums">{value ?? '—'}</p>
    </div>
  );
}
