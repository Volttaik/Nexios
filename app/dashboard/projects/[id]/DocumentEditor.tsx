'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { useEffect, useCallback, useState, useRef } from 'react';
import {
  BsTypeBold, BsTypeItalic, BsTypeUnderline, BsTypeStrikethrough,
  BsListUl, BsListOl, BsTextLeft, BsTextCenter, BsTextRight, BsJustify,
  BsLink45Deg, BsImage, BsTable,
  BsArrowCounterclockwise, BsArrowClockwise,
  BsPrinter, BsDownload, BsFileEarmark, BsFileEarmarkText,
  BsPaintBucket, BsHighlighter, BsTextIndentLeft, BsTextIndentRight,
  BsCardText, BsScissors, BsClipboard, BsFiles, BsFonts,
} from 'react-icons/bs';
import { HiArrowLeft, HiOutlineDocumentText } from 'react-icons/hi';
import Link2 from 'next/link';

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, string>) => {
            if (!attrs.fontSize) return {};
            return { style: `font-size: ${attrs.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: { chain: () => any }) =>
        chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }: { chain: () => any }) =>
        chain().setMark('textStyle', { fontSize: null }).run(),
    } as any;
  },
});

interface DocumentEditorProps {
  content: string;
  onChange: (html: string) => void;
  projectName?: string;
  projectId: string;
}

const FONT_FAMILIES = [
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 54, 60, 72];

const LINE_SPACINGS = [
  { label: 'Single', value: '1.2' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: 'Double', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: 'Triple', value: '3' },
];

function ToolBtn({
  onClick, active = false, disabled = false, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center w-7 h-7 rounded transition-all select-none text-sm"
      style={{
        background: active ? '#dbeafe' : 'transparent',
        color: active ? '#1d4ed8' : disabled ? '#d1d5db' : '#374151',
        border: active ? '1px solid #bfdbfe' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 mx-0.5 bg-gray-200" />;
}

function DropdownBtn({ label, children, width = 180 }: { label: React.ReactNode; children: React.ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        className="flex items-center gap-1 h-7 px-2 rounded text-xs text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all"
      >
        {label}
        <span className="text-gray-400 text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 rounded-lg shadow-xl border border-gray-200 bg-white overflow-hidden" style={{ width, maxHeight: 220, overflowY: 'auto' }} onMouseDown={e => e.preventDefault()}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function DocumentEditor({ content, onChange, projectName, projectId }: DocumentEditorProps) {
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Georgia, serif');
  const [lineSpacing, setLineSpacing] = useState('1.5');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your document…' }),
    ],
    content: content || '',
    editorProps: { attributes: { class: 'nexdoc-editor', spellcheck: 'true' } },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html);
      setSaveStatus('unsaved');
      const text = e.getText();
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
      setCharCount(text.length);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        localStorage.setItem(`nexios_doc_${projectId}`, html);
        setSaveStatus('saved');
      }, 1500);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  const applyFontSize = useCallback((size: number) => {
    setFontSize(size);
    if (editor) (editor.chain().focus() as any).setFontSize(`${size}px`).run();
  }, [editor]);

  const applyFontFamily = useCallback((family: string) => {
    setFontFamily(family);
    if (editor) editor.chain().focus().setFontFamily(family).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL:');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('Link URL:', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      '<table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></tbody></table>'
    ).run();
  }, [editor]);

  const exportTXT = useCallback(() => {
    if (!editor) return;
    const blob = new Blob([editor.getText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${projectName || 'document'}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [editor, projectName]);

  const exportHTML = useCallback(() => {
    if (!editor) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${projectName || 'Document'}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:0 2rem;font-size:16px;line-height:1.8;color:#111}</style></head><body>${editor.getHTML()}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${projectName || 'document'}.html`; a.click();
    URL.revokeObjectURL(url);
  }, [editor, projectName]);

  const saveDoc = useCallback(() => {
    if (!editor) return;
    setSaveStatus('saving');
    localStorage.setItem(`nexios_doc_${projectId}`, editor.getHTML());
    setTimeout(() => setSaveStatus('saved'), 500);
  }, [editor, projectId]);

  if (!editor) return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-gray-400">Loading editor…</div>
    </div>
  );

  const h = editor.isActive('heading', { level: 1 }) ? '1'
    : editor.isActive('heading', { level: 2 }) ? '2'
    : editor.isActive('heading', { level: 3 }) ? '3'
    : editor.isActive('heading', { level: 4 }) ? '4' : '0';

  return (
    <div className="flex flex-col h-screen" style={{ background: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @media print { .no-print { display: none !important; } }
        .nexdoc-editor { outline: none; font-size: ${fontSize}px; line-height: ${lineSpacing}; min-height: 700px; color: #111827; }
        .nexdoc-editor h1 { font-size: 2em; font-weight: 700; margin: 1rem 0 0.5rem; }
        .nexdoc-editor h2 { font-size: 1.5em; font-weight: 600; margin: 0.9rem 0 0.4rem; }
        .nexdoc-editor h3 { font-size: 1.25em; font-weight: 600; margin: 0.8rem 0 0.35rem; }
        .nexdoc-editor h4 { font-size: 1.1em; font-weight: 600; margin: 0.7rem 0 0.3rem; }
        .nexdoc-editor p { margin: 0.4rem 0; }
        .nexdoc-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.4rem 0; }
        .nexdoc-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4rem 0; }
        .nexdoc-editor li { margin: 0.2rem 0; }
        .nexdoc-editor blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; margin: 0.75rem 0; color: #4b5563; font-style: italic; }
        .nexdoc-editor a { color: #2563eb; text-decoration: underline; }
        .nexdoc-editor table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .nexdoc-editor td, .nexdoc-editor th { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; }
        .nexdoc-editor img { max-width: 100%; border-radius: 4px; margin: 0.5rem 0; }
        .nexdoc-editor mark { background: #fef08a; padding: 0.05em 0; border-radius: 2px; }
        .nexdoc-editor s { color: #9ca3af; }
        .nexdoc-editor hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
        .tiptap p.is-editor-empty:first-child::before { color: #9ca3af; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
      `}</style>

      {/* Title bar */}
      <div className="no-print flex items-center gap-3 px-4 h-10 bg-blue-700 text-white shrink-0">
        <Link2 href="/dashboard/projects" className="text-white/70 hover:text-white transition-colors">
          <HiArrowLeft size={16} />
        </Link2>
        <HiOutlineDocumentText size={15} className="text-blue-200" />
        <span className="text-sm font-semibold">{projectName || 'Untitled Document'}</span>
        <span className="text-blue-300 text-xs">— Word Processor</span>
        <div className="flex-1" />
        <span className={`text-xs px-2 py-0.5 rounded-full ${saveStatus === 'saved' ? 'bg-blue-600 text-blue-100' : saveStatus === 'saving' ? 'bg-yellow-500 text-yellow-900' : 'bg-orange-500 text-white'}`}>
          {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving…' : '● Unsaved'}
        </span>
      </div>

      {/* Ribbon: Row 1 — File & Edit menus */}
      <div className="no-print bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-100">
          <DropdownBtn label={<><BsFileEarmark size={12} className="mr-1" /> File</>} width={200}>
            <div className="py-1">
              <button onMouseDown={e => { e.preventDefault(); saveDoc(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsFileEarmark size={11} /> New Document</button>
              <button onMouseDown={e => { e.preventDefault(); saveDoc(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsFileEarmarkText size={11} /> Save</button>
              <div className="my-1 border-t border-gray-100" />
              <button onMouseDown={e => { e.preventDefault(); exportHTML(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsDownload size={11} /> Export as HTML</button>
              <button onMouseDown={e => { e.preventDefault(); exportTXT(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsDownload size={11} /> Export as TXT</button>
              <button onMouseDown={e => { e.preventDefault(); window.print(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsPrinter size={11} /> Print / Save PDF</button>
            </div>
          </DropdownBtn>

          <DropdownBtn label={<><BsScissors size={12} className="mr-1" /> Edit</>} width={180}>
            <div className="py-1">
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('cut'); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsScissors size={11} /> Cut</button>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('copy'); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsFiles size={11} /> Copy</button>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('paste'); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsClipboard size={11} /> Paste</button>
              <div className="my-1 border-t border-gray-100" />
              <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsArrowCounterclockwise size={11} /> Undo</button>
              <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsArrowClockwise size={11} /> Redo</button>
            </div>
          </DropdownBtn>

          <DropdownBtn label={<><BsCardText size={12} className="mr-1" /> Insert</>} width={200}>
            <div className="py-1">
              <button onMouseDown={e => { e.preventDefault(); insertTable(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsTable size={11} /> Insert Table</button>
              <button onMouseDown={e => { e.preventDefault(); addImage(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsImage size={11} /> Insert Image</button>
              <button onMouseDown={e => { e.preventDefault(); setLink(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"><BsLink45Deg size={11} /> Insert Hyperlink</button>
              <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700">— Page Separator</button>
              <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700">❝ Blockquote</button>
            </div>
          </DropdownBtn>

          <DropdownBtn label={<><BsFonts size={12} className="mr-1" /> Format</>} width={200}>
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] text-gray-400 font-semibold uppercase">Line Spacing</div>
              {LINE_SPACINGS.map(ls => (
                <button key={ls.value} onMouseDown={e => { e.preventDefault(); setLineSpacing(ls.value); }} className={`flex items-center gap-2 w-full px-3 py-1 text-xs hover:bg-blue-50 hover:text-blue-700 ${lineSpacing === ls.value ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                  {lineSpacing === ls.value ? '✓' : <span className="w-3" />} {ls.label}
                </button>
              ))}
              <div className="my-1 border-t border-gray-100" />
              <div className="px-3 py-1 text-[10px] text-gray-400 font-semibold uppercase">Zoom</div>
              {[75, 100, 125, 150, 200].map(z => (
                <button key={z} onMouseDown={e => { e.preventDefault(); setZoom(z); }} className={`flex items-center gap-2 w-full px-3 py-1 text-xs hover:bg-blue-50 hover:text-blue-700 ${zoom === z ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                  {zoom === z ? '✓' : <span className="w-3" />} {z}%
                </button>
              ))}
            </div>
          </DropdownBtn>

          <ToolbarDivider />

          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)"><BsArrowCounterclockwise size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)"><BsArrowClockwise size={13} /></ToolBtn>
          <ToolbarDivider />
          <ToolBtn onClick={saveDoc} title="Save"><BsFileEarmarkText size={13} /></ToolBtn>
          <ToolBtn onClick={() => window.print()} title="Print / Export PDF"><BsPrinter size={13} /></ToolBtn>
        </div>

        {/* Row 2: Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-1 flex-wrap">

          {/* Style preset */}
          <select
            value={h}
            onChange={e => {
              const val = e.target.value;
              if (val === '0') editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 | 4 }).run();
            }}
            className="h-7 text-xs px-1.5 rounded border border-gray-200 bg-white text-gray-700 outline-none focus:border-blue-400 mr-1"
            style={{ minWidth: 110 }}
          >
            <option value="0">Normal Text</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
          </select>

          {/* Font family */}
          <DropdownBtn
            label={<span className="text-xs font-medium" style={{ fontFamily }}>{FONT_FAMILIES.find(f => f.value === fontFamily)?.label || 'Font'}</span>}
            width={200}
          >
            {FONT_FAMILIES.map(f => (
              <button key={f.value} onMouseDown={e => { e.preventDefault(); applyFontFamily(f.value); }} className={`flex items-center w-full px-3 py-1.5 text-xs hover:bg-blue-50 ${fontFamily === f.value ? 'text-blue-600 font-semibold' : 'text-gray-700'}`} style={{ fontFamily: f.value }}>
                {fontFamily === f.value ? '✓ ' : ''}{f.label}
              </button>
            ))}
          </DropdownBtn>

          {/* Font size */}
          <DropdownBtn label={<span className="text-xs font-medium">{fontSize}</span>} width={90}>
            {FONT_SIZES.map(s => (
              <button key={s} onMouseDown={e => { e.preventDefault(); applyFontSize(s); }} className={`flex items-center w-full px-3 py-1.5 text-xs hover:bg-blue-50 ${fontSize === s ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                {fontSize === s ? '✓ ' : ''}{s}
              </button>
            ))}
          </DropdownBtn>

          <ToolbarDivider />

          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><BsTypeBold size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><BsTypeItalic size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><BsTypeUnderline size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><BsTypeStrikethrough size={14} /></ToolBtn>

          <ToolbarDivider />

          {/* Text color */}
          <div className="relative flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-gray-100 cursor-pointer transition-all" title="Text Color">
            <BsPaintBucket size={12} className="text-gray-600" />
            <div className="w-5 h-1 rounded-sm" style={{ background: '#111827' }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => editor.chain().focus().setColor(e.target.value).run()} title="Text color" />
          </div>

          {/* Highlight */}
          <div className="relative flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-gray-100 cursor-pointer transition-all" title="Highlight Color">
            <BsHighlighter size={12} className="text-gray-600" />
            <div className="w-5 h-1 rounded-sm" style={{ background: '#fef08a' }} />
            <input type="color" defaultValue="#fef08a" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} title="Highlight color" />
          </div>

          <ToolbarDivider />

          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><BsTextLeft size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><BsTextCenter size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><BsTextRight size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><BsJustify size={14} /></ToolBtn>

          <ToolbarDivider />

          <ToolBtn onClick={() => editor.chain().focus().sinkListItem('listItem').run()} title="Increase Indent"><BsTextIndentLeft size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().liftListItem('listItem').run()} title="Decrease Indent"><BsTextIndentRight size={14} /></ToolBtn>

          <ToolbarDivider />

          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bulleted List"><BsListUl size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List"><BsListOl size={14} /></ToolBtn>

          <ToolbarDivider />

          <ToolBtn onClick={addImage} title="Insert Image"><BsImage size={14} /></ToolBtn>
          <ToolBtn onClick={insertTable} title="Insert Table"><BsTable size={14} /></ToolBtn>
          <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Insert Hyperlink"><BsLink45Deg size={14} /></ToolBtn>
        </div>
      </div>

      {/* Ruler */}
      <div className="no-print h-5 bg-gray-300 border-b border-gray-400 shrink-0 flex items-center overflow-hidden">
        <div className="flex items-end gap-0 mx-auto" style={{ width: `${Math.min(816 * zoom / 100, 900)}px` }}>
          {Array.from({ length: 17 }, (_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="text-[7px] text-gray-500 leading-none">{i > 0 ? i : ''}</div>
              <div className="w-px bg-gray-500" style={{ height: i % 2 === 0 ? 6 : 4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Page Canvas */}
      <div className="flex-1 overflow-auto py-8 px-4" style={{ background: '#d1d5db' }}>
        <div
          className="mx-auto bg-white shadow-2xl"
          style={{
            width: `${816 * zoom / 100}px`,
            minHeight: `${1056 * zoom / 100}px`,
            padding: `${Math.round(96 * zoom / 100)}px`,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="no-print flex items-center gap-4 px-4 h-6 bg-blue-700 text-white/80 text-xs shrink-0">
        <span>{wordCount.toLocaleString()} words</span>
        <span>{charCount.toLocaleString()} characters</span>
        <div className="flex-1" />
        <span>Zoom: {zoom}%</span>
        <input type="range" min={50} max={200} step={25} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-20 h-1 accent-white cursor-pointer" />
        <span>Print Layout</span>
      </div>
    </div>
  );
}
