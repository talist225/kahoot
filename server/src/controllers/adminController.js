import Quiz from '../models/Quiz.js';
import GameSession from '../models/GameSession.js';
import { getSettings } from '../models/Settings.js';
import { checkPassword, issueToken } from '../middleware/adminAuth.js';
import { forceEndGame, kickPlayer, getIO } from '../socket/gameLogic.js';

export async function login(req, res) {
  const { password } = req.body || {};
  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'סיסמה שגויה' });
  }
  res.json(issueToken());
}

export async function verify(req, res) {
  res.json({ ok: true });
}

export async function getStats(req, res) {
  try {
    const [quizCount, totalGames, activeGames, finishedGames, playersAgg, recentGames, topQuizzes] = await Promise.all([
      Quiz.countDocuments(),
      GameSession.countDocuments(),
      GameSession.countDocuments({ status: { $in: ['lobby', 'playing'] } }),
      GameSession.countDocuments({ status: 'finished' }),
      GameSession.aggregate([
        { $project: { count: { $size: '$players' } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ]),
      GameSession.find().sort({ createdAt: -1 }).limit(5)
        .select('pin quizTitle status players createdAt finishedAt')
        .lean(),
      GameSession.aggregate([
        { $match: { status: 'finished' } },
        { $group: { _id: '$quizId', title: { $first: '$quizTitle' }, plays: { $sum: 1 }, players: { $sum: { $size: '$players' } } } },
        { $sort: { plays: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const gamesLast7Days = await GameSession.countDocuments({ createdAt: { $gte: last7 } });

    res.json({
      quizCount,
      totalGames,
      activeGames,
      finishedGames,
      totalPlayers: playersAgg[0]?.total || 0,
      gamesLast7Days,
      recentGames: recentGames.map((g) => ({
        _id: g._id,
        pin: g.pin,
        quizTitle: g.quizTitle,
        status: g.status,
        playerCount: g.players?.length || 0,
        createdAt: g.createdAt,
        finishedAt: g.finishedAt,
      })),
      topQuizzes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listGames(req, res) {
  try {
    const { status, page = 1, limit = 20, search = '' } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      if (status === 'active') filter.status = { $in: ['lobby', 'playing'] };
      else filter.status = status;
    }
    if (search) {
      filter.$or = [
        { pin: { $regex: search, $options: 'i' } },
        { quizTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      GameSession.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('pin quizId quizTitle status locked currentQuestion totalQuestions players createdAt startedAt finishedAt endedBy')
        .lean(),
      GameSession.countDocuments(filter),
    ]);

    res.json({
      items: items.map((g) => ({
        _id: g._id,
        pin: g.pin,
        quizId: g.quizId,
        quizTitle: g.quizTitle,
        status: g.status,
        locked: g.locked,
        currentQuestion: g.currentQuestion,
        totalQuestions: g.totalQuestions,
        playerCount: g.players?.length || 0,
        connectedCount: g.players?.filter((p) => p.connected).length || 0,
        createdAt: g.createdAt,
        startedAt: g.startedAt,
        finishedAt: g.finishedAt,
        endedBy: g.endedBy,
      })),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getGame(req, res) {
  try {
    const game = await GameSession.findById(req.params.id).lean();
    if (!game) return res.status(404).json({ error: 'המשחק לא נמצא' });
    const quiz = await Quiz.findById(game.quizId).lean();

    const sorted = [...(game.players || [])].sort((a, b) => b.score - a.score);
    res.json({
      ...game,
      quiz: quiz ? { _id: quiz._id, title: quiz.title, questions: quiz.questions } : null,
      players: sorted.map((p, i) => ({ ...p, rank: i + 1 })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteGame(req, res) {
  try {
    const game = await GameSession.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'המשחק לא נמצא' });
    if (game.status !== 'finished') {
      await forceEndGame(getIO(), game.pin, 'admin');
    }
    await GameSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'המשחק נמחק' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function endGame(req, res) {
  try {
    const game = await GameSession.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'המשחק לא נמצא' });
    if (game.status === 'finished') return res.status(400).json({ error: 'המשחק כבר הסתיים' });
    await forceEndGame(getIO(), game.pin, 'admin');
    res.json({ message: 'המשחק הסתיים' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function kickPlayerFromGame(req, res) {
  try {
    const game = await GameSession.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'המשחק לא נמצא' });
    const { playerId } = req.body || {};
    const ok = await kickPlayer(getIO(), game.pin, { playerId });
    if (!ok) return res.status(404).json({ error: 'השחקן לא נמצא' });
    res.json({ message: 'השחקן הוסר' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function clearFinishedGames(req, res) {
  try {
    const { olderThanDays } = req.body || {};
    const filter = { status: 'finished' };
    if (olderThanDays) {
      filter.finishedAt = { $lt: new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000) };
    }
    const result = await GameSession.deleteMany(filter);
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAdminSettings(req, res) {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateAdminSettings(req, res) {
  try {
    const settings = await getSettings();
    const allowed = [
      'siteName', 'publicUrl', 'maxPlayers', 'allowLateJoin', 'showLeaderboardBetweenQuestions',
      'showCorrectAnswerToPlayers', 'blockedNicknames', 'hostReconnectGraceSeconds',
      'bubblesEnabled', 'bubbleCount', 'bubbleImages',
    ];
    for (const key of allowed) {
      if (key in req.body) settings[key] = req.body[key];
    }
    if (typeof settings.publicUrl === 'string') {
      settings.publicUrl = settings.publicUrl.trim().replace(/\/+$/, '');
    }
    if (Array.isArray(settings.bubbleImages)) {
      // Keep only valid data-URIs and http(s) URLs, limit to 20 images
      settings.bubbleImages = settings.bubbleImages
        .filter((s) => typeof s === 'string' && (s.startsWith('data:image/') || /^https?:\/\//i.test(s)))
        .slice(0, 20);
    }
    if (Array.isArray(settings.blockedNicknames)) {
      settings.blockedNicknames = settings.blockedNicknames
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean);
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const MAX_BUBBLE_IMAGES = 20;
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per image

/**
 * Upload a bubble image. Accepts JSON body: { dataUri: "data:image/..." }
 * Stores as base64 data URI in the settings document.
 */
export async function uploadBubbleImage(req, res) {
  try {
    const { dataUri } = req.body || {};
    if (!dataUri || typeof dataUri !== 'string') {
      return res.status(400).json({ error: 'נדרש שדה dataUri' });
    }
    if (!dataUri.startsWith('data:image/')) {
      return res.status(400).json({ error: 'הקובץ חייב להיות תמונה (data:image/...)' });
    }
    if (Buffer.byteLength(dataUri, 'utf8') > MAX_IMAGE_SIZE_BYTES * 1.4) {
      return res.status(400).json({ error: 'התמונה גדולה מדי (מקסימום 2MB)' });
    }

    const settings = await getSettings();
    if ((settings.bubbleImages?.length || 0) >= MAX_BUBBLE_IMAGES) {
      return res.status(400).json({ error: `ניתן להעלות עד ${MAX_BUBBLE_IMAGES} תמונות` });
    }

    settings.bubbleImages.push(dataUri);
    await settings.save();
    res.json({ index: settings.bubbleImages.length - 1, total: settings.bubbleImages.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteBubbleImage(req, res) {
  try {
    const index = parseInt(req.params.index, 10);
    const settings = await getSettings();
    if (isNaN(index) || index < 0 || index >= (settings.bubbleImages?.length || 0)) {
      return res.status(404).json({ error: 'התמונה לא נמצאה' });
    }
    settings.bubbleImages.splice(index, 1);
    await settings.save();
    res.json({ total: settings.bubbleImages.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function exportData(req, res) {
  try {
    const [quizzes, games, settings] = await Promise.all([
      Quiz.find().lean(),
      GameSession.find().lean(),
      getSettings(),
    ]);
    res.setHeader('Content-Disposition', `attachment; filename="kahoot-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({ exportedAt: new Date(), quizzes, games, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
