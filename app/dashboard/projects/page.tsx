'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project } from '../components/DashboardSidebar';

const LANG_COLORS: Record<string, string> = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3776ab',
  rust: '#ce412b', go: '#00add8', html: '#e34f26', css: '#1572b6',
};

const LANG_LABELS: Record<string, string> = {
  javascript: 'JS', typescript: 'TS', python: 'PY', rust: 'RS', go: 'GO', html: 'HTML', css: 'CSS',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [lang, setLang] = useState('javascript');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('nexios-projects');
    if (saved) { try { setProjects(JSON.parse(saved)); } catch { /* ignore */ } }
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4'];
    const defaultContent: Record<string, string> = {
      javascript: '// Hello World\nconsole.log("Hello, World!");\n',
      typescript: '// Hello World\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);\n',
      python: '# Hello World\nprint("Hello, World!")\n',
      rust: 'fn main() {\n    println!("Hello, World!");\n}\n',
      go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
      html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n',
      css: '/* Styles */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n',
    };
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const project: Project = {
      id, name: name.trim(), description: desc.trim(), language: lang,
      color: colors[projects.length % colors.length],
      files: [{ id: id + '_0', name: `main.${lang === 'typescript' ? 'ts' : lang === 'python' ? 'py' : lang === 'rust' ? 'rs' : lang === 'go' ? 'go' : lang}`, content: defaultContent[lang] || '', language: lang }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const updated = [project, ...projects];
    setProjects(updated);
    localStorage.setItem('nexios-projects', JSON.stringify(updated));
    setName(''); setDesc(''); setLang('javascript'); setShowNew(false);
    router.push(`/dashboard/sandbox/${id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this project?')) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem('nexios-projects', JSON.stringify(updated));
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Projects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Code sandboxes with AI-powered debugging</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <div className="rounded-2xl border p-6 animate-slideDown" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Create New Project</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text2)' }}>Project Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="My awesome project"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-colors focus:border-blue-500"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text2)' }}>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this project do?"
                className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-colors focus:border-blue-500"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text2)' }}>Language</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(LANG_LABELS).map(([id, label]) => (
                  <button key={id} onClick={() => setLang(id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all
                      ${lang === id ? 'border-blue-500 bg-blue-500/10 text-blue-500' : ''}
                    `}
                    style={{ borderColor: lang === id ? undefined : 'var(--border)', color: lang === id ? undefined : 'var(--text2)', background: lang === id ? undefined : 'var(--bg)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[id] }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors">
                Create & Open
              </button>
              <button onClick={() => setShowNew(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} href={`/dashboard/sandbox/${project.id}`}
              className="group rounded-2xl border p-5 hover:shadow-lg transition-all hover:scale-[1.01] relative"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
                  style={{ background: project.color }}>
                  {LANG_LABELS[project.language] || '?'}
                </div>
                <button onClick={e => handleDelete(project.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
              <h3 className="text-sm font-bold mb-1 group-hover:text-blue-500 transition-colors truncate" style={{ color: 'var(--text)' }}>{project.name}</h3>
              {project.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text2)' }}>{project.description}</p>}
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text3)' }}>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: LANG_COLORS[project.language] || '#888' }} />
                  {project.language}
                </span>
                <span>{project.files.length} file{project.files.length !== 1 ? 's' : ''}</span>
                <span className="ml-auto">{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: project.color }} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'var(--bg2)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8" style={{ color: 'var(--text3)' }}>
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>No projects yet</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>Create a sandbox to test code with AI assistance</p>
          <button onClick={() => setShowNew(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors">
            Create first project
          </button>
        </div>
      )}
    </div>
  );
}
