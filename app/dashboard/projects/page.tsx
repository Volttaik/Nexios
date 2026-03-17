'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BsCode, BsGithub, BsTrash, BsThreeDotsVertical, BsPlus,
  BsBrush, BsFileEarmarkRichtext, BsPencil
} from 'react-icons/bs';
import { SiFigma } from 'react-icons/si';
import { HiFolder, HiSearch, HiArrowRight, HiLightningBolt, HiX, HiCode } from 'react-icons/hi';

type ProjectType = 'code' | 'design' | 'document';

interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  type: ProjectType;
  createdAt: string;
  lastModified: string;
  files: number;
  githubUrl?: string;
  figmaUrl?: string;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#818cf8', JavaScript: '#f59e0b', Python: '#34d399',
  Rust: '#f87171', Go: '#60a5fa', HTML: '#fb923c', CSS: '#a78bfa', Other: '#94a3b8',
};

const TYPE_META: Record<ProjectType, { label: string; icon: any; color: string; bg: string; desc: string }> = {
  code: { label: 'Code', icon: HiCode, color: '#818cf8', bg: 'rgba(129,140,248,0.12)', desc: 'Full IDE with AI agent' },
  design: { label: 'Design', icon: BsBrush, color: '#f472b6', bg: 'rgba(244,114,182,0.12)', desc: 'Figma import + UI generation' },
  document: { label: 'Document', icon: BsFileEarmarkRichtext, color: '#34d399', bg: 'rgba(52,211,153,0.12)', desc: 'AI-powered documentation' },
};

const DEFAULT_FIGMA_LINKS = [
  { name: 'material-design-3', label: 'Material Design 3', url: 'https://www.figma.com/community/file/1035203688168086460' },
  { name: 'apple-ios-17-ui', label: 'Apple iOS 17 UI Kit', url: 'https://www.figma.com/community/file/1247950726448004999' },
  { name: 'tailwind-ui-kit', label: 'Tailwind CSS UI Kit', url: 'https://www.figma.com/community/file/768809027799962739' },
  { name: 'shadcn-ui-kit', label: 'Shadcn/UI Design Kit', url: 'https://www.figma.com/community/file/1203061493325953101' },
];

