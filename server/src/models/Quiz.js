import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
  color: { type: String, enum: ['red', 'blue', 'yellow', 'green'], required: true },
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  image: { type: String, default: '' },
  timeLimit: { type: Number, default: 20, enum: [5, 10, 20, 30, 60, 90, 120] },
  points: { type: Number, default: 1000 },
  answers: {
    type: [answerSchema],
    validate: {
      validator: (v) => v.length >= 2 && v.length <= 4,
      message: 'Each question must have 2-4 answers',
    },
  },
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  questions: {
    type: [questionSchema],
    validate: {
      validator: (v) => v.length >= 1,
      message: 'Quiz must have at least 1 question',
    },
  },
  timesPlayed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Quiz', quizSchema);
