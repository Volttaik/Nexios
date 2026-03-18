'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  HiArrowLeft, HiCode,
} from 'react-icons/hi';
import {
  BsBrush, BsDownload, BsLayers, BsPalette, BsGrid,
  BsZoomIn, BsZoomOut, BsAspectRatio, BsRobot,
  BsArrowRepeat, BsCheckCircleFill,
} from 'react-icons/bs';
import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';

const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  { ssr: false, loading: () => <DesignLoading /> }
);

function DesignLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: '#080c14', color: 'rgba(255,255,255,0.3)' }}>
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs">Loading canvas…</p>
    </div>
  );
}

const PALETTE_COLORS = [
  '#000000', '#ffffff', '#374151', '#6b7280', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#fca5a5', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc', '#bfdbfe',
  '#ddd6fe', '#fbcfe8', '#7f1d1d', '#7c2d12', '#713f12', '#14532d',
  '#164e63', '#1e3a8a', '#3b0764', '#831843',
];

interface DesignEditorProps {
  projectId: string;
  projectName?: string;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

type RightTab = 'ai' | 'layers' | 'colors';

export default function DesignEditor({ projectId, projectName }: DesignEditorProps) {
  const [exportMsg, setExportMsg] = useState('');
  const [showRight, setShowRight] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>('ai');
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Layer 1', visible: true, locked: false },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('1');
  const [savedScene, setSavedScene] = useState<any>(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);

  const { activeProvider, activeModel, getApiKey } = useAI();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hi! I\'m your design assistant. Ask me about layouts, color palettes, typography, spacing, accessibility, or any design question. I\'ll help you create something great.', timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`nexios_design_${projectId}`);
      if (saved) setSavedScene(JSON.parse(saved));
    } catch { /* ignore */ }
    setSceneLoaded(true);
  }, [projectId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    try {
      localStorage.setItem(`nexios_design_${projectId}`, JSON.stringify({ elements, appState }));
    } catch { /* ignore */ }
  }, [projectId]);

  const exportSVG = useCallback(async () => {
    try {
      const mod = await import('@excalidraw/excalidraw');
      const saved = (() => { try { const s = localStorage.getItem(`nexios_design_${projectId}`); return s ? JSON.parse(s) : null; } catch { return null; } })();
      if (!saved?.elements?.length) { setExportMsg('Nothing to export'); setTimeout(() => setExportMsg(''), 2500); return; }
      const svg = await (mod as any).exportToSvg({ elements: saved.elements, appState: { ...saved.appState, exportWithDarkMode: false } });
      const svgStr = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName || 'design'}.svg`; a.click();
      URL.revokeObjectURL(url);
      setExportMsg('SVG exported!');
      setTimeout(() => setExportMsg(''), 2500);
    } catch { setExportMsg('Export failed'); setTimeout(() => setExportMsg(''), 2500); }
  }, [projectId, projectName]);

  const exportPNG = useCallback(async () => {
    try {
      const mod = await import('@excalidraw/excalidraw');
      const saved = (() => { try { const s = localStorage.getItem(`nexios_design_${projectId}`); return s ? JSON.parse(s) : null; } catch { return null; } })();
      if (!saved?.elements?.length) { setExportMsg('Nothing to export'); setTimeout(() => setExportMsg(''), 2500); return; }
      const blob = await (mod as any).exportToBlob({ elements: saved.elements, appState: { ...saved.appState }, quality: 1, type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName || 'design'}.png`; a.click();
      URL.revokeObjectURL(url);
      setExportMsg('PNG exported!');
      setTimeout(() => setExportMsg(''), 2500);
    } catch { setExportMsg('Export failed'); setTimeout(() => setExportMsg(''), 2500); }
  }, [projectId, projectName]);

  const addLayer = () => {
    const id = Math.random().toString(36).substring(2, 8);
    const newLayer: Layer = { id, name: `Layer ${layers.length + 1}`, visible: true, locked: false };
    setLayers(p => [...p, newLayer]);
    setActiveLayerId(id);
  };

  const toggleLayerVisibility = (id: string) => setLayers(p => p.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  const toggleLayerLock = (id: string) => setLayers(p => p.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    setLayers(p => p.filter(l => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(layers.find(l => l.id !== id)?.id || '');
  };

  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return;
    const apiKey = getApiKey(activeProvider.id);
    if (!apiKey) {
      setMessages(p => [...p, { role: 'assistant', content: `Please add your ${activeProvider.name} API key in Settings to use AI assistance.`, timestamp: Date.now() }]);
      return;
    }
    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);

    try {
      const systemPrompt = `You are a design expert assistant inside Nexios AI's vector design environment. 
      
The user is working on a design project called "${projectName || 'Design Project'}".
They are using a vector canvas tool similar to Figma/Illustrator.

Help them with:
- Color palette recommendations
- Typography and font pairings  
- Layout and spacing principles
- UI/UX best practices
- Accessibility (contrast ratios, touch targets)
- Design system thinking
- Component naming and organization
- Visual hierarchy

Be concise, practical, and specific. When recommending colors, provide hex values. When discussing spacing, use specific numbers.`;

      const msgsForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content })),
        { role: 'user' as const, content: userMsg },
      ];

      const response = await callAI(activeProvider.id, activeModel.id, msgsForAI, apiKey);
      setMessages(p => [...p, { role: 'assistant', content: response, timestamp: Date.now() }]);
    } catch (err: any) {
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${err.message}`, timestamp: Date.now() }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: '#080c14', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-3 h-10 shrink-0 border-b" style={{ background: '#0c0f17', borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link href="/dashboard/projects" className="text-white/40 hover:text-white/80 transition-colors">
          <HiArrowLeft size={14} />
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <BsBrush size={13} className="text-indigo-400" />
        <span className="text-[12px] font-semibold text-white/90">{projectName || 'Design'}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
          Vector Design
        </span>
        <div className="flex-1" />

        {exportMsg && <span className="text-[11px] text-emerald-400">{exportMsg}</span>}

        <button onClick={exportPNG} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md transition-colors" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.25)' }}>
          <BsDownload size={10} /> PNG
        </button>
        <button onClick={exportSVG} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md transition-colors" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
          <BsDownload size={10} /> SVG
        </button>
        <button onClick={() => setShowRight(p => !p)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all ${showRight ? 'text-indigo-300' : 'text-white/30 hover:text-white/60'}`} style={{ background: showRight ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
          <BsRobot size={11} /> AI
        </button>
      </div>

      {/* ── Toolbar strip ── */}
      <div className="flex items-center gap-1 px-3 h-9 shrink-0 border-b" style={{ background: '#0a0d15', borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 mr-2">Tools</span>

        {[
          { icon: '↖', label: 'Select' },
          { icon: '✦', label: 'Edit Nodes' },
          { icon: '✏', label: 'Freehand' },
          { icon: '╱', label: 'Pen' },
          { icon: '▭', label: 'Rectangle' },
          { icon: '◯', label: 'Ellipse' },
          { icon: '▷', label: 'Arrow' },
          { icon: '◇', label: 'Diamond' },
          { icon: 'T', label: 'Text' },
          { icon: '🖊', label: 'Draw' },
        ].map((tool, i) => (
          <button key={i} title={tool.label}
            className="flex items-center justify-center w-7 h-7 rounded text-sm font-mono transition-all hover:bg-white/8 text-white/40 hover:text-white/80">
            {tool.icon}
          </button>
        ))}

        <div className="w-px h-5 mx-1 bg-white/8" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 mx-1">View</span>
        <button title="Zoom In" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"><BsZoomIn size={12} /></button>
        <button title="Zoom Out" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"><BsZoomOut size={12} /></button>
        <button title="Fit to page" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"><BsAspectRatio size={12} /></button>
        <button title="Grid" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"><BsGrid size={12} /></button>

        <div className="flex-1" />

        <button onClick={() => { setShowRight(true); setRightTab('layers'); }} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all ${rightTab === 'layers' && showRight ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/30 hover:text-white/60'}`}>
          <BsLayers size={11} /> Layers
        </button>
        <button onClick={() => { setShowRight(true); setRightTab('colors'); }} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all ${rightTab === 'colors' && showRight ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/30 hover:text-white/60'}`}>
          <BsPalette size={11} /> Colors
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Canvas ── */}
        <div className="flex-1 relative overflow-hidden">
          {sceneLoaded && (
            <Excalidraw
              initialData={savedScene
                ? { elements: savedScene.elements, appState: { ...savedScene.appState, theme: 'dark' } }
                : { appState: { theme: 'dark', viewBackgroundColor: '#080c14' } }}
              onChange={handleChange}
              UIOptions={{ canvasActions: { export: false, saveAsImage: false } }}
              theme="dark"
            />
          )}
        </div>

        {/* ── Right panel ── */}
        {showRight && (
          <div className="flex flex-col shrink-0 border-l" style={{ width: 290, borderColor: 'rgba(255,255,255,0.08)', background: '#0a0d15' }}>

            {/* Tabs */}
            <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              {(['ai', 'layers', 'colors'] as RightTab[]).map(tab => (
                <button key={tab} onClick={() => setRightTab(tab)}
                  className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors ${rightTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                  {tab === 'ai' ? 'AI Assistant' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* AI Tab */}
            {rightTab === 'ai' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] shrink-0 font-bold mt-0.5 ${msg.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-600/40 text-slate-300'}`}>
                        {msg.role === 'assistant' ? 'AI' : 'U'}
                      </div>
                      <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'assistant' ? 'bg-white/4 text-white/75' : 'bg-indigo-600/20 text-indigo-200'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex gap-1.5">
                      <div className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[8px] font-bold shrink-0">AI</div>
                      <div className="px-2.5 py-1.5 bg-white/4 rounded-xl flex gap-1 items-center">
                        {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex gap-1.5 items-end rounded-xl border px-2 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                    <textarea
                      value={input} onChange={e => setInput(e.target.value)}
                      placeholder="Ask about colors, layouts, typography…"
                      rows={2}
                      className="flex-1 bg-transparent text-[11px] resize-none outline-none text-white/70 placeholder-white/20"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    />
                    <button onClick={sendMessage} disabled={aiLoading || !input.trim()}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: aiLoading || !input.trim() ? 'rgba(255,255,255,0.05)' : '#6366f1', color: aiLoading || !input.trim() ? 'rgba(255,255,255,0.2)' : '#fff' }}>
                      {aiLoading ? <BsArrowRepeat size={12} className="animate-spin" /> : <BsRobot size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Layers Tab */}
            {rightTab === 'layers' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Layers</span>
                  <button onClick={addLayer} className="text-white/30 hover:text-indigo-300 transition-colors text-lg leading-none" title="Add Layer">+</button>
                </div>
                <div className="flex-1 overflow-auto py-1">
                  {[...layers].reverse().map(layer => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors ${activeLayerId === layer.id ? 'bg-indigo-600/20' : 'hover:bg-white/4'}`}
                    >
                      <button onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} className="text-white/30 hover:text-white/70 transition-colors text-xs w-4" title="Toggle visibility">
                        {layer.visible ? '●' : '○'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); toggleLayerLock(layer.id); }} className="text-white/25 hover:text-white/60 transition-colors text-xs w-4" title="Toggle lock">
                        {layer.locked ? '🔒' : '🔓'}
                      </button>
                      <span className={`flex-1 text-[11px] truncate ${activeLayerId === layer.id ? 'text-indigo-300' : 'text-white/50'}`}>{layer.name}</span>
                      <button onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }} className="text-white/15 hover:text-red-400 transition-colors text-xs">×</button>
                    </div>
                  ))}
                </div>

                {/* Object properties */}
                <div className="border-t px-3 py-2 space-y-2 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Object Properties</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[['X', '0'], ['Y', '0'], ['W', '100'], ['H', '100']].map(([label, val]) => (
                      <div key={label} className="flex items-center gap-1">
                        <span className="text-[9px] text-white/25 w-3">{label}</span>
                        <input defaultValue={val} className="flex-1 text-[10px] rounded px-1 py-0.5 text-white/55 outline-none focus:border-indigo-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/25">Opacity:</span>
                    <input type="range" min={0} max={100} defaultValue={100} className="flex-1 accent-indigo-400" />
                    <span className="text-[9px] text-white/30">100%</span>
                  </div>
                </div>

                {/* Align */}
                <div className="border-t px-3 py-2 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-1.5">Align</div>
                  <div className="grid grid-cols-6 gap-1">
                    {['⇤', '⇔', '⇥', '⇧', '⇕', '⇩'].map((icon, i) => (
                      <button key={i} className="flex items-center justify-center w-full h-6 rounded text-white/40 hover:text-indigo-300 text-sm transition-all" style={{ background: 'rgba(255,255,255,0.04)' }}>{icon}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {['Group', 'Ungroup', 'Order'].map(action => (
                      <button key={action} className="text-[9px] px-1 py-0.5 rounded text-white/35 hover:text-indigo-300 transition-all" style={{ background: 'rgba(255,255,255,0.04)' }}>{action}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Colors Tab */}
            {rightTab === 'colors' && (
              <div className="flex-1 overflow-auto">
                <div className="p-3">
                  <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Color Palette</div>
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {PALETTE_COLORS.map(color => (
                      <button key={color} title={color}
                        className="w-7 h-7 rounded-sm border border-white/8 transition-transform hover:scale-110 hover:border-white/25"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-white/25">Custom:</span>
                    <input type="color" className="w-8 h-6 rounded cursor-pointer border border-white/10 bg-transparent" />
                  </div>
                </div>

                <div className="border-t px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Suggested Palettes</div>
                  {[
                    { name: 'Midnight', colors: ['#080c14', '#1a1e2e', '#6366f1', '#818cf8', '#e0e7ff'] },
                    { name: 'Emerald', colors: ['#064e3b', '#065f46', '#10b981', '#34d399', '#d1fae5'] },
                    { name: 'Sunset', colors: ['#7c1d4e', '#9d174d', '#ec4899', '#f9a8d4', '#fce7f3'] },
                  ].map(palette => (
                    <div key={palette.name} className="mb-2">
                      <p className="text-[9px] text-white/30 mb-1">{palette.name}</p>
                      <div className="flex gap-1">
                        {palette.colors.map(c => (
                          <button key={c} title={c} className="flex-1 h-5 rounded-sm border border-white/8 hover:border-white/25 transition-colors" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-3 px-4 h-6 shrink-0 border-t text-[10px]" style={{ background: '#0c0f17', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
        <span>Canvas: Infinite</span>
        <span>|</span>
        <span>{layers.length} Layer{layers.length !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <span>Vector Design</span>
      </div>
    </div>
  );
}
