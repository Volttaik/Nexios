'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';

// Excalidraw must be loaded client-side only
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  { ssr: false, loading: () => <DesignLoading /> }
);

function DesignLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: '#0c0f17', color: 'rgba(255,255,255,0.4)' }}>
      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Loading design canvas…</p>
    </div>
  );
}

interface DesignEditorProps {
  projectId: string;
  projectName?: string;
}

export default function DesignEditor({ projectId, projectName }: DesignEditorProps) {
  const [exportMsg, setExportMsg] = useState('');

  // Load saved scene from localStorage
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
      if (!saved?.elements?.length) { setExportMsg('Nothing to export yet'); setTimeout(() => setExportMsg(''), 2000); return; }
      const svg = await (mod as any).exportToSvg({ elements: saved.elements, appState: { ...saved.appState, exportWithDarkMode: false } });
      const svgStr = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName || 'design'}.svg`; a.click();
      URL.revokeObjectURL(url);
      setExportMsg('SVG exported!');
      setTimeout(() => setExportMsg(''), 2000);
    } catch { setExportMsg('Export failed'); setTimeout(() => setExportMsg(''), 2000); }
  }, [getSavedScene, projectName]);

  const exportPNG = useCallback(async () => {
    try {
      const mod = await import('@excalidraw/excalidraw');
      const saved = getSavedScene();
      if (!saved?.elements?.length) { setExportMsg('Nothing to export yet'); setTimeout(() => setExportMsg(''), 2000); return; }
      const blob = await (mod as any).exportToBlob({ elements: saved.elements, appState: { ...saved.appState }, quality: 1, type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName || 'design'}.png`; a.click();
      URL.revokeObjectURL(url);
      setExportMsg('PNG exported!');
      setTimeout(() => setExportMsg(''), 2000);
    } catch { setExportMsg('Export failed'); setTimeout(() => setExportMsg(''), 2000); }
  }, [getSavedScene, projectName]);

  const saved = getSavedScene();

  return (
    <div className="flex flex-col h-full" style={{ background: '#0c0f17' }}>
      {/* Toolbar */}
      <div className="shrink-0 h-9 flex items-center gap-2 px-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#111520' }}>
        <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {projectName || 'Design'} — Vector Canvas
        </span>
        <div className="flex-1" />
        {exportMsg && <span className="text-[10px] text-green-400">{exportMsg}</span>}
        <button onClick={exportPNG}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md transition-colors"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
          ↓ PNG
        </button>
        <button onClick={exportSVG}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md transition-colors"
          style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
          ↓ SVG
        </button>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1 relative overflow-hidden">
        <Excalidraw
          initialData={saved ? { elements: saved.elements, appState: { ...saved.appState, theme: 'dark' } } : { appState: { theme: 'dark', viewBackgroundColor: '#0c0f17' } }}
          onChange={handleChange}
          UIOptions={{
            canvasActions: { export: false, saveAsImage: false },
          }}
          theme="dark"
        />
      </div>
    </div>
  );
}
