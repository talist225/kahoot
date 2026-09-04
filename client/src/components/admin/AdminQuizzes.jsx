import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { quizAPI, errorMessage } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { t } from '../../i18n';
import QuizList from '../host/QuizList';
import QuizCreator from '../host/QuizCreator';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function QuizListView() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const fileRef = useRef(null);

  async function load() {
    try {
      const { data } = await quizAPI.getAll();
      setQuizzes(data);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(quiz) {
    if (!confirm(t('deleteQuizConfirm', { title: quiz.title }))) return;
    try {
      await quizAPI.delete(quiz._id);
      await load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function handleDuplicate(id) {
    try {
      await quizAPI.duplicate(id);
      await load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function handleExport(id) {
    try {
      const { data } = await quizAPI.getById(id);
      downloadJson(`quiz-${data.title}.json`, [data]);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function handleExportAll() {
    try {
      const full = await Promise.all(quizzes.map((q) => quizAPI.getById(q._id).then((r) => r.data)));
      downloadJson(`quizzes-${new Date().toISOString().slice(0, 10)}.json`, full);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : parsed.quizzes || [parsed];
      const { data } = await quizAPI.import(list);
      toast(t('importSuccess', { count: data.created }), 'success');
      if (data.errors?.length) toast(data.errors.map((x) => x.errors.join(', ')).join(' | '), 'warning', 6000);
      await load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  const filtered = search
    ? quizzes.filter((q) => q.title.toLowerCase().includes(search.toLowerCase()))
    : quizzes;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-white">{t('quizzes')}</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="success" onClick={() => navigate('/admin/quizzes/new')}>+ {t('newQuiz')}</Button>
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>⬆ {t('import')}</Button>
          <Button size="sm" variant="secondary" onClick={handleExportAll} disabled={!quizzes.length}>⬇ {t('export')}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`${t('search')}...`}
        className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white/40"
      />

      <QuizList
        quizzes={filtered}
        loading={loading}
        onEdit={(quiz) => navigate(`/admin/quizzes/${quiz._id}/edit`)}
        onDelete={handleDelete}
        onHost={(id) => navigate(`/host/${id}?new=${Date.now()}`)}
        onDuplicate={handleDuplicate}
        onExport={handleExport}
      />
    </div>
  );
}

function QuizEditorView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    quizAPI.getById(id)
      .then(({ data }) => setQuiz(data))
      .catch((err) => { toast(errorMessage(err), 'error'); navigate('/admin/quizzes'); })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(data) {
    setSaving(true);
    try {
      if (id) await quizAPI.update(id, data);
      else await quizAPI.create(data);
      toast(t('save') + ' ✓', 'success', 1500);
      navigate('/admin/quizzes');
    } catch (err) {
      toast(t('errorSavingQuiz', { message: errorMessage(err) }), 'error', 6000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return <QuizCreator quiz={quiz} onSave={handleSave} onCancel={() => navigate('/admin/quizzes')} saving={saving} />;
}

export default function AdminQuizzes() {
  return (
    <Routes>
      <Route index element={<QuizListView />} />
      <Route path="new" element={<QuizEditorView />} />
      <Route path=":id/edit" element={<QuizEditorView />} />
    </Routes>
  );
}
