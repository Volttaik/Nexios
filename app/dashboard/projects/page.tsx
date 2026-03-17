'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BsCode, BsGithub, BsTrash, BsThreeDotsVertical, BsPlus } from 'react-icons/bs';
import { HiFolder, HiSearch, HiArrowRight, HiLightningBolt, HiX } from 'react-icons/hi';

interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  createdAt: string;
  lastModified: string;
  files: number;
  githubUrl?: string;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#818cf8',
  JavaScript: '#f59e0b',
  Python: '#34d399',
  Rust: '#f87171',
  Go: '#60a5fa',
  HTML: '#fb923c',
  CSS: '#a78bfa',
  Other: '#94a3b8',
};

const SAMPLE_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'my-api-project', description: 'REST API with authentication and rate limiting', language: 'TypeScript', createdAt: '2025-03-15', lastModified: '2h ago', files: 12 },
  { id: 'proj-2', name: 'ml-pipeline', description: 'Machine learning data pipeline with PyTorch', language: 'Python', createdAt: '2025-03-14', lastModified: '1d ago', files: 8 },
  { id: 'proj-3', name: 'react-dashboard', description: 'Analytics dashboard with real-time charts', language: 'JavaScript', createdAt: '2025-03-12', lastModified: '3d ago', files: 24 },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLang, setNewLang] = useState('TypeScript');
  const [githubUrl, setGithubUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nexios_projects');
    if (saved) {
      setProjects(JSON.parse(saved));
    } else {
      setProjects(SAMPLE_PROJECTS);
      localStorage.setItem('nexios_projects', JSON.stringify(SAMPLE_PROJECTS));
    }
  }, []);

  const saveProjects = (list: Project[]) => {
    setProjects(list);
    localStorage.setItem('nexios_projects', JSON.stringify(list));
  };

  const createProject = () => {
    if (!newName.trim()) return;
    const proj: Project = {
      id: `proj-${Date.now()}`,
      name: newName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: newDesc || 'No description',
      language: newLang,
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: 'just now',
      files: 1,
    };
    saveProjects([proj, ...projects]);
    setNewName(''); setNewDesc(''); setShowCreate(false);
  };

  const importGithub = async () => {
    if (!githubUrl.trim()) return;
    setImporting(true);
    try {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error('Invalid GitHub URL');
      const [, owner, repo] = match;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      const data = await res.json();
      const proj: Project = {
        id: `proj-${Date.now()}`,
        name: data.name || repo,
        description: data.description || 'Imported from GitHub',
        language: data.language || 'Other',
        createdAt: new Date().toISOString().split('T')[0],
        lastModified: 'just now',
        files: 0,
        githubUrl: githubUrl.trim(),
      };
      saveProjects([proj, ...projects]);
      setGithubUrl(''); setShowGithub(false);
    } catch {
      alert('Failed to import. Make sure the repository is public.');
    } finally {
      setImporting(false);
    }
  };

  const deleteProject = (id: string) => {
    saveProjects(projects.filter(p => p.id !== id));
    setMenuOpen(null);
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Your AI-powered coding workspaces</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowGithub(true)} className="btn-ghost text-sm gap-2">
            <BsGithub className="w-4 h-4" /> Import from GitHub
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm gap-2">
            <BsPlus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="input-base pl-9 text-sm"
        />
      </div>

      {/* Projects grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <HiFolder className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-semibold text-white mb-1">No projects found</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Create your first project or import from GitHub</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
            <BsPlus className="w-4 h-4" /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const langColor = LANG_COLORS[p.language] || LANG_COLORS.Other;
            return (
              <div key={p.id} className="glass glass-hover rounded-2xl p-5 group relative transition-all duration-200" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                {/* Menu */}
                <div className="absolute top-3 right-3">
                  <button onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                    <BsThreeDotsVertical className="w-3.5 h-3.5" />
                  </button>
                  {menuOpen === p.id && (
                    <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', minWidth: 140, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                      <button onClick={() => deleteProject(p.id)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors text-left"
                        style={{ color: 'var(--danger)' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                        <BsTrash className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${langColor}18`, border: `1px solid ${langColor}33` }}>
                    <BsCode className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color: langColor }} />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{ background: langColor }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.language}</span>
                  {p.githubUrl && <BsGithub className="w-3 h-3 ml-1" style={{ color: 'var(--text-muted)' }} />}
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{p.files} files</span>
                </div>

                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Modified {p.lastModified}</span>
                  <Link href={`/dashboard/projects/${p.id}`}
                    className="flex items-center gap-1 text-xs font-semibold transition-colors"
                    style={{ color: 'var(--accent)' }}>
                    Open <HiArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* New project card */}
          <button onClick={() => setShowCreate(true)}
            className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-all duration-200 cursor-pointer group"
            style={{ border: '1px dashed var(--glass-border)' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(129,140,248,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(129,140,248,0.04)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: 'var(--accent-glow)', border: '1px solid rgba(129,140,248,0.2)' }}>
              <BsPlus className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>New Project</span>
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="glass rounded-2xl p-7 w-full max-w-md animate-scaleIn" style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Create New Project</h2>
              <button onClick={() => setShowCreate(false)} style={{ color: 'var(--text-muted)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-awesome-project"
                  className="input-base" onKeyDown={e => e.key === 'Enter' && createProject()} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are you building?"
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Language</label>
                <select value={newLang} onChange={e => setNewLang(e.target.value)} className="input-base"
                  style={{ appearance: 'none' }}>
                  {Object.keys(LANG_COLORS).filter(l => l !== 'Other').map(l => (
                    <option key={l} value={l} style={{ background: 'var(--bg-secondary)' }}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={createProject} className="btn-primary flex-1 gap-2">
                <HiLightningBolt className="w-4 h-4" /> Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Import Modal */}
      {showGithub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="glass rounded-2xl p-7 w-full max-w-md animate-scaleIn" style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BsGithub className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">Import from GitHub</h2>
              </div>
              <button onClick={() => setShowGithub(false)} style={{ color: 'var(--text-muted)' }}>
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Enter a public GitHub repository URL to import its files into your workspace.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Repository URL</label>
              <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="input-base" onKeyDown={e => e.key === 'Enter' && importGithub()} />
            </div>
            <div className="glass rounded-xl p-3 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> Only public repositories are supported. The AI agent will analyse your codebase upon import.
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGithub(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={importGithub} disabled={importing} className="btn-primary flex-1 gap-2"
                style={{ opacity: importing ? 0.6 : 1 }}>
                {importing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</> : <><BsGithub className="w-4 h-4" /> Import</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside menu handler */}
      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
