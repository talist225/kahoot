import { customAlphabet } from 'nanoid';
import GameSession from '../models/GameSession.js';

const generatePin = customAlphabet('0123456789', 6);

export async function createUniquePin() {
  let pin;
  let exists = true;
  while (exists) {
    pin = generatePin();
    exists = await GameSession.findOne({ pin, status: { $ne: 'finished' } });
  }
  return pin;
}
