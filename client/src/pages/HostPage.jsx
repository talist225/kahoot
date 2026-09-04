import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { gameAPI, getAdminToken, errorMessage } from '../utils/api';
import { hostSession } from '../utils/storage';
import { t } from '../i18n';
import HostLobby from '../components/host/HostLobby';
import HostGameView from '../components/host/HostGameView';
import HostResults from '../components/host/HostResults';
import Countdown from '../components/common/Countdown';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

export default function HostPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType(); // 'PUSH' on in-app navigation, 'POP' on reload/back
  const { socket, connected } = useSocket();
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('init'); // init | resuming | creating | ready
  const stateRef = useRef(state);
  stateRef.current = state;
  const startedRef = useRef(null); // location.key we already initialised for (guards double creation)

  // Admin-only page
  useEffect(() => {
    if (!getAdminToken()) {
      navigate(`/admin?next=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, []);

  async function createNewGame() {
    setPhase('creating');
    try {
      const { data } = await gameAPI.create(quizId);
      dispatch({ type: 'SET_HOST', pin: data.pin, title: data.title });
      hostSession.set({ pin: data.pin, quizId });
      socket.emit('host:create-room', { pin: data.pin });
      setPhase('ready');
    } catch (err) {
      setError(errorMessage(err, t('failedToCreateGame')));
    }
  }

  // Initial: resume an existing session for this quiz, or create a fresh game.
  useEffect(() => {
    if (!socket || !connected || !getAdminToken()) return;

    if (startedRef.current === location.key) {
      // Socket reconnected while hosting: re-claim the room.
      if (stateRef.current.pin) socket.emit('host:resume', { pin: stateRef.current.pin });
      return;
    }
    startedRef.current = location.key;
    dispatch({ type: 'RESET' });

    const saved = hostSession.get();
    // "?new" forces a brand-new game only when we navigated here in-app (e.g. from the
    // admin panel). On a page reload (POP) we always try to resume the running game.
    const forceNew = new URLSearchParams(location.search).has('new') && navigationType !== 'POP';
    if (!forceNew && saved?.pin && saved?.quizId === quizId) {
      setPhase('resuming');
      socket.emit('host:resume', { pin: saved.pin });
    } else {
      createNewGame();
    }
  }, [socket, connected, quizId, location.key]);

  useEffect(() => {
    if (!socket) return;

    const handlers = {
      'host:room-created': (data) => {
        if (!stateRef.current.pin) dispatch({ type: 'SET_HOST', pin: data.pin, title: data.title });
        setPhase('ready');
      },
      'host:state': (s) => {
        dispatch({ type: 'RESTORE_HOST_STATE', state: s });
        hostSession.set({ pin: s.pin, quizId });
        setPhase('ready');
      },
      'host:resume-failed': () => {
        hostSession.clear();
        createNewGame();
      },
      'join:error': (data) => setError(data.message),
      'player:joined': (data) => dispatch({ type: 'PLAYER_JOINED', players: data.players }),
      'player:list': (data) => dispatch({ type: 'PLAYER_LIST', players: data.players }),
      'player:disconnected': (data) => dispatch({ type: 'PLAYER_DISCONNECTED', nickname: data.nickname, players: data.players }),
      'game:started': () => dispatch({ type: 'GAME_STARTED' }),
      'question:show': (data) => dispatch({ type: 'SHOW_QUESTION', question: data, index: data.index, total: data.total, timeLimit: data.timeLimit }),
      'answer:received': (data) => dispatch({ type: 'ANSWER_RECEIVED', count: data.count }),
      'question:timeout': () => dispatch({ type: 'QUESTION_TIMEOUT' }),
      'question:results': (data) => dispatch({ type: 'QUESTION_RESULTS', results: data }),
      'leaderboard:show': (data) => dispatch({ type: 'SHOW_LEADERBOARD', leaderboard: data }),
      'game:finished': (data) => {
        hostSession.clear();
        dispatch({ type: 'GAME_FINISHED', results: data });
      },
      'game:cancelled': (data) => {
        hostSession.clear();
        dispatch({ type: 'RESET' });
        toast(data?.reason === 'admin' ? t('gameCancelledByAdmin') : t('gameCancelled'), 'warning');
        navigate('/admin/quizzes');
      },
      'game:lock-toggled': (data) => dispatch({ type: 'GAME_LOCK_TOGGLED', locked: data.locked }),
    };

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
  }, [socket, dispatch, quizId]);

  useEffect(() => () => dispatch({ type: 'RESET' }), [dispatch]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-2xl text-white">❌ {error}</p>
        <Button onClick={() => navigate('/admin/quizzes')}>→ {t('backToQuizzes')}</Button>
      </div>
    );
  }

  if (!state.pin || phase !== 'ready') {
    return <LoadingSpinner fullScreen text={phase === 'resuming' ? t('resumingGame') : t('creatingGame')} />;
  }

  if (state.status === 'lobby') return <HostLobby quizId={quizId} />;
  if (state.status === 'countdown') return <Countdown text={t('getReady')} />;
  if (state.status === 'finished') return <HostResults quizId={quizId} />;
  return <HostGameView />;
}
