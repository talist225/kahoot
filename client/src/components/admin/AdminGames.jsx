import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminAPI, errorMessage } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { hostSession } from '../../utils/storage';
import { t, formatDate, STATUS_LABELS } from '../../i18n';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

const statusColor = { lobby: 'bg-kahoot-yellow', playing: 'bg-kahoot-green', finished: 'bg-white/20' };
const filters = ['all', 'active', 'finished'];

export default function AdminGames() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'all';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(params.get('search') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await adminAPI.games({ status, page, search: params.get('search') || '' });
      setData(res.data);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status, page, params.get('search')]);

  // auto-refresh while looking at active games
  useEffect(() => {
    if (status !== 'active' && status !== 'all') return;
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [status, page, params.get('search')]);

  function setFilter(next) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p);
  }

  async function endGame(g) {
    if (!confirm(t('endGameAdminConfirm', { pin: g.pin }))) return;
    try { await adminAPI.endGame(g._id); await load(); } catch (err) { toast(errorMessage(err), 'error'); }
  }

  async function deleteGame(g) {
    if (!confirm(t('deleteGameConfirm', { pin: g.pin }))) return;
    try { await adminAPI.deleteGame(g._id); await load(); } catch (err) { toast(errorMessage(err), 'error'); }
  }

  async function clearFinished() {
    if (!confirm(t('clearFinishedConfirm'))) return;
    try {
      const { data: r } = await adminAPI.clearFinished();
      toast(t('deletedCount', { count: r.deleted }), 'success');
      await load();
    } catch (err) { toast(errorMessage(err), 'error'); }
  }

  function continueAsHost(g) {
    hostSession.set({ pin: g.pin, quizId: g.quizId });
    navigate(`/host/${g.quizId}`);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-white">{t('games')}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={load}>↻ {t('refresh')}</Button>
          <Button size="sm" variant="danger" onClick={clearFinished}>🗑 {t('clearFinished')}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex bg-white/10 rounded-lg p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter({ status: f === 'all' ? '' : f })}
              className={`px-4 py-1.5 rounded-md font-semibold text-sm ${status === f ? 'bg-white text-kahoot-purple' : 'text-white/70 hover:text-white'}`}
            >
              {t(f)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setFilter({ search }); }}
          className="flex gap-2 flex-1 min-w-[200px]"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t('search')} (${t('pin')} / ${t('quiz')})`}
            className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-white/40"
          />
          <Button size="sm" type="submit">{t('search')}</Button>
        </form>
      </div>

      {loading && !data ? (
        <LoadingSpinner />
      ) : !data?.items?.length ? (
        <p className="text-white/50 text-center py-12">{t('noGames')}</p>
      ) : (
        <div className="bg-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-white text-sm">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="text-start px-4 py-3">{t('status')}</th>
                  <th className="text-start px-4 py-3">{t('pin')}</th>
                  <th className="text-start px-4 py-3">{t('quiz')}</th>
                  <th className="text-center px-4 py-3">{t('players')}</th>
                  <th className="text-center px-4 py-3">{t('questions')}</th>
                  <th className="text-start px-4 py-3 hidden lg:table-cell">{t('created')}</th>
                  <th className="text-start px-4 py-3 hidden lg:table-cell">{t('finished')}</th>
                  <th className="text-end px-4 py-3">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((g) => (
                  <tr key={g._id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[g.status]}`}>{STATUS_LABELS[g.status]}</span>
                      {g.locked && <span className="ms-1">🔒</span>}
                    </td>
                    <td className="px-4 py-3 font-black ltr-nums">{g.pin}</td>
                    <td className="px-4 py-3 font-semibold max-w-[220px] truncate">{g.quizTitle || '—'}</td>
                    <td className="px-4 py-3 text-center ltr-nums">
                      {g.playerCount}
                      {g.status !== 'finished' && g.connectedCount !== g.playerCount && (
                        <span className="text-white/50 text-xs"> ({g.connectedCount} {t('connected')})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center ltr-nums">
                      {g.status === 'playing' ? `${g.currentQuestion + 1}/${g.totalQuestions}` : g.totalQuestions}
                    </td>
                    <td className="px-4 py-3 text-white/70 hidden lg:table-cell">{formatDate(g.createdAt)}</td>
                    <td className="px-4 py-3 text-white/70 hidden lg:table-cell">{formatDate(g.finishedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Link to={`/admin/games/${g._id}`} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md font-semibold">{t('view')}</Link>
                        {g.status !== 'finished' && (
                          <>
                            <button onClick={() => continueAsHost(g)} className="bg-kahoot-blue hover:bg-blue-700 px-3 py-1 rounded-md font-semibold">{t('continueAsHost')}</button>
                            <button onClick={() => endGame(g)} className="bg-kahoot-yellow hover:bg-yellow-600 px-3 py-1 rounded-md font-semibold">{t('endNow')}</button>
                          </>
                        )}
                        {g.status === 'finished' && (
                          <a href={`/results/${g.pin}`} target="_blank" rel="noreferrer" className="bg-kahoot-green hover:bg-green-700 px-3 py-1 rounded-md font-semibold">🏆</a>
                        )}
                        <button onClick={() => deleteGame(g)} className="bg-kahoot-red hover:bg-red-700 px-3 py-1 rounded-md font-semibold">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-white/70 text-sm">
              <button disabled={page <= 1} onClick={() => setFilter({ page: String(page - 1) })} className="disabled:opacity-30 hover:text-white">→ {t('prev')}</button>
              <span>{t('page', { page: data.page, pages: data.pages })}</span>
              <button disabled={page >= data.pages} onClick={() => setFilter({ page: String(page + 1) })} className="disabled:opacity-30 hover:text-white">{t('nextPage')} ←</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
