'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project } from '../components/DashboardSidebar';

const LANG_COLORS: Record<string, string> = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3776ab',
  rust: '#ce412b', go: '#00add8', html: '#e34f26', css: '#1572b6',
};
const LANG_LABELS: Record<string, string> = {
  javascript: 'JS', typescript: 'TS', python: 'PY',
  rust: 'RS', go: 'GO', html: 'HTML', css: 'CSS',
};
const DEFAULT_CONTENT: Record<string, string> = {
  javascript: '// Hello World\nconsole.log("Hello, World!");\n',
  typescript: 'const greeting: string = "Hello, World!";\nconsole.log(greeting);\n',
  python: '# Hello World\nprint("Hello, World!")\n',
  rust: 'fn main() {\n    println!("Hello, World!");\n}\n',
  go: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
  html: '<!DOCTYPE html>\n<html>\n<head><title>My Page</title></head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n',
  css: '/* Styles */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n',
};

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [lang, setLang] = useState('javascript');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('nexios-projects');
    if (saved) { try { setProjects(JSON.parse(saved)); } catch { /* ignore */ } }
  }, []);

  const saveProjects = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem('nexios-projects', JSON.stringify(updated));
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4'];
    const ext: Record<string, string> = { javascript: 'js', typescript: 'ts', python: 'py', rust: 'rs', go: 'go', html: 'html', css: 'css' };
    const id = genId();
    const project: Project = {
      id, name: name.trim(), description: desc.trim(), language: lang,
      color: colors[projects.length % colors.length],
      files: [{ id: genId(), name: `main.${ext[lang] || lang}`, content: DEFAULT_CONTENT[lang] || '', language: lang }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    saveProjects([project, ...projects]);
    setName(''); setDesc(''); setLang('javascript'); setShowNew(false);
    router.push(`/dashboard/sandbox/${project.id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this project?')) return;
    saveProjects(projects.filter(p => p.id !== id));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let importedProject: Partial<Project> | null = null;
      if (file.name.endsWith('.json')) {
        importedProject = JSON.parse(text);
      } else {
        const ext = file.name.split('.').pop() || 'js';
        const langMap: Record<string, string> = { js: 'javascript', ts: 'typescript', py: 'python', rs: 'rust', go: 'go', html: 'html', css: 'css' };
        const detectedLang = langMap[ext] || 'javascript';
        const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'];
        importedProject = {
          name: file.name.replace(/\.[^/.]+$/, ''),
          description: `Imported from ${file.name}`,
          language: detectedLang,
          color: colors[projects.length % colors.length],
          files: [{ id: genId(), name: file.name, content: text, language: detectedLang }],
        };
      }
      if (!importedProject || !importedProject.files) throw new Error('Invalid project file');
      const project: Project = {
        id: genId(),
        name: importedProject.name || file.name.replace(/\.[^/.]+$/, ''),
        description: importedProject.description || '',
        language: importedProject.language || 'javascript',
        color: importedProject.color || '#3b82f6',
        files: importedProject.files.map(f => ({ ...f, id: genId() })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveProjects([project, ...projects]);
      router.push(`/dashboard/sandbox/${project.id}`);
    } catch {
      alert('Failed to import. Make sure it\'s a valid project JSON or code file.');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const filtered = projects.filter(p =>
    search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.language.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>VS Code-like code sandboxes with AI assistance</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importRef} type="file" accept=".json,.js,.ts,.py,.rs,.go,.html,.css" className="hidden" onChange={handleImport} />
          <button onClick={() => importRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)', opacity: importing ? 0.7 : 1 }}>
            {importing ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            )}
            Import
          </button>
          <button onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md"
            style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </div>
      </div>

      {/* Search */}
      {projects.length > 3 && (
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text3)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
            className="input-field pl-10" style={{ maxWidth: 360 }} />
        </div>
      )}

      {/* New project form */}
      {showNew && (
        <div className="rounded-2xl border p-5 animate-slideDown card-surface">
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>New Project</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="My awesome project"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="input-field" autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this project do?"
                className="input-field" />
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Language</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {Object.entries(LANG_LABELS).map(([id, label]) => (
                  <button key={id} onClick={() => setLang(id)}
                    className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-semibold border transition-all"
                    style={{
                      borderColor: lang === id ? LANG_COLORS[id] + '80' : 'var(--border)',
                      background: lang === id ? LANG_COLORS[id] + '15' : 'var(--bg)',
                      color: lang === id ? LANG_COLORS[id] : 'var(--text2)',
                    }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: LANG_COLORS[id] }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={!name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md"
                style={{ background: name.trim() ? 'linear-gradient(135deg, #5b78ff, #8b5cf6)' : 'var(--text3)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
                Create & Open
              </button>
              <button onClick={() => setShowNew(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all border"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <Link key={project.id} href={`/dashboard/sandbox/${project.id}`}
              className="group rounded-2xl border p-5 hover:shadow-lg transition-all hover:scale-[1.01] relative overflow-hidden"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = project.color + '60'); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); }}>
              {/* Color bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 transition-opacity opacity-0 group-hover:opacity-100" style={{ background: project.color }} />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${project.color}, ${project.color}99)` }}>
                  {LANG_LABELS[project.language] || '?'}
                </div>
                <button onClick={e => handleDelete(project.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all text-red-400"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
              <h3 className="text-sm font-bold mb-1 truncate transition-colors" style={{ color: 'var(--text)' }}>{project.name}</h3>
              {project.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text2)' }}>{project.description}</p>}
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text3)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[project.language] || '#888' }} />
                  {project.language}
                </span>
                <span>{project.files.length} file{project.files.length !== 1 ? 's' : ''}</span>
                <span className="ml-auto">{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl mb-5 flex items-center justify-center" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-9 h-9" style={{ color: 'var(--text3)' }}>
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-1.5" style={{ color: 'var(--text)' }}>
            {search ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
            {search ? `Try searching for something else` : 'Create a sandbox to code with AI assistance'}
          </p>
          {!search && (
            <div className="flex items-center gap-3">
              <button onClick={() => setShowNew(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md"
                style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
                Create first project
              </button>
              <button onClick={() => importRef.current?.click()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg2)' }}>
                Import file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
