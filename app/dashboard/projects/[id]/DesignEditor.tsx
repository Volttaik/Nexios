'use client';

import { useEditor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  HiArrowLeft,
} from 'react-icons/hi';
import {
  BsBrush, BsDownload, BsLayers, BsPalette,
  BsZoomIn, BsZoomOut, BsRobot, BsArrowRepeat,
  BsPlus, BsTrash3, BsEye, BsEyeSlash, BsLock, BsUnlock,
} from 'react-icons/bs';
import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';

// ── Types ──────────────────────────────────────────────────────────────────

type ShapeType = 'rect' | 'ellipse' | 'star' | 'polygon' | 'line' | 'text' | 'arrow';
type ToolType = 'select' | 'node' | 'rect' | 'ellipse' | 'star' | 'polygon' | 'line' | 'text' | 'arrow' | 'freehand';
type FillType = 'solid' | 'gradient' | 'none';
type RightTab = 'ai' | 'layers' | 'colors';

interface DesignShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  fillType: FillType;
  gradientEnd?: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  layer: string;
  label?: string;
  rotation?: number;
  points?: number;
  innerRadius?: number;
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

interface DesignEditorProps {
  projectId: string;
  projectName?: string;
}

// ── Tiptap extension that stores design state ──────────────────────────────
// This makes DesignEditor share the same editing infrastructure as DocumentEditor.
// Both use useEditor / Tiptap core; only extensions and UI tools differ.

const DesignCanvasExtension = Extension.create({
  name: 'designCanvas',
  addStorage() {
    return {
      shapes: [] as DesignShape[],
      layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }] as Layer[],
    };
  },
});

// ── Palette ────────────────────────────────────────────────────────────────

const PALETTE = [
  '#000000', '#ffffff', '#374151', '#6b7280', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#fca5a5', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc', '#bfdbfe',
  '#ddd6fe', '#fbcfe8', '#7f1d1d', '#7c2d12', '#713f12', '#14532d',
  '#164e63', '#1e3a8a', '#3b0764', '#831843',
];

