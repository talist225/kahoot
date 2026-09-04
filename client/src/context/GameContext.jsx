import { createContext, useContext, useReducer } from 'react';

const GameContext = createContext(null);

const initialState = {
  role: null, // 'host' | 'player'
  pin: null,
  playerId: null,
  nickname: '',
  gameTitle: '',
  players: [],
  // 'idle' | 'lobby' | 'countdown' | 'question' | 'results' | 'leaderboard' | 'finished' | 'cancelled'
  status: 'idle',
  inProgress: false,      // player joined late, waiting for next question
  hostAway: false,        // host temporarily disconnected
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 0,
  timeLimit: 0,
  answeredCount: 0,
  selectedAnswer: null,
  answerResult: null,     // { correct, points, rank, score, streak, timedOut }
  questionResults: null,  // host: { answerCounts, correctAnswerIndex, correctCount, totalPlayers }
  revealed: null,         // player: { correctAnswerIndex, answerCounts }
  leaderboard: null,      // { top5, players }
  finalResults: null,     // { podium, fullResults, pin, title }
  locked: false,
  cancelReason: null,
  myScore: 0,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_HOST':
      return { ...state, role: 'host', pin: action.pin, gameTitle: action.title || state.gameTitle, status: 'lobby' };
    case 'SET_PLAYER':
      return {
        ...state,
        role: 'player',
        pin: action.pin,
        playerId: action.playerId ?? state.playerId,
        nickname: action.nickname ?? state.nickname,
        gameTitle: action.gameTitle ?? state.gameTitle,
        inProgress: !!action.inProgress,
        status: state.status === 'idle' || state.status === 'lobby' ? 'lobby' : state.status,
      };
    case 'PLAYER_JOINED':
    case 'PLAYER_LIST':
      return { ...state, players: action.players };
    case 'PLAYER_DISCONNECTED':
      return {
        ...state,
        players: action.players ?? state.players.filter((p) => p.nickname !== action.nickname),
      };
    case 'GAME_STARTED':
      return { ...state, status: 'countdown', inProgress: false };
    case 'SHOW_QUESTION':
      return {
        ...state,
        status: 'question',
        inProgress: false,
        currentQuestion: action.question,
        questionIndex: action.index,
        totalQuestions: action.total,
        timeLimit: action.timeLimit,
        answeredCount: 0,
        selectedAnswer: null,
        answerResult: null,
        questionResults: null,
        revealed: null,
        leaderboard: null,
      };
    case 'SELECT_ANSWER':
      return { ...state, selectedAnswer: action.answerId };
    case 'ANSWER_RECEIVED':
      return { ...state, answeredCount: action.count };
    case 'ANSWER_RESULT':
      return {
        ...state,
        answerResult: action.result,
        myScore: action.result?.score ?? state.myScore,
        status: 'results',
      };
    case 'QUESTION_TIMEOUT':
      return { ...state, status: state.status === 'question' ? 'results' : state.status };
    case 'QUESTION_RESULTS':
      return { ...state, questionResults: action.results, status: 'results' };
    case 'QUESTION_REVEALED':
      return { ...state, revealed: action.revealed };
    case 'SHOW_LEADERBOARD':
      return { ...state, leaderboard: action.leaderboard, status: 'leaderboard' };
    case 'GAME_FINISHED':
      return { ...state, finalResults: action.results, status: 'finished', hostAway: false };
    case 'GAME_CANCELLED':
      return { ...state, status: 'cancelled', cancelReason: action.reason };
    case 'GAME_LOCK_TOGGLED':
      return { ...state, locked: action.locked };
    case 'HOST_AWAY':
      return { ...state, hostAway: action.away };
    case 'RESTORE_HOST_STATE': {
      const s = action.state;
      const next = {
        ...state,
        role: 'host',
        pin: s.pin,
        gameTitle: s.title || state.gameTitle,
        players: s.players || [],
        locked: !!s.locked,
        status: s.status === 'lobby' ? 'lobby' : s.status === 'finished' ? 'finished' : 'question',
      };
      if (s.question) {
        next.currentQuestion = s.question;
        next.questionIndex = s.question.index;
        next.totalQuestions = s.question.total;
        next.timeLimit = s.question.remaining ?? s.question.timeLimit;
        next.answeredCount = s.answeredCount || 0;
        if (s.questionEnded && s.results) {
          next.questionResults = s.results;
          next.status = 'results';
        }
      }
      if (s.finalResults) next.finalResults = s.finalResults;
      return next;
    }
    case 'RESTORE_PLAYER_STATE': {
      const s = action.state;
      const next = { ...state, role: 'player', nickname: s.nickname || state.nickname, myScore: s.score ?? state.myScore };
      if (s.status === 'lobby') next.status = 'lobby';
      if (s.status === 'finished') {
        next.status = 'finished';
        next.finalResults = s.finalResults;
      }
      if (s.status === 'playing') {
        if (s.question) {
          next.currentQuestion = s.question;
          next.questionIndex = s.question.index;
          next.totalQuestions = s.question.total;
          next.timeLimit = s.question.remaining ?? s.question.timeLimit;
          next.selectedAnswer = s.answered ? s.answerId : null;
          next.answerResult = s.answerResult || null;
          next.status = s.answerResult ? 'results' : s.questionEnded && !s.answered ? 'results' : 'question';
          if (s.questionEnded && !s.answered && !s.answerResult) {
            next.answerResult = { correct: false, points: 0, rank: 0, timedOut: true, score: s.score };
          }
        } else {
          next.status = 'lobby';
          next.inProgress = true;
        }
      }
      return next;
    }
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
