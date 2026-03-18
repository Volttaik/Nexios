'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  HiArrowLeft,
} from 'react-icons/hi';
import {
  BsBrush, BsDownload, BsLayers, BsPalette, BsGrid,
  BsZoomIn, BsZoomOut, BsAspectRatio,
} from 'react-icons/bs';

const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  { ssr: false, loading: () => <DesignLoading /> }
);

function DesignLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: '#1e1e2e', color: 'rgba(255,255,255,0.4)' }}>
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Loading design canvas…</p>
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

export default function DesignEditor({ projectId, projectName }: DesignEditorProps) {
  const [exportMsg, setExportMsg] = useState('');
  const [showLayers, setShowLayers] = useState(true);
  const [showPalette, setShowPalette] = useState(true);
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Layer 1', visible: true, locked: false },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('1');

  const getSavedScene = useCallback(() => {
    try {
      const saved = localStorage.getItem(`nexios_design_${projectId}`);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return null;
  }, [projectId]);

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    try {
      localStorage.setItem(`nexios_design_${projectId}`, JSON.stringify({ elements, appState }));
    } catch { /* ignore */ }
  }, [projectId]);

  const exportSVG = useCallback(async () => {
    try {
      const mod = await import('@excalidraw/excalidraw');
      const saved = getSavedScene();
      if (!saved?.elements?.length) { setExportMsg('Nothing to export yet'); setTimeout(() => setExportMsg(''), 2500); return; }
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
  }, [getSavedScene, projectName]);

  const exportPNG = useCallback(async () => {
    try {
      const mod = await import('@excalidraw/excalidraw');
      const saved = getSavedScene();
      if (!saved?.elements?.length) { setExportMsg('Nothing to export yet'); setTimeout(() => setExportMsg(''), 2500); return; }
      const blob = await (mod as any).exportToBlob({ elements: saved.elements, appState: { ...saved.appState }, quality: 1, type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName || 'design'}.png`; a.click();
      URL.revokeObjectURL(url);
      setExportMsg('PNG exported!');
      setTimeout(() => setExportMsg(''), 2500);
    } catch { setExportMsg('Export failed'); setTimeout(() => setExportMsg(''), 2500); }
  }, [getSavedScene, projectName]);

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

  const saved = getSavedScene();

  return (
    <div className="flex flex-col h-screen" style={{ background: '#1e1e2e', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-4 h-10 shrink-0 border-b" style={{ background: '#12121e', borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link href="/dashboard/projects" className="text-white/50 hover:text-white transition-colors">
          <HiArrowLeft size={16} />
        </Link>
        <BsBrush size={14} className="text-purple-400" />
        <span className="text-sm font-semibold text-white/90">{projectName || 'Design'}</span>
        <span className="text-purple-400 text-xs">— Vector Design Canvas</span>
        <div className="flex-1" />

        {exportMsg && <span className="text-[11px] text-green-400">{exportMsg}</span>}

        <div className="flex items-center gap-1.5">
          <button onClick={exportPNG} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-md transition-colors" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
            <BsDownload size={11} /> PNG
          </button>
          <button onClick={exportSVG} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-md transition-colors" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
            <BsDownload size={11} /> SVG
          </button>
        </div>
      </div>

      {/* ── Toolbar strip ── */}
      <div className="flex items-center gap-1 px-3 h-9 shrink-0 border-b" style={{ background: '#16162a', borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/25 mr-2">Tools</span>

        {[
          { icon: '↖', label: 'Select (V)' },
          { icon: '✦', label: 'Edit Nodes (A)' },
          { icon: '✏', label: 'Freehand (P)' },
          { icon: '╱', label: 'Bezier / Pen' },
          { icon: '▭', label: 'Rectangle (R)' },
          { icon: '◯', label: 'Ellipse (E)' },
          { icon: '▷', label: 'Arrow' },
          { icon: '◇', label: 'Diamond' },
          { icon: '✦', label: 'Star/Polygon' },
          { icon: 'T', label: 'Text (T)' },
          { icon: '✎', label: 'Artistic Text' },
          { icon: '🖊', label: 'Draw' },
        ].map((tool, i) => (
          <button key={i} title={tool.label} className="flex items-center justify-center w-7 h-7 rounded text-sm font-mono transition-all hover:bg-white/10 text-white/50 hover:text-white/90">
            {tool.icon}
          </button>
        ))}

        <div className="w-px h-5 mx-1 bg-white/10" />

        <span className="text-[10px] font-bold uppercase tracking-widest text-white/25 mx-1">View</span>
        <button title="Zoom In" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-all"><BsZoomIn size={13} /></button>
        <button title="Zoom Out" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-all"><BsZoomOut size={13} /></button>
        <button title="Fit to page" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-all"><BsAspectRatio size={13} /></button>
        <button title="Grid" className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-all"><BsGrid size={13} /></button>

        <div className="flex-1" />

        <button onClick={() => setShowLayers(p => !p)} title="Toggle Layers" className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${showLayers ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/70'}`}>
          <BsLayers size={12} /> Layers
        </button>
        <button onClick={() => setShowPalette(p => !p)} title="Toggle Palette" className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${showPalette ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/70'}`}>
          <BsPalette size={12} /> Colors
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Canvas ── */}
        <div className="flex-1 relative overflow-hidden">
          <Excalidraw
            initialData={saved ? { elements: saved.elements, appState: { ...saved.appState, theme: 'dark' } } : { appState: { theme: 'dark', viewBackgroundColor: '#1e1e2e' } }}
            onChange={handleChange}
            UIOptions={{ canvasActions: { export: false, saveAsImage: false } }}
            theme="dark"
          />
        </div>

        {/* ── Right panels ── */}
        {(showLayers || showPalette) && (
          <div className="w-52 flex flex-col border-l shrink-0" style={{ background: '#12121e', borderColor: 'rgba(255,255,255,0.08)' }}>

            {/* Layers panel */}
            {showLayers && (
              <div className="flex-1 flex flex-col overflow-hidden border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between px-3 h-8 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Layers</span>
                  <button onClick={addLayer} className="text-white/40 hover:text-purple-300 transition-colors text-lg leading-none" title="Add Layer">+</button>
                </div>
                <div className="flex-1 overflow-auto py-1">
                  {[...layers].reverse().map(layer => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors ${activeLayerId === layer.id ? 'bg-purple-600/20' : 'hover:bg-white/4'}`}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                        className="text-white/40 hover:text-white/80 transition-colors text-xs w-4"
                        title="Toggle visibility"
                      >
                        {layer.visible ? '●' : '○'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); toggleLayerLock(layer.id); }}
                        className="text-white/30 hover:text-white/70 transition-colors text-xs w-4"
                        title="Toggle lock"
                      >
                        {layer.locked ? '🔒' : '🔓'}
                      </button>
                      <span className={`flex-1 text-[11px] truncate ${activeLayerId === layer.id ? 'text-purple-300' : 'text-white/55'}`}>{layer.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }}
                        className="text-white/20 hover:text-red-400 transition-colors text-xs"
                        title="Delete layer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Color Palette */}
            {showPalette && (
              <div className="shrink-0">
                <div className="flex items-center px-3 h-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Color Palette</span>
                </div>
                <div className="p-2">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {PALETTE_COLORS.map(color => (
                      <button
                        key={color}
                        title={color}
                        onClick={() => {}}
                        className="w-6 h-6 rounded-sm border border-white/10 transition-transform hover:scale-110 hover:border-white/30"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-white/30">Custom:</span>
                    <input type="color" className="w-6 h-5 rounded cursor-pointer border border-white/10 bg-transparent" />
                  </div>
                </div>

                {/* Object properties */}
                <div className="border-t px-3 py-2 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Object Properties</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[['X', '0px'], ['Y', '0px'], ['W', '100px'], ['H', '100px']].map(([label, val]) => (
                      <div key={label} className="flex items-center gap-1">
                        <span className="text-[9px] text-white/30 w-3">{label}</span>
                        <input defaultValue={val} className="flex-1 text-[10px] bg-white/5 border border-white/10 rounded px-1 py-0.5 text-white/60 outline-none focus:border-purple-400" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/30">Opacity:</span>
                    <input type="range" min={0} max={100} defaultValue={100} className="flex-1 accent-purple-400" />
                    <span className="text-[9px] text-white/40">100%</span>
                  </div>
                </div>

                {/* Align & Distribute */}
                <div className="border-t px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Align & Distribute</div>
                  <div className="grid grid-cols-6 gap-1">
                    {['⇤', '⇔', '⇥', '⇧', '⇕', '⇩'].map((icon, i) => (
                      <button key={i} className="flex items-center justify-center w-full h-6 rounded bg-white/5 hover:bg-purple-500/20 text-white/50 hover:text-purple-300 text-sm transition-all" title="Align">
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {['Group', 'Ungroup', 'Order'].map(action => (
                      <button key={action} className="text-[9px] px-1 py-0.5 rounded bg-white/5 hover:bg-purple-500/20 text-white/40 hover:text-purple-300 transition-all">
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-3 px-4 h-6 shrink-0 border-t text-[10px]" style={{ background: '#12121e', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
        <span>Canvas: 1920 × 1080 px</span>
        <span>|</span>
        <span>{layers.length} Layer{layers.length !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        <span>Excalidraw Vector Engine</span>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
      </div>
    </div>
  );
}
