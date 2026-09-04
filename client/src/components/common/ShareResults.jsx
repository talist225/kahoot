import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { getResultsUrl } from '../../utils/urls';
import { t } from '../../i18n';

export default function ShareResults({ pin }) {
  const [copied, setCopied] = useState(false);
  const { settings } = useSettings();
  const url = getResultsUrl(settings, pin);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('resultsLink'), url);
    }
  }

  return (
    <div className="bg-white/10 rounded-xl p-4 text-white text-sm space-y-2">
      <p className="text-white/70">{t('resultsLink')}</p>
      <div className="flex gap-2 items-center">
        <input
          readOnly
          value={url}
          dir="ltr"
          onFocus={(e) => e.target.select()}
          className="flex-1 bg-black/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none"
        />
        <button onClick={copy} className="bg-white text-kahoot-purple font-bold px-4 py-2 rounded-lg hover:bg-gray-100">
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <p className="text-white/50 text-xs">{t('resultsSaved')}</p>
    </div>
  );
}
