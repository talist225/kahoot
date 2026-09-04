import { useEffect, useState, useRef } from 'react';
import { adminAPI, errorMessage } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { t } from '../../i18n';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export default function AdminSettings() {
  const { toast } = useToast();
  const { reload } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    adminAPI.getSettings()
      .then(({ data }) => setForm({ ...data, blockedNicknames: (data.blockedNicknames || []).join(', ') }))
      .catch((err) => toast(errorMessage(err), 'error'));
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        siteName: form.siteName,
        publicUrl: form.publicUrl || '',
        maxPlayers: Number(form.maxPlayers),
        allowLateJoin: !!form.allowLateJoin,
        showLeaderboardBetweenQuestions: !!form.showLeaderboardBetweenQuestions,
        showCorrectAnswerToPlayers: !!form.showCorrectAnswerToPlayers,
        hostReconnectGraceSeconds: Number(form.hostReconnectGraceSeconds),
        blockedNicknames: String(form.blockedNicknames || '').split(',').map((s) => s.trim()).filter(Boolean),
      };
      const { data } = await adminAPI.updateSettings(payload);
      setForm({ ...data, blockedNicknames: (data.blockedNicknames || []).join(', ') });
      toast(t('settingsSaved'), 'success');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function exportBackup() {
    setExporting(true);
    try {
      const { data } = await adminAPI.export();
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kahoot-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  }

  if (!form) return <LoadingSpinner />;

  const input = 'w-full bg-white/10 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-white/40';

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-black text-white">{t('settings')}</h1>

      <form onSubmit={save} className="bg-white/10 rounded-xl p-6 space-y-6">
        <Field label={t('siteName')} help={t('siteNameHelp')}>
          <input className={input} value={form.siteName} onChange={(e) => set('siteName', e.target.value)} maxLength={30} />
        </Field>

        <Field label={t('publicUrl')} help={t('publicUrlHelp')}>
          <input className={`${input} text-left`} dir="ltr" placeholder="https://quiz.example.com" value={form.publicUrl || ''} onChange={(e) => set('publicUrl', e.target.value)} />
        </Field>

        <Field label={t('maxPlayers')}>
          <input type="number" min={1} max={1000} className={`${input} ltr-nums`} value={form.maxPlayers} onChange={(e) => set('maxPlayers', e.target.value)} />
        </Field>

        <Toggle label={t('allowLateJoin')} help={t('allowLateJoinHelp')} checked={!!form.allowLateJoin} onChange={(v) => set('allowLateJoin', v)} />
        <Toggle label={t('showLeaderboardBetweenQuestions')} checked={!!form.showLeaderboardBetweenQuestions} onChange={(v) => set('showLeaderboardBetweenQuestions', v)} />
        <Toggle label={t('showCorrectAnswerToPlayers')} checked={!!form.showCorrectAnswerToPlayers} onChange={(v) => set('showCorrectAnswerToPlayers', v)} />

        <Field label={t('hostReconnectGrace')} help={t('hostReconnectGraceHelp')}>
          <input type="number" min={0} max={300} className={`${input} ltr-nums`} value={form.hostReconnectGraceSeconds} onChange={(e) => set('hostReconnectGraceSeconds', e.target.value)} />
        </Field>

        <Field label={t('blockedNicknames')} help={t('blockedNicknamesHelp')}>
          <textarea rows={3} className={input} value={form.blockedNicknames} onChange={(e) => set('blockedNicknames', e.target.value)} />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" variant="success" disabled={saving}>💾 {t('saveSettings')}</Button>
        </div>
      </form>

      {/* Bubbles Section */}
      <BubblesSection form={form} set={set} toast={toast} reload={reload} />

      <div className="bg-white/10 rounded-xl p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-white font-bold">{t('exportBackup')}</p>
          <p className="text-white/50 text-sm">{t('quizzes')} + {t('games')} + {t('settings')}</p>
        </div>
        <Button variant="secondary" onClick={exportBackup} disabled={exporting}>⬇ {t('export')}</Button>
      </div>

      <p className="text-white/40 text-xs">{t('adminPasswordNote')}</p>
    </div>
  );
}

function Field({ label, help, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-white font-semibold">{label}</span>
      {children}
      {help && <span className="block text-white/50 text-xs">{help}</span>}
    </label>
  );
}

function Toggle({ label, help, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${checked ? 'bg-kahoot-green' : 'bg-white/20'}`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'start-6' : 'start-1'}`} />
      </button>
      <span>
        <span className="text-white font-semibold block">{label}</span>
        {help && <span className="text-white/50 text-xs">{help}</span>}
      </span>
    </label>
  );
}

function BubblesSection({ form, set, toast, reload }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const images = form.bubbleImages || [];

  async function toggleBubbles() {
    try {
      const next = !form.bubblesEnabled;
      set('bubblesEnabled', next);
      await adminAPI.updateSettings({ bubblesEnabled: next });
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    if (file.size > MAX_IMAGE_SIZE) {
      toast(t('bubbleImageTooLarge'), 'error');
      return;
    }
    if (images.length >= 20) {
      toast(t('maxBubbleImages'), 'error');
      return;
    }

    setUploading(true);
    try {
      const dataUri = await fileToDataUri(file);
      await adminAPI.uploadBubbleImage(dataUri);
      const { data } = await adminAPI.getSettings();
      set('bubbleImages', data.bubbleImages || []);
      reload();
      toast('✓', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(index) {
    setDeleting(index);
    try {
      await adminAPI.deleteBubbleImage(index);
      const { data } = await adminAPI.getSettings();
      set('bubbleImages', data.bubbleImages || []);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="bg-white/10 rounded-xl p-6 space-y-5">
      <h2 className="text-xl font-bold text-white">🫧 {t('bubblesEnabled')}</h2>

      <Toggle
        label={t('bubblesEnabled')}
        help={t('bubblesEnabledHelp')}
        checked={!!form.bubblesEnabled}
        onChange={toggleBubbles}
      />

      <Field label={t('bubbleCount')} help={t('bubbleCountHelp')}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={50}
            value={form.bubbleCount || 18}
            onChange={(e) => set('bubbleCount', Number(e.target.value))}
            className="flex-1 accent-kahoot-green"
          />
          <span className="text-white font-bold text-lg ltr-nums w-10 text-center">{form.bubbleCount || 18}</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await adminAPI.updateSettings({ bubbleCount: form.bubbleCount || 18 });
                reload();
                toast(t('settingsSaved'), 'success');
              } catch (err) { toast(errorMessage(err), 'error'); }
            }}
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg transition"
          >
            💾
          </button>
        </div>
      </Field>

      <div className="space-y-3">
        <p className="text-white font-semibold">{t('bubbleImages')}</p>
        <p className="text-white/50 text-xs">{t('bubbleImagesHelp')}</p>

        {images.length === 0 && (
          <p className="text-white/40 text-sm italic">{t('noBubbleImages')}</p>
        )}

        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={i} className="relative group w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(i)}
                disabled={deleting === i}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xl"
                title={t('deleteImage')}
              >
                {deleting === i ? '⏳' : '✕'}
              </button>
            </div>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/20 transition rounded-lg px-4 py-2 text-white text-sm font-semibold">
          {uploading ? (
            <span>⏳ {t('uploading')}</span>
          ) : (
            <>
              <span>📷 {t('uploadImage')}</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </>
          )}
        </label>

        <p className="text-white/30 text-xs ltr-nums">{images.length} / 20</p>
      </div>
    </div>
  );
}

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
