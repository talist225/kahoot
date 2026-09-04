import Quiz from '../models/Quiz.js';
import { validateQuiz } from '../utils/validators.js';

export async function getAllQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find()
      .select('title description createdAt updatedAt questions timesPlayed')
      .sort({ createdAt: -1 });
    const result = quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      description: q.description,
      questionCount: q.questions.length,
      timesPlayed: q.timesPlayed || 0,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getQuizById(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'החידון לא נמצא' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createQuiz(req, res) {
  try {
    const errors = validateQuiz(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const quiz = await Quiz.create(req.body);
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateQuiz(req, res) {
  try {
    const errors = validateQuiz(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!quiz) return res.status(404).json({ error: 'החידון לא נמצא' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteQuiz(req, res) {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'החידון לא נמצא' });
    res.json({ message: 'החידון נמחק' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function duplicateQuiz(req, res) {
  try {
    const source = await Quiz.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ error: 'החידון לא נמצא' });
    const { _id, createdAt, updatedAt, timesPlayed, __v, ...rest } = source;
    const copy = await Quiz.create({
      ...rest,
      title: `${source.title} (עותק)`,
      questions: rest.questions.map(({ _id: qid, ...q }) => ({
        ...q,
        answers: q.answers.map(({ _id: aid, ...a }) => a),
      })),
    });
    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function importQuizzes(req, res) {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body?.quizzes;
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ error: 'לא נמצאו חידונים לייבוא' });
    }
    const created = [];
    const errors = [];
    for (const [i, raw] of list.entries()) {
      const { _id, createdAt, updatedAt, timesPlayed, __v, ...data } = raw || {};
      const validationErrors = validateQuiz(data);
      if (validationErrors.length) {
        errors.push({ index: i, errors: validationErrors });
        continue;
      }
      data.questions = data.questions.map(({ _id: qid, ...q }) => ({
        ...q,
        answers: q.answers.map(({ _id: aid, ...a }) => a),
      }));
      created.push(await Quiz.create(data));
    }
    res.status(201).json({ created: created.length, errors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