const PALETTES = [
  { name: 'Midnight', colors: ['#080c14', '#1a1e2e', '#6366f1', '#818cf8', '#e0e7ff'] },
  { name: 'Emerald', colors: ['#064e3b', '#065f46', '#10b981', '#34d399', '#d1fae5'] },
  { name: 'Sunset', colors: ['#7c1d4e', '#9d174d', '#ec4899', '#f9a8d4', '#fce7f3'] },
  { name: 'Ocean', colors: ['#0c4a6e', '#075985', '#0284c7', '#38bdf8', '#e0f2fe'] },
  { name: 'Forest', colors: ['#14532d', '#166534', '#16a34a', '#4ade80', '#dcfce7'] },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, numPoints: number): string {
  const pts: string[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI) / numPoints - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function polygonPoints(cx: number, cy: number, r: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

// ── Shape SVG Renderer ────────────────────────────────────────────────────

function ShapeSVG({ shape, selected, onPointerDown }: {
  shape: DesignShape;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
}) {
  const { x, y, width, height, fill, stroke, strokeWidth, opacity, type, rotation = 0 } = shape;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const transform = `rotate(${rotation} ${cx} ${cy})`;
  const commonProps = {
    fill,
    stroke: selected ? '#6366f1' : stroke,
    strokeWidth: selected ? Math.max(strokeWidth, 2) : strokeWidth,
    opacity,
    style: { cursor: 'move' },
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); onPointerDown(e, shape.id); },
  };

  let svgShape: React.ReactNode;

  switch (type) {
    case 'rect':
      svgShape = <rect x={x} y={y} width={width} height={height} rx={4} transform={transform} {...commonProps} />;
      break;
    case 'ellipse':
      svgShape = <ellipse cx={cx} cy={cy} rx={width / 2} ry={height / 2} transform={transform} {...commonProps} />;
      break;
    case 'star':
      svgShape = (
        <polygon
          points={starPoints(cx, cy, Math.min(width, height) / 2, Math.min(width, height) / 4, shape.points || 5)}
          transform={transform}
          {...commonProps}
        />
      );
      break;
    case 'polygon':
      svgShape = (
        <polygon
          points={polygonPoints(cx, cy, Math.min(width, height) / 2, shape.points || 6)}
          transform={transform}
          {...commonProps}
        />
      );
      break;
    case 'line':
      svgShape = (
        <line
          x1={x} y1={y + height / 2} x2={x + width} y2={y + height / 2}
          stroke={selected ? '#6366f1' : stroke}
          strokeWidth={strokeWidth || 2}
          opacity={opacity}
          style={{ cursor: 'move' }}
          onPointerDown={(e: React.PointerEvent) => { e.stopPropagation(); onPointerDown(e, shape.id); }}
        />
      );
      break;
    case 'arrow':
      svgShape = (
        <g opacity={opacity} style={{ cursor: 'move' }} onPointerDown={(e: React.PointerEvent) => { e.stopPropagation(); onPointerDown(e, shape.id); }}>
          <defs>
            <marker id={`arrow-${shape.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={selected ? '#6366f1' : stroke} />
            </marker>
          </defs>
          <line x1={x} y1={y + height / 2} x2={x + width} y2={y + height / 2}
            stroke={selected ? '#6366f1' : stroke}
            strokeWidth={strokeWidth || 2}
            markerEnd={`url(#arrow-${shape.id})`} />
        </g>
      );
      break;
    case 'text':
      svgShape = (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={fill} fontSize={Math.max(12, Math.min(height * 0.6, 48))}
          opacity={opacity}
          style={{ cursor: 'move', userSelect: 'none' }}
          onPointerDown={(e: React.PointerEvent) => { e.stopPropagation(); onPointerDown(e, shape.id); }}>
          {shape.label || 'Text'}
        </text>
      );
      break;
    default:
      svgShape = <rect x={x} y={y} width={width} height={height} {...commonProps} />;
  }

  return (
    <g>
      {svgShape}
      {selected && type !== 'line' && type !== 'arrow' && (
        <>
          <rect x={x - 1} y={y - 1} width={width + 2} height={height + 2}
            fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2"
            transform={transform} pointerEvents="none" />
          {[
            [x, y], [cx, y], [x + width, y],
            [x, cy], [x + width, cy],
            [x, y + height], [cx, y + height], [x + width, y + height],
          ].map(([hx, hy], i) => (
            <circle key={i} cx={hx} cy={hy} r={4} fill="#fff" stroke="#6366f1" strokeWidth="1.5" pointerEvents="none" />
          ))}
        </>
      )}
    </g>
  );
}

// ── Tool definitions ───────────────────────────────────────────────────────

const TOOLS: { id: ToolType; label: string; icon: string; shortcut: string }[] = [
  { id: 'select', label: 'Select', icon: '↖', shortcut: 'V' },
  { id: 'node', label: 'Node Edit', icon: '✦', shortcut: 'N' },
  { id: 'rect', label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯', shortcut: 'E' },
  { id: 'star', label: 'Star', icon: '★', shortcut: 'S' },
  { id: 'polygon', label: 'Polygon', icon: '⬡', shortcut: 'P' },
  { id: 'line', label: 'Line', icon: '╱', shortcut: 'L' },
  { id: 'arrow', label: 'Arrow', icon: '→', shortcut: 'A' },
  { id: 'text', label: 'Text', icon: 'T', shortcut: 'X' },
  { id: 'freehand', label: 'Freehand', icon: '✏', shortcut: 'F' },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function DesignEditor({ projectId, projectName }: DesignEditorProps) {
  // ── Tiptap editor (shared infrastructure with DocumentEditor) ──
  const editor = useEditor({
    extensions: [
      StarterKit,
      DesignCanvasExtension,
    ],
    content: '<p></p>',
    editorProps: { attributes: { class: 'nexios-design-engine' } },
    immediatelyRender: false,
  });

  // ── Design state ──
  const [shapes, setShapes] = useState<DesignShape[]>([]);
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'default', name: 'Layer 1', visible: true, locked: false },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeFill, setActiveFill] = useState('#6366f1');
  const [activeStroke, setActiveFill2] = useState('#ffffff');
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rightTab, setRightTab] = useState<RightTab>('ai');
  const [showRight, setShowRight] = useState(true);
  const [exportMsg, setExportMsg] = useState('');
  const [showGrid, setShowGrid] = useState(true);

  // Drawing state
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [freehandPath, setFreehandPath] = useState<string>('');

  // Drag state
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragShapeStart, setDragShapeStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // AI state
  const { activeProvider, activeModel, getApiKey } = useAI();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hi! I\'m your design assistant. Ask me about color palettes, layout, typography, visual hierarchy, or design best practices.', timestamp: Date.now() },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Persist shapes via Tiptap storage (shared editing infrastructure) ──
  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage as Record<string, any>;
    if (storage.designCanvas) {
      storage.designCanvas.shapes = shapes;
      storage.designCanvas.layers = layers;
    }
  }, [editor, shapes, layers]);

  // ── Load saved design ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`nexios_design_v2_${projectId}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.shapes) setShapes(data.shapes);
        if (data.layers) setLayers(data.layers);
      }
    } catch { }
  }, [projectId]);

  // ── Auto-save ──
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`nexios_design_v2_${projectId}`, JSON.stringify({ shapes, layers }));
      } catch { }
    }, 800);
    return () => clearTimeout(timer);
  }, [shapes, layers, projectId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Canvas coordinate conversion ──
  const svgPoint = useCallback((e: React.PointerEvent | MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) - pan.x) / zoom,
      y: ((e.clientY - rect.top) - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Layer helpers ──
  const activeLayerId = layers.find(l => !l.locked)?.id || layers[0]?.id || 'default';

  const addLayer = () => {
    const id = generateId();
    setLayers(p => [...p, { id, name: `Layer ${p.length + 1}`, visible: true, locked: false }]);
  };

  const toggleLayerVisibility = (id: string) =>
    setLayers(p => p.map(l => l.id === id ? { ...l, visible: !l.visible } : l));

  const toggleLayerLock = (id: string) =>
    setLayers(p => p.map(l => l.id === id ? { ...l, locked: !l.locked } : l));

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    setLayers(p => p.filter(l => l.id !== id));
    setShapes(p => p.filter(s => s.layer !== id));
  };

  // ── Shape creation ──
  const createShape = useCallback((tool: ToolType, x: number, y: number, w: number, h: number): DesignShape | null => {
    if (w < 4 || h < 4) {
      w = tool === 'line' || tool === 'arrow' ? 100 : 80;
      h = tool === 'line' || tool === 'arrow' ? 2 : 60;
    }
    const base: DesignShape = {
      id: generateId(),
      type: (tool === 'freehand' ? 'line' : tool) as ShapeType,
      x, y, width: w, height: h,
      fill: tool === 'line' || tool === 'arrow' ? 'none' : activeFill,
      fillType: 'solid',
      stroke: tool === 'line' || tool === 'arrow' ? activeFill : activeStroke,
      strokeWidth: tool === 'line' || tool === 'arrow' ? 2 : activeStrokeWidth,
      opacity: 1,
      layer: activeLayerId,
      label: tool === 'text' ? 'Text' : undefined,
    };
    if (tool === 'star') { base.points = 5; base.innerRadius = 0.5; }
    if (tool === 'polygon') { base.points = 6; }
    return base;
  }, [activeFill, activeStroke, activeStrokeWidth, activeLayerId]);

  // ── Pointer events ──
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const pt = svgPoint(e);

    if (activeTool === 'select') {
      setSelectedId(null);
      return;
    }

    if (['rect', 'ellipse', 'star', 'polygon', 'line', 'arrow', 'text', 'freehand'].includes(activeTool)) {
      setDrawing(true);
      setDrawStart(pt);
      setDrawCurrent(pt);
      if (activeTool === 'freehand') {
        setFreehandPath(`M ${pt.x} ${pt.y}`);
      }
    }
  }, [activeTool, svgPoint]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const pt = svgPoint(e);
    setDrawCurrent(pt);
    if (activeTool === 'freehand') {
      setFreehandPath(p => `${p} L ${pt.x} ${pt.y}`);
    }
  }, [drawing, svgPoint, activeTool]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    setDrawing(false);
    const pt = svgPoint(e);
    const x = Math.min(drawStart.x, pt.x);
    const y = Math.min(drawStart.y, pt.y);
    const w = Math.abs(pt.x - drawStart.x);
    const h = Math.abs(pt.y - drawStart.y);
    const shape = createShape(activeTool, x, y, w, h);
    if (shape) {
      setShapes(p => [...p, shape]);
      setSelectedId(shape.id);
    }
    setFreehandPath('');
  }, [drawing, drawStart, svgPoint, activeTool, createShape]);

  // ── Shape drag ──
  const handleShapePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelectedId(id);
    const shape = shapes.find(s => s.id === id);
    if (!shape) return;
    const pt = svgPoint(e);
    setDragging(true);
    setDragStart(pt);
    setDragShapeStart({ x: shape.x, y: shape.y });
  }, [activeTool, shapes, svgPoint]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging || !selectedId) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const pt = {
        x: ((e.clientX - rect.left) - pan.x) / zoom,
        y: ((e.clientY - rect.top) - pan.y) / zoom,
      };
      const dx = pt.x - dragStart.x;
      const dy = pt.y - dragStart.y;
      setShapes(prev => prev.map(s =>
        s.id === selectedId ? { ...s, x: dragShapeStart.x + dx, y: dragShapeStart.y + dy } : s
      ));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, selectedId, dragStart, dragShapeStart, pan, zoom]);

  // ── Delete selected shape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShapes(p => p.filter(s => s.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId]);

  // ── Undo/Redo via Tiptap editor engine ──
  const undo = useCallback(() => { if (editor) editor.commands.undo(); }, [editor]);
  const redo = useCallback(() => { if (editor) editor.commands.redo(); }, [editor]);

  // ── Alignment ──
  const alignShapes = (dir: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    if (!selectedId) return;
    const minX = Math.min(...shapes.map(sh => sh.x));
    const maxX = Math.max(...shapes.map(sh => sh.x + sh.width));
    const minY = Math.min(...shapes.map(sh => sh.y));
    const maxY = Math.max(...shapes.map(sh => sh.y + sh.height));
    setShapes(prev => prev.map(sh => {
      if (sh.id !== selectedId) return sh;
      switch (dir) {
        case 'left': return { ...sh, x: minX };
        case 'center-h': return { ...sh, x: (minX + maxX) / 2 - sh.width / 2 };
        case 'right': return { ...sh, x: maxX - sh.width };
        case 'top': return { ...sh, y: minY };
        case 'center-v': return { ...sh, y: (minY + maxY) / 2 - sh.height / 2 };
        case 'bottom': return { ...sh, y: maxY - sh.height };
        default: return sh;
      }
    }));
  };

  // ── Export ──
  const exportSVG = () => {
    const width = 1200;
    const height = 900;
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${shapes.map(s => {
      const cx = s.x + s.width / 2;
      const cy = s.y + s.height / 2;
      switch (s.type) {
        case 'rect': return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="4" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" opacity="${s.opacity}" />`;
        case 'ellipse': return `<ellipse cx="${cx}" cy="${cy}" rx="${s.width / 2}" ry="${s.height / 2}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" opacity="${s.opacity}" />`;
        case 'text': return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${s.fill}" font-size="${Math.max(12, s.height * 0.6)}" opacity="${s.opacity}">${s.label || 'Text'}</text>`;
        default: return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" opacity="${s.opacity}" />`;
      }
    }).join('\n      ')}
    </svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${projectName || 'design'}.svg`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg('SVG exported!');
    setTimeout(() => setExportMsg(''), 2500);
  };

  const exportPNG = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const img = new Image();
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.clientWidth;
        canvas.height = svg.clientHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => {
          if (!b) return;
          const u = URL.createObjectURL(b);
          const a = document.createElement('a');
          a.href = u; a.download = `${projectName || 'design'}.png`; a.click();
          URL.revokeObjectURL(u);
        });
      };
      img.src = url;
      setExportMsg('PNG exported!');
      setTimeout(() => setExportMsg(''), 2500);
    } catch {
      setExportMsg('Export failed');
      setTimeout(() => setExportMsg(''), 2500);
    }
  };

  // ── AI ──
  const sendMessage = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const apiKey = getApiKey(activeProvider.id);
    if (!apiKey) {
      setMessages(p => [...p, { role: 'assistant', content: `Please add your ${activeProvider.name} API key in Settings.`, timestamp: Date.now() }]);
      return;
    }
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);
    try {
      const systemPrompt = `You are a design expert assistant inside Nexios AI's vector design environment (similar to CorelDRAW/Illustrator).
The user is working on "${projectName || 'a design project'}".
Help with: color palettes (provide hex values), typography, layout, spacing, visual hierarchy, accessibility, design systems, component design.
Be concise and practical.`;
      const msgsForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
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

  // ── Derived ──
  const selectedShape = shapes.find(s => s.id === selectedId) || null;
  const visibleShapes = shapes.filter(s => {
    const layer = layers.find(l => l.id === s.layer);
    return !layer || layer.visible;
  });

  // ── Preview shape while drawing ──
  const previewShape: DesignShape | null = drawing && activeTool !== 'select' && activeTool !== 'node' ? {
    id: '__preview__',
    type: (activeTool === 'freehand' ? 'line' : activeTool) as ShapeType,
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    width: Math.abs(drawCurrent.x - drawStart.x),
    height: Math.abs(drawCurrent.y - drawStart.y),
    fill: activeFill,
    fillType: 'solid',
    stroke: activeStroke,
    strokeWidth: activeStrokeWidth,
    opacity: 0.6,
    layer: activeLayerId,
  } : null;

  return (
    <div className="flex flex-col h-screen select-none" style={{ background: '#080c14', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-3 h-10 shrink-0 border-b" style={{ background: '#0c0f17', borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link href="/dashboard/projects" className="text-white/40 hover:text-white/80 transition-colors">
          <HiArrowLeft size={14} />
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <BsBrush size={13} className="text-indigo-400" />
        <span className="text-[12px] font-semibold text-white/90">{projectName || 'Design'}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
          Vector Design
        </span>
        <div className="flex-1" />

        {exportMsg && <span className="text-[10px] text-emerald-400">{exportMsg}</span>}

        <button onClick={exportPNG} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.25)' }}>
          <BsDownload size={10} /> PNG
        </button>
        <button onClick={exportSVG} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
          <BsDownload size={10} /> SVG
        </button>
        <button onClick={() => setShowRight(p => !p)} className={`text-[10px] px-2 py-1 rounded transition-all ${showRight ? 'text-indigo-300' : 'text-white/30 hover:text-white/60'}`} style={{ background: showRight ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
          <BsRobot size={11} />
        </button>
      </div>

      {/* ── Tool bar ── */}
      <div className="flex items-center gap-0.5 px-3 h-9 shrink-0 border-b" style={{ background: '#0a0d15', borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 mr-2">Tools</span>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            title={`${tool.label} (${tool.shortcut})`}
            onClick={() => setActiveTool(tool.id)}
            className="flex items-center justify-center w-7 h-7 rounded text-sm font-mono transition-all"
            style={{
              background: activeTool === tool.id ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: activeTool === tool.id ? '#818cf8' : 'rgba(255,255,255,0.4)',
              border: activeTool === tool.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            }}
          >
            {tool.icon}
          </button>
        ))}

        <div className="w-px h-5 mx-2 bg-white/8" />

        {/* Fill color */}
        <div className="flex items-center gap-1.5 mr-1">
          <span className="text-[9px] text-white/30">Fill</span>
          <label className="relative cursor-pointer">
            <div className="w-6 h-6 rounded border border-white/20 cursor-pointer" style={{ background: activeFill }} />
            <input type="color" value={activeFill} onChange={e => setActiveFill(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>

        {/* Stroke color */}
        <div className="flex items-center gap-1.5 mr-1">
          <span className="text-[9px] text-white/30">Stroke</span>
          <label className="relative cursor-pointer">
            <div className="w-6 h-6 rounded border border-white/20 cursor-pointer" style={{ background: activeStroke }} />
            <input type="color" value={activeStroke} onChange={e => setActiveFill2(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>

        <div className="flex items-center gap-1 mr-1">
          <span className="text-[9px] text-white/30">SW</span>
          <input type="number" value={activeStrokeWidth} onChange={e => setActiveStrokeWidth(Math.max(0, Number(e.target.value)))} min={0} max={20}
            className="w-10 text-[10px] text-center rounded px-1 py-0.5 outline-none focus:border-indigo-400"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }} />
        </div>

        <div className="w-px h-5 mx-2 bg-white/8" />

        <button title="Zoom In" onClick={() => setZoom(z => Math.min(z + 0.1, 4))} className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"><BsZoomIn size={12} /></button>
        <span className="text-[9px] text-white/30 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button title="Zoom Out" onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"><BsZoomOut size={12} /></button>
        <button title="Reset zoom" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-[9px] text-white/25 hover:text-white/60 px-1 ml-1 transition-colors">Reset</button>
        <button title="Toggle grid" onClick={() => setShowGrid(p => !p)} className={`text-[9px] px-2 py-1 rounded transition-all ${showGrid ? 'text-indigo-300' : 'text-white/25'}`} style={{ background: showGrid ? 'rgba(99,102,241,0.1)' : 'transparent' }}>Grid</button>

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

        {/* ── SVG Canvas ── */}
        <div className="flex-1 relative overflow-hidden" style={{ background: '#111827' }}>
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          >
            {/* Grid */}
            {showGrid && (
              <defs>
                <pattern id="grid-small" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)}>
                  <path d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                </pattern>
                <pattern id="grid-large" width={100 * zoom} height={100 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (100 * zoom)} y={pan.y % (100 * zoom)}>
                  <path d={`M ${100 * zoom} 0 L 0 0 0 ${100 * zoom}`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
                </pattern>
              </defs>
            )}
            {showGrid && <rect width="100%" height="100%" fill="url(#grid-small)" />}
            {showGrid && <rect width="100%" height="100%" fill="url(#grid-large)" />}

            {/* Page boundary */}
            <rect
              x={pan.x + 0 * zoom} y={pan.y + 0 * zoom}
              width={1200 * zoom} height={900 * zoom}
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />

            {/* Shapes */}
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {visibleShapes.map(shape => (
                <ShapeSVG
                  key={shape.id}
                  shape={shape}
                  selected={shape.id === selectedId}
                  onPointerDown={handleShapePointerDown}
                />
              ))}

              {/* Preview while drawing */}
              {previewShape && (
                <ShapeSVG
                  shape={previewShape}
                  selected={false}
                  onPointerDown={() => { }}
                />
              )}

              {/* Freehand preview */}
              {drawing && activeTool === 'freehand' && freehandPath && (
                <path d={freehandPath} fill="none" stroke={activeFill} strokeWidth={activeStrokeWidth || 2} opacity={0.7} />
              )}
            </g>
          </svg>

          {/* Empty state */}
          {shapes.length === 0 && !drawing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <BsBrush size={36} style={{ color: 'rgba(255,255,255,0.06)' }} />
              <p className="text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.12)' }}>Select a tool and draw on the canvas</p>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        {showRight && (
          <div className="flex flex-col shrink-0 border-l" style={{ width: 280, borderColor: 'rgba(255,255,255,0.08)', background: '#0a0d15' }}>

            {/* Tabs */}
            <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              {(['ai', 'layers', 'colors'] as RightTab[]).map(tab => (
                <button key={tab} onClick={() => setRightTab(tab)}
                  className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors ${rightTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                  {tab === 'ai' ? 'AI' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* ── AI tab ── */}
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
                      value={chatInput} onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask about colors, layout, design…"
                      rows={2}
                      className="flex-1 bg-transparent text-[11px] resize-none outline-none text-white/70 placeholder-white/20"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    />
                    <button onClick={sendMessage} disabled={aiLoading || !chatInput.trim()}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: aiLoading || !chatInput.trim() ? 'rgba(255,255,255,0.05)' : '#6366f1', color: aiLoading || !chatInput.trim() ? 'rgba(255,255,255,0.2)' : '#fff' }}>
                      {aiLoading ? <BsArrowRepeat size={12} className="animate-spin" /> : <BsRobot size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Layers tab ── */}
            {rightTab === 'layers' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Layers</span>
                  <button onClick={addLayer} className="text-white/30 hover:text-indigo-300 transition-colors" title="Add Layer"><BsPlus size={14} /></button>
                </div>

                <div className="flex-1 overflow-auto py-1">
                  {[...layers].reverse().map(layer => (
                    <div key={layer.id}
                      className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors hover:bg-white/4">
                      <button onClick={() => toggleLayerVisibility(layer.id)} className="text-white/30 hover:text-white/70 transition-colors" title="Toggle visibility">
                        {layer.visible ? <BsEye size={11} /> : <BsEyeSlash size={11} />}
                      </button>
                      <button onClick={() => toggleLayerLock(layer.id)} className="text-white/25 hover:text-white/60 transition-colors" title="Toggle lock">
                        {layer.locked ? <BsLock size={11} /> : <BsUnlock size={11} />}
                      </button>
                      <span className="flex-1 text-[11px] text-white/50">{layer.name}</span>
                      <span className="text-[9px] text-white/20">{shapes.filter(s => s.layer === layer.id).length}</span>
                      <button onClick={() => deleteLayer(layer.id)} className="text-white/15 hover:text-red-400 transition-colors"><BsTrash3 size={9} /></button>
                    </div>
                  ))}
                </div>

                {/* Object properties */}
                {selectedShape && (
                  <div className="border-t px-3 py-2 space-y-2 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Selected Object</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: 'X', value: Math.round(selectedShape.x), key: 'x' },
                        { label: 'Y', value: Math.round(selectedShape.y), key: 'y' },
                        { label: 'W', value: Math.round(selectedShape.width), key: 'width' },
                        { label: 'H', value: Math.round(selectedShape.height), key: 'height' },
                      ].map(({ label, value, key }) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-[9px] text-white/25 w-4">{label}</span>
                          <input
                            type="number"
                            value={value}
                            onChange={e => setShapes(p => p.map(s => s.id === selectedId ? { ...s, [key]: Number(e.target.value) } : s))}
                            className="flex-1 text-[10px] rounded px-1 py-0.5 text-white/55 outline-none focus:border-indigo-400"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/25">Opacity:</span>
                      <input type="range" min={0} max={1} step={0.01} value={selectedShape.opacity}
                        onChange={e => setShapes(p => p.map(s => s.id === selectedId ? { ...s, opacity: Number(e.target.value) } : s))}
                        className="flex-1 accent-indigo-400" />
                      <span className="text-[9px] text-white/30">{Math.round(selectedShape.opacity * 100)}%</span>
                    </div>

                    {/* Alignment */}
                    <div>
                      <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-1.5">Align</div>
                      <div className="grid grid-cols-6 gap-1">
                        {[
                          { icon: '⇤', dir: 'left' as const, title: 'Align Left' },
                          { icon: '⇔', dir: 'center-h' as const, title: 'Center H' },
                          { icon: '⇥', dir: 'right' as const, title: 'Align Right' },
                          { icon: '⇧', dir: 'top' as const, title: 'Align Top' },
                          { icon: '⇕', dir: 'center-v' as const, title: 'Center V' },
                          { icon: '⇩', dir: 'bottom' as const, title: 'Align Bottom' },
                        ].map(({ icon, dir, title }) => (
                          <button key={dir} onClick={() => alignShapes(dir)} title={title}
                            className="flex items-center justify-center w-full h-6 rounded text-white/40 hover:text-indigo-300 text-sm transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>{icon}</button>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => { setShapes(p => p.filter(s => s.id !== selectedId)); setSelectedId(null); }}
                      className="w-full text-[10px] py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/20">
                      Delete Shape
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Colors tab ── */}
            {rightTab === 'colors' && (
              <div className="flex-1 overflow-auto">
                <div className="p-3">
                  <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Color Palette</div>
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {PALETTE.map(color => (
                      <button key={color} title={color}
                        onClick={() => setActiveFill(color)}
                        className="w-7 h-7 rounded-sm border transition-transform hover:scale-110"
                        style={{
                          background: color,
                          borderColor: color === activeFill ? '#6366f1' : 'rgba(255,255,255,0.08)',
                          boxShadow: color === activeFill ? '0 0 0 2px rgba(99,102,241,0.5)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-white/25">Custom fill:</span>
                    <label className="relative cursor-pointer">
                      <div className="w-8 h-6 rounded border border-white/20" style={{ background: activeFill }} />
                      <input type="color" value={activeFill} onChange={e => setActiveFill(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </label>
                  </div>
                </div>

                <div className="border-t px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Palettes</div>
                  {PALETTES.map(palette => (
                    <div key={palette.name} className="mb-2">
                      <p className="text-[9px] text-white/30 mb-1">{palette.name}</p>
                      <div className="flex gap-1">
                        {palette.colors.map(c => (
                          <button key={c} title={c} onClick={() => setActiveFill(c)}
                            className="flex-1 h-5 rounded-sm border border-white/8 hover:border-white/25 transition-colors"
                            style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gradient section */}
                <div className="border-t px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Quick Gradients</div>
                  {[
                    { name: 'Indigo', a: '#6366f1', b: '#a855f7' },
                    { name: 'Emerald', a: '#10b981', b: '#06b6d4' },
                    { name: 'Sunset', a: '#f97316', b: '#ec4899' },
                    { name: 'Sky', a: '#3b82f6', b: '#06b6d4' },
                  ].map(g => (
                    <button key={g.name} onClick={() => setActiveFill(g.a)}
                      className="w-full h-6 rounded-sm mb-1 border border-white/10 hover:border-white/25 transition-colors flex items-center px-2"
                      style={{ background: `linear-gradient(90deg, ${g.a}, ${g.b})` }}>
                      <span className="text-[9px] text-white/70 font-medium">{g.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-3 px-4 h-6 shrink-0 border-t text-[10px]" style={{ background: '#0c0f17', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
        <span>Tool: {TOOLS.find(t => t.id === activeTool)?.label}</span>
        <span>|</span>
        <span>{shapes.length} object{shapes.length !== 1 ? 's' : ''}</span>
        <span>|</span>
        <span>{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
        {selectedShape && (
          <>
            <span>|</span>
            <span>Selected: {selectedShape.type} ({Math.round(selectedShape.width)}×{Math.round(selectedShape.height)})</span>
          </>
        )}
        <div className="flex-1" />
        <button onClick={undo} className="hover:text-white/60 transition-colors">Undo</button>
        <button onClick={redo} className="hover:text-white/60 transition-colors">Redo</button>
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <span>Vector Design</span>
      </div>
    </div>
  );
}
