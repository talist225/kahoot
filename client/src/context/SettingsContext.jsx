import { createContext, useContext, useEffect, useState } from 'react';
import { settingsAPI } from '../utils/api';
import he from '../i18n/he';

const defaults = { siteName: he.appName, publicUrl: '', lanIp: null, maxPlayers: 100, allowLateJoin: false, showLeaderboardBetweenQuestions: true, bubblesEnabled: false, bubbleCount: 18, bubbleImages: [] };

const SettingsContext = createContext({ settings: defaults, reload: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults);

  async function reload() {
    try {
      const { data } = await settingsAPI.getPublic();
      setSettings({ ...defaults, ...data });
    } catch {
      /* keep defaults – the server may be down */
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (settings.siteName) document.title = `${settings.siteName} – חידונים בזמן אמת`;
  }, [settings.siteName]);

  return (
    <SettingsContext.Provider value={{ settings, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