const SAMPLE_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'my-api-project', description: 'REST API with authentication and rate limiting', language: 'TypeScript', type: 'code', createdAt: '2025-03-15', lastModified: '2h ago', files: 12 },
  { id: 'proj-2', name: 'ml-pipeline', description: 'Machine learning data pipeline with PyTorch', language: 'Python', type: 'code', createdAt: '2025-03-14', lastModified: '1d ago', files: 8 },
  { id: 'proj-3', name: 'design-system', description: 'Component library and design documentation', language: 'Other', type: 'design', createdAt: '2025-03-12', lastModified: '3d ago', files: 5 },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [showFigma, setShowFigma] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLang, setNewLang] = useState('TypeScript');
  const [newType, setNewType] = useState<ProjectType>('code');
  const [githubUrl, setGithubUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // ── Workspace persistence: redirect to last open workspace ──
  useEffect(() => {
    const activeWorkspace = localStorage.getItem('nexios_active_workspace');
    if (activeWorkspace) {
      // Check if project still exists
      const saved = localStorage.getItem('nexios_projects');
      if (saved) {
        const parsed: Project[] = JSON.parse(saved);
        if (parsed.find(p => p.id === activeWorkspace)) {
          router.push(`/dashboard/projects/${activeWorkspace}`);
          return;
        } else {
          localStorage.removeItem('nexios_active_workspace');
        }
      }
    }

    const saved = localStorage.getItem('nexios_projects');
    if (saved) {
      const parsed = JSON.parse(saved);
      setProjects(parsed.map((p: Project) => ({ ...p, type: p.type || 'code' })));
    } else {
      setProjects(SAMPLE_PROJECTS);
      localStorage.setItem('nexios_projects', JSON.stringify(SAMPLE_PROJECTS));
    }
  }, [router]);

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
      language: newType === 'code' ? newLang : 'Other',
      type: newType,
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: 'just now',
      files: newType === 'design' ? DEFAULT_FIGMA_LINKS.length : 0,
    };
    saveProjects([proj, ...projects]);

    // For design projects, pre-populate Figma links file
    if (newType === 'design') {
      const figmaContent = `# Figma Design Resources\n\nYour design workspace is ready. Here are popular design systems to get started:\n\n${DEFAULT_FIGMA_LINKS.map(l => `## ${l.label}\n- URL: ${l.url}\n- Ask Nexios AI to convert this design to code\n`).join('\n')}\n\n## How to import a Figma design\n1. Copy a Figma file URL\n2. Paste it into the chat: "Import this Figma design: [URL]"\n3. Nexios AI will convert it to working code\n`;
      const figmaFile = {
        id: `file-${Date.now()}`,
        name: 'figma-resources.md',
        type: 'file' as const,
        content: figmaContent,
        language: 'markdown',
        path: 'figma-resources.md',
      };
      localStorage.setItem(`nexios_files_${proj.id}`, JSON.stringify([figmaFile]));
    }

    setNewName(''); setNewDesc(''); setShowCreate(false);
    router.push(`/dashboard/projects/${proj.id}`);
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
        type: 'code',
        createdAt: new Date().toISOString().split('T')[0],
        lastModified: 'just now',
        files: 0,
        githubUrl: githubUrl.trim(),
      };
      saveProjects([proj, ...projects]);
      setGithubUrl(''); setShowGithub(false);
      router.push(`/dashboard/projects/${proj.id}`);
    } catch {
      alert('Failed to import. Make sure the repository is public.');
    } finally {
      setImporting(false);
    }
  };

  const importFigma = () => {
    if (!figmaUrl.trim()) return;
    const proj: Project = {
      id: `proj-${Date.now()}`,
      name: 'figma-design-' + Date.now().toString(36),
      description: 'Design project imported from Figma',
      language: 'Other',
      type: 'design',
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: 'just now',
      files: 1,
      figmaUrl: figmaUrl.trim(),
    };
    const content = `# Figma Import\n\nSource: ${figmaUrl.trim()}\nImported: ${new Date().toISOString()}\n\n## How to convert\nAsk Nexios AI in the chat:\n- "Convert this Figma design to React components"\n- "Generate the CSS for this design"\n- "Build a landing page from this Figma file"\n\n## Figma Design Resources\n${DEFAULT_FIGMA_LINKS.map(l => `- [${l.label}](${l.url})`).join('\n')}\n`;
    const figmaFile = {
      id: `file-${Date.now()}`,
      name: 'figma-import.md',
      type: 'file' as const,
      content,
      language: 'markdown',
      path: 'figma-import.md',
    };
    localStorage.setItem(`nexios_files_${proj.id}`, JSON.stringify([figmaFile]));
    saveProjects([proj, ...projects]);
    setFigmaUrl(''); setShowFigma(false);
    router.push(`/dashboard/projects/${proj.id}`);
  };

  const deleteProject = (id: string) => {
    saveProjects(projects.filter(p => p.id !== id));
    localStorage.removeItem(`nexios_files_${id}`);
    localStorage.removeItem(`nexios_chat_${id}`);
    if (localStorage.getItem('nexios_active_workspace') === id) {
      localStorage.removeItem('nexios_active_workspace');
    }
    setMenuOpen(null);
  };

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Your AI-powered workspaces</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowFigma(true)} className="btn-ghost text-sm gap-2 flex items-center">
            <SiFigma className="w-4 h-4" /> Import Figma
          </button>
          <button onClick={() => setShowGithub(true)} className="btn-ghost text-sm gap-2 flex items-center">
            <BsGithub className="w-4 h-4" /> Import GitHub
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm gap-2 flex items-center">
            <BsPlus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'code', 'design', 'document'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${typeFilter === t ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={{
              background: typeFilter === t ? (t === 'all' ? 'rgba(255,255,255,0.1)' : TYPE_META[t as ProjectType]?.bg || 'rgba(255,255,255,0.1)') : 'transparent',
              border: `1px solid ${typeFilter === t ? (t === 'all' ? 'rgba(255,255,255,0.2)' : (TYPE_META[t as ProjectType]?.color || '#fff') + '40') : 'rgba(255,255,255,0.06)'}`,
            }}>
            {t === 'all' ? 'All Projects' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="relative ml-auto">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="input-base pl-9 text-sm w-48" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <HiFolder className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-semibold text-white mb-1">No projects found</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Create a code, design, or document project</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary gap-2 flex items-center mx-auto">
            <BsPlus className="w-4 h-4" /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const langColor = LANG_COLORS[p.language] || LANG_COLORS.Other;
            const typeMeta = TYPE_META[p.type] || TYPE_META.code;
            const TypeIcon = typeMeta.icon;
            return (
              <div key={p.id} className="glass glass-hover rounded-2xl p-5 group relative transition-all duration-200" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div className="absolute top-3 left-3">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium" style={{ background: typeMeta.bg, color: typeMeta.color }}>
                    <TypeIcon className="w-2.5 h-2.5" />
                    {typeMeta.label}
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <button onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                    <BsThreeDotsVertical className="w-3.5 h-3.5" />
                  </button>
                  {menuOpen === p.id && (
                    <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', minWidth: 140, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                      <Link href={`/dashboard/projects/${p.id}`}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors text-left text-white/70 hover:text-white hover:bg-white/5">
                        <BsPencil className="w-3.5 h-3.5" /> Open
                      </Link>
                      <button onClick={() => deleteProject(p.id)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors text-left hover:bg-red-500/10"
                        style={{ color: 'var(--danger)' }}>
                        <BsTrash className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 mt-5 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${langColor}18`, border: `1px solid ${langColor}33` }}>
                    <BsCode className="w-[18px] h-[18px]" style={{ color: langColor }} />
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
                  {p.figmaUrl && <SiFigma className="w-3 h-3 ml-1 text-pink-400" />}
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

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="glass rounded-2xl p-7 w-full max-w-md" style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">New Project</h2>
              <button onClick={() => setShowCreate(false)} style={{ color: 'var(--text-muted)' }}><HiX className="w-5 h-5" /></button>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Project Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(TYPE_META) as [ProjectType, typeof TYPE_META[ProjectType]][]).map(([type, meta]) => {
                  const Icon = meta.icon;
                  const isSelected = newType === type;
                  return (
                    <button key={type} onClick={() => setNewType(type)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all"
                      style={{ background: isSelected ? meta.bg : 'transparent', borderColor: isSelected ? meta.color + '60' : 'var(--glass-border)' }}>
                      <Icon className="w-5 h-5" style={{ color: isSelected ? meta.color : 'var(--text-muted)' }} />
                      <span className="text-[10px] font-medium" style={{ color: isSelected ? meta.color : 'var(--text-muted)' }}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{TYPE_META[newType].desc}</p>
            </div>

            {newType === 'design' && (
              <div className="mb-4 rounded-xl p-3 border" style={{ background: 'rgba(244,114,182,0.05)', borderColor: 'rgba(244,114,182,0.2)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: '#f472b6' }}>Included Figma templates:</p>
                {DEFAULT_FIGMA_LINKS.map(l => (
                  <div key={l.name} className="flex items-center gap-1.5 text-[10px] py-0.5" style={{ color: 'var(--text-muted)' }}>
                    <SiFigma className="w-2.5 h-2.5 text-pink-400" />
                    {l.label}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-awesome-project"
                  className="input-base" onKeyDown={e => e.key === 'Enter' && createProject()} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are you building?"
                  className="input-base" />
              </div>
              {newType === 'code' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Language</label>
                  <select value={newLang} onChange={e => setNewLang(e.target.value)} className="input-base" style={{ appearance: 'none' }}>
                    {Object.keys(LANG_COLORS).filter(l => l !== 'Other').map(l => (
                      <option key={l} value={l} style={{ background: 'var(--bg-secondary)' }}>{l}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={createProject} disabled={!newName.trim()} className="btn-primary flex-1 gap-2 flex items-center justify-center" style={{ opacity: !newName.trim() ? 0.5 : 1 }}>
                <HiLightningBolt className="w-4 h-4" /> Create & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GitHub Import Modal ── */}
      {showGithub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="glass rounded-2xl p-7 w-full max-w-md" style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3"><BsGithub className="w-5 h-5 text-white" /><h2 className="text-lg font-bold text-white">Import from GitHub</h2></div>
              <button onClick={() => setShowGithub(false)} style={{ color: 'var(--text-muted)' }}><HiX className="w-5 h-5" /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Enter a public GitHub repository URL. Nexios AI will read your codebase and start contributing.</p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Repository URL</label>
              <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="input-base" onKeyDown={e => e.key === 'Enter' && importGithub()} autoFocus />
            </div>
            <div className="glass rounded-xl p-3 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> Only public repositories are supported.
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGithub(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={importGithub} disabled={importing} className="btn-primary flex-1 gap-2 flex items-center justify-center" style={{ opacity: importing ? 0.6 : 1 }}>
                {importing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</> : <><BsGithub className="w-4 h-4" /> Import</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Figma Import Modal ── */}
      {showFigma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="glass rounded-2xl p-7 w-full max-w-md" style={{ boxShadow: '0 0 60px rgba(244,114,182,0.15)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3"><SiFigma className="w-5 h-5 text-pink-400" /><h2 className="text-lg font-bold text-white">Import from Figma</h2></div>
              <button onClick={() => setShowFigma(false)} style={{ color: 'var(--text-muted)' }}><HiX className="w-5 h-5" /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Paste a Figma file or frame URL. Nexios AI will convert it to working code.</p>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Figma URL</label>
              <input value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/file/..."
                className="input-base" onKeyDown={e => e.key === 'Enter' && importFigma()} autoFocus />
            </div>

            <div className="mb-4">
              <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Or start with a template:</p>
              <div className="space-y-1.5">
                {DEFAULT_FIGMA_LINKS.map(link => (
                  <button key={link.name} onClick={() => setFigmaUrl(link.url)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all border text-xs"
                    style={{
                      background: figmaUrl === link.url ? 'rgba(244,114,182,0.1)' : 'var(--bg-card)',
                      borderColor: figmaUrl === link.url ? 'rgba(244,114,182,0.3)' : 'var(--glass-border)',
                      color: figmaUrl === link.url ? '#f472b6' : 'var(--text-secondary)',
                    }}>
                    <SiFigma className="w-3 h-3 text-pink-400 shrink-0" />
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowFigma(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={importFigma} disabled={!figmaUrl.trim()} className="btn-primary flex-1 gap-2 flex items-center justify-center" style={{ opacity: !figmaUrl.trim() ? 0.6 : 1, background: '#ec4899' }}>
                <SiFigma className="w-4 h-4" /> Import Design
              </button>
            </div>
          </div>
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
