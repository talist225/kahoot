import mongoose from 'mongoose';

const playerAnswerSchema = new mongoose.Schema({
  questionIndex: Number,
  answerId: Number,
  timeToAnswer: Number,
  isCorrect: Boolean,
  points: Number,
  answeredAt: { type: Date, default: Date.now },
}, { _id: false });

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true },   // stable id (survives reconnects)
  socketId: String,
  nickname: { type: String, required: true },
  score: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  connected: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now },
  finalRank: { type: Number, default: null },
  answers: [playerAnswerSchema],
}, { _id: false });

const finalResultSchema = new mongoose.Schema({
  playerId: String,
  nickname: String,
  score: Number,
  rank: Number,
  correctAnswers: Number,
  totalQuestions: Number,
  accuracy: Number,
  longestStreak: Number,
}, { _id: false });

const gameSessionSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  quizTitle: { type: String, default: '' },
  totalQuestions: { type: Number, default: 0 },
  hostSocketId: { type: String, default: '' },
  status: { type: String, enum: ['lobby', 'playing', 'finished'], default: 'lobby', index: true },
  locked: { type: Boolean, default: false },
  currentQuestion: { type: Number, default: -1 },
  questionStartedAt: { type: Date, default: null },
  players: [playerSchema],
  finalResults: [finalResultSchema],
  endedBy: { type: String, enum: ['host', 'host-disconnect', 'admin', ''], default: '' },
  startedAt: Date,
  finishedAt: Date,
}, { timestamps: true });

gameSessionSchema.index({ createdAt: -1 });

export default mongoose.model('GameSession', gameSessionSchema);
