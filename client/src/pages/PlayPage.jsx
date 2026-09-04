import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { playerSession } from '../utils/storage';
import { t } from '../i18n';
import JoinGame from '../components/player/JoinGame';
import PlayerLobby from '../components/player/PlayerLobby';
import PlayerGameView from '../components/player/PlayerGameView';
import PlayerResults from '../components/player/PlayerResults';
import Countdown from '../components/common/Countdown';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

export default function PlayPage() {
  const { socket, connected } = useSocket();
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const urlPin = (params.pin || searchParams.get('pin') || '').replace(/\D/g, '').slice(0, 6);

  const stateRef = useRef(state);
  stateRef.current = state;

  const [rejoining, setRejoining] = useState(() => {
    const saved = playerSession.get();
    return !!(saved?.pin && saved?.playerId && (!urlPin || urlPin === saved.pin));
  });

  // Try to re-attach to a previous session (refresh / reconnect).
  useEffect(() => {
    if (!socket || !connected) return;
    const s = stateRef.current;
    if (s.role === 'player' && s.pin && s.playerId) {
      socket.emit('player:rejoin', { pin: s.pin, playerId: s.playerId });
      return;
    }
    const saved = playerSession.get();
    if (saved?.pin && saved?.playerId && (!urlPin || urlPin === saved.pin)) {
      setRejoining(true);
      socket.emit('player:rejoin', { pin: saved.pin, playerId: saved.playerId });
    } else {
      setRejoining(false);
    }
  }, [socket, connected]);

  useEffect(() => {
    if (!socket) return;

    const handlers = {
      'join:success': (data) => {
        dispatch({ type: 'SET_PLAYER', ...data });
        playerSession.set({ pin: data.pin, playerId: data.playerId, nickname: data.nickname });
        setRejoining(false);
        if (data.rejoined) toast(t('reconnectedToGame'), 'success', 2000);
      },
      'join:error': (data) => {
        toast(data.message, 'error');
        setRejoining(false);
      },
      'rejoin:failed': () => {
        playerSession.clear();
        setRejoining(false);
        if (stateRef.current.role === 'player') dispatch({ type: 'RESET' });
      },
      'game:state': (s) => dispatch({ type: 'RESTORE_PLAYER_STATE', state: s }),
      'game:started': () => dispatch({ type: 'GAME_STARTED' }),
      'question:show': (data) => {
        dispatch({ type: 'SHOW_QUESTION', question: data, index: data.index, total: data.total, timeLimit: data.timeLimit });
      },
      'answer:result': (data) => dispatch({ type: 'ANSWER_RESULT', result: data }),
      'question:timeout': () => dispatch({ type: 'QUESTION_TIMEOUT' }),
      'question:ended': (data) => dispatch({ type: 'QUESTION_REVEALED', revealed: data }),
      'leaderboard:show': (data) => dispatch({ type: 'SHOW_LEADERBOARD', leaderboard: data }),
      'game:finished': (data) => dispatch({ type: 'GAME_FINISHED', results: data }),
      'game:cancelled': (data) => {
        playerSession.clear();
        dispatch({ type: 'GAME_CANCELLED', reason: data?.reason });
      },
      'player:kicked': () => {
        playerSession.clear();
        dispatch({ type: 'RESET' });
        toast(t('removedFromGame'), 'warning');
      },
      'host:disconnected': () => dispatch({ type: 'HOST_AWAY', away: true }),
      'host:reconnected': () => {
        dispatch({ type: 'HOST_AWAY', away: false });
        toast(t('hostReconnected'), 'success', 2000);
      },
    };

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
  }, [socket, dispatch, toast]);

  // Leaving the page entirely resets local game state (session stays in storage for rejoin).
  useEffect(() => () => dispatch({ type: 'RESET' }), [dispatch]);

  if (rejoining && state.status === 'idle') {
    return <LoadingSpinner fullScreen text={t('reconnecting')} />;
  }

  if (state.status === 'cancelled') {
    const reasonText = state.cancelReason === 'admin' ? t('gameCancelledByAdmin')
      : state.cancelReason === 'host-disconnect' ? t('hostDisconnected') : t('gameCancelled');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 text-center">
        <div className="text-7xl">😕</div>
        <h1 className="text-3xl font-black text-white">{reasonText}</h1>
        <Button onClick={() => { dispatch({ type: 'RESET' }); navigate('/'); }}>🏠 {t('backToHome')}</Button>
      </div>
    );
  }

  if (state.status === 'idle') return <JoinGame initialPin={urlPin} />;
  if (state.status === 'lobby') return <PlayerLobby />;
  if (state.status === 'countdown') return <Countdown text={t('getReady')} />;
  if (state.status === 'finished') return <PlayerResults />;
  return <PlayerGameView />;
}
