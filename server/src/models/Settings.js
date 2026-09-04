import mongoose from 'mongoose';

// Singleton document holding admin-controlled game settings.
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  siteName: { type: String, default: 'קהוט!' },
  publicUrl: { type: String, default: '' },                    // e.g. https://quiz.example.com — used for QR links
  maxPlayers: { type: Number, default: 100, min: 1, max: 1000 },
  allowLateJoin: { type: Boolean, default: false },            // join while game is playing
  showLeaderboardBetweenQuestions: { type: Boolean, default: true },
  showCorrectAnswerToPlayers: { type: Boolean, default: true },
  blockedNicknames: { type: [String], default: [] },
  hostReconnectGraceSeconds: { type: Number, default: 30, min: 0, max: 300 },
  bubblesEnabled: { type: Boolean, default: false },
  bubbleCount: { type: Number, default: 18, min: 1, max: 50 },
  bubbleImages: { type: [String], default: [] },               // data-URIs or URLs for bubble backgrounds
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

export const PUBLIC_SETTINGS_FIELDS = ['siteName', 'publicUrl', 'maxPlayers', 'allowLateJoin', 'showLeaderboardBetweenQuestions', 'bubblesEnabled', 'bubbleCount', 'bubbleImages'];

export async function getSettings() {
  let doc = await Settings.findOne({ key: 'global' });
  if (!doc) doc = await Settings.create({ key: 'global' });
  return doc;
}

export default Settings;
