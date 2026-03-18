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
  BsRobot, BsArrowRepeat, BsPlusCircle,
} from 'react-icons/bs';
import { HiArrowLeft, HiOutlineDocumentText } from 'react-icons/hi';
import Link2 from 'next/link';
import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';

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
];

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  insertable?: string;
}

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
        background: active ? 'rgba(99,102,241,0.25)' : 'transparent',
        color: active ? '#818cf8' : disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)',
        border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} />;
}

function DarkDropdown({ label, children, width = 180 }: { label: React.ReactNode; children: React.ReactNode; width?: number }) {
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
        className="flex items-center gap-1 h-7 px-2 rounded text-xs transition-all"
        style={{ color: 'rgba(255,255,255,0.55)', background: open ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid transparent' }}
        onMouseOver={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseOut={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {label}
        <span className="text-[9px] ml-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>▾</span>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-0.5 z-50 rounded-lg shadow-2xl overflow-hidden"
          style={{ width, maxHeight: 240, overflowY: 'auto', background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)' }}
          onMouseDown={e => e.preventDefault()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({ onSelect, active, children }: { onSelect: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onSelect(); }}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors text-left"
      style={{ color: active ? '#818cf8' : 'rgba(255,255,255,0.6)', background: active ? 'rgba(99,102,241,0.12)' : 'transparent' }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(99,102,241,0.12)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

function parseInsertable(text: string): string | undefined {
  const m = text.match(/---INSERT---([\s\S]*?)---ENDINSERT---/);
  return m ? m[1].trim() : undefined;
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

  const { activeProvider, activeModel, getApiKey } = useAI();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hi! I\'m your document AI. Ask me to draft content, improve your writing, suggest structure, or type "write intro about X" and I\'ll create content you can insert directly.', timestamp: Date.now() },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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

  const insertAIContent = useCallback((html: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
  }, [editor]);

  const sendMessage = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const apiKey = getApiKey(activeProvider.id);
    if (!apiKey) {
      setMessages(p => [...p, { role: 'assistant', content: `Please add your ${activeProvider.name} API key in Settings to use AI assistance.`, timestamp: Date.now() }]);
      return;
    }
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);

    try {
      const currentContent = editor?.getText().slice(0, 1500) || '';
      const systemPrompt = `You are a professional writing assistant inside Nexios AI's document editor.

The user is working on "${projectName || 'a document'}".
Current document content (first 1500 chars):
${currentContent ? `\`\`\`\n${currentContent}\n\`\`\`` : '(empty document)'}

When the user asks you to WRITE or DRAFT content that should be inserted into their document:
1. Provide your written content wrapped exactly like this:
---INSERT---
<p>Your HTML content here. Use proper HTML: <strong>bold</strong>, <em>italic</em>, <h2>headings</h2>, <ul><li>lists</li></ul></p>
---ENDINSERT---

2. After the INSERT block, briefly explain what you wrote.

For questions, advice, or analysis — just respond normally without INSERT blocks.

Always write in a professional, clear style appropriate for the document context.`;

      const msgsForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content.replace(/---INSERT---[\s\S]*?---ENDINSERT---/g, '[inserted content]') })),
        { role: 'user' as const, content: userMsg },
      ];

      const response = await callAI(activeProvider.id, activeModel.id, msgsForAI, apiKey);
      const insertable = parseInsertable(response);
      const display = response.replace(/---INSERT---[\s\S]*?---ENDINSERT---/, insertable ? `✓ Content ready to insert (${insertable.split(' ').length} words)` : '');

      setMessages(p => [...p, { role: 'assistant', content: display, timestamp: Date.now(), insertable }]);
    } catch (err: any) {
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${err.message}`, timestamp: Date.now() }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (!editor) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#080c14' }}>
      <div className="text-white/30 text-sm">Loading editor…</div>
    </div>
  );

  const h = editor.isActive('heading', { level: 1 }) ? '1'
    : editor.isActive('heading', { level: 2 }) ? '2'
    : editor.isActive('heading', { level: 3 }) ? '3'
    : editor.isActive('heading', { level: 4 }) ? '4' : '0';

  return (
    <div className="flex flex-col h-screen" style={{ background: '#080c14', fontFamily: 'system-ui, sans-serif' }}>
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

      {/* ── Title bar ── */}
      <div className="no-print flex items-center gap-3 px-3 h-10 shrink-0 border-b" style={{ background: '#0c0f17', borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link2 href="/dashboard/projects" className="text-white/40 hover:text-white/80 transition-colors">
          <HiArrowLeft size={14} />
        </Link2>
        <div className="w-px h-4 bg-white/10" />
        <HiOutlineDocumentText size={13} className="text-indigo-400" />
        <span className="text-[12px] font-semibold text-white/90">{projectName || 'Untitled Document'}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
          Document
        </span>
        <div className="flex-1" />
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${saveStatus === 'saved' ? '' : saveStatus === 'saving' ? '' : ''}`}
          style={{ background: saveStatus === 'saved' ? 'rgba(52,211,153,0.12)' : saveStatus === 'saving' ? 'rgba(251,191,36,0.12)' : 'rgba(249,115,22,0.15)', color: saveStatus === 'saved' ? '#34d399' : saveStatus === 'saving' ? '#fbbf24' : '#fb923c' }}>
          {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving…' : '● Unsaved'}
        </span>
        <button onClick={() => setShowChat(p => !p)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all ${showChat ? 'text-indigo-300' : 'text-white/30 hover:text-white/60'}`} style={{ background: showChat ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
          <BsRobot size={11} /> AI
        </button>
      </div>

      {/* ── Ribbon row 1: Menus + quick actions ── */}
      <div className="no-print border-b shrink-0" style={{ background: '#0c0f17', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-0.5 px-3 py-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <DarkDropdown label={<><BsFileEarmark size={11} className="mr-1" />File</>} width={210}>
            <div className="py-1">
              <DropdownItem onSelect={saveDoc}><BsFileEarmarkText size={11} /> Save</DropdownItem>
              <div className="my-0.5 mx-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <DropdownItem onSelect={exportHTML}><BsDownload size={11} /> Export as HTML</DropdownItem>
              <DropdownItem onSelect={exportTXT}><BsDownload size={11} /> Export as TXT</DropdownItem>
              <DropdownItem onSelect={() => window.print()}><BsPrinter size={11} /> Print / Save PDF</DropdownItem>
            </div>
          </DarkDropdown>

          <DarkDropdown label={<><BsScissors size={11} className="mr-1" />Edit</>} width={190}>
            <div className="py-1">
              <DropdownItem onSelect={() => document.execCommand('cut')}><BsScissors size={11} /> Cut</DropdownItem>
              <DropdownItem onSelect={() => document.execCommand('copy')}><BsFiles size={11} /> Copy</DropdownItem>
              <DropdownItem onSelect={() => document.execCommand('paste')}><BsClipboard size={11} /> Paste</DropdownItem>
              <div className="my-0.5 mx-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <DropdownItem onSelect={() => editor.chain().focus().undo().run()}><BsArrowCounterclockwise size={11} /> Undo</DropdownItem>
              <DropdownItem onSelect={() => editor.chain().focus().redo().run()}><BsArrowClockwise size={11} /> Redo</DropdownItem>
            </div>
          </DarkDropdown>

          <DarkDropdown label={<><BsCardText size={11} className="mr-1" />Insert</>} width={210}>
            <div className="py-1">
              <DropdownItem onSelect={insertTable}><BsTable size={11} /> Table</DropdownItem>
              <DropdownItem onSelect={addImage}><BsImage size={11} /> Image</DropdownItem>
              <DropdownItem onSelect={setLink}><BsLink45Deg size={11} /> Hyperlink</DropdownItem>
              <DropdownItem onSelect={() => editor.chain().focus().setHorizontalRule().run()}>— Page Separator</DropdownItem>
              <DropdownItem onSelect={() => editor.chain().focus().toggleBlockquote().run()}>❝ Blockquote</DropdownItem>
            </div>
          </DarkDropdown>

          <DarkDropdown label={<><BsFonts size={11} className="mr-1" />Format</>} width={200}>
            <div className="py-1">
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Line Spacing</div>
              {LINE_SPACINGS.map(ls => (
                <DropdownItem key={ls.value} onSelect={() => setLineSpacing(ls.value)} active={lineSpacing === ls.value}>
                  {lineSpacing === ls.value ? '✓' : <span className="w-3 inline-block" />} {ls.label}
                </DropdownItem>
              ))}
              <div className="my-0.5 mx-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Zoom</div>
              {[75, 100, 125, 150, 200].map(z => (
                <DropdownItem key={z} onSelect={() => setZoom(z)} active={zoom === z}>
                  {zoom === z ? '✓' : <span className="w-3 inline-block" />} {z}%
                </DropdownItem>
              ))}
            </div>
          </DarkDropdown>

          <ToolbarDivider />
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)"><BsArrowCounterclockwise size={12} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)"><BsArrowClockwise size={12} /></ToolBtn>
          <ToolbarDivider />
          <ToolBtn onClick={saveDoc} title="Save"><BsFileEarmarkText size={12} /></ToolBtn>
          <ToolBtn onClick={() => window.print()} title="Print / Export PDF"><BsPrinter size={12} /></ToolBtn>
        </div>

        {/* Row 2: Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-1 flex-wrap">
          <select
            value={h}
            onChange={e => {
              const val = e.target.value;
              if (val === '0') editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 | 4 }).run();
            }}
            className="h-7 text-xs px-1.5 rounded outline-none mr-1"
            style={{ minWidth: 110, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            <option value="0">Normal Text</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
          </select>

          <DarkDropdown label={<span className="text-xs" style={{ fontFamily }}>{FONT_FAMILIES.find(f => f.value === fontFamily)?.label || 'Font'}</span>} width={200}>
            {FONT_FAMILIES.map(f => (
              <DropdownItem key={f.value} onSelect={() => applyFontFamily(f.value)} active={fontFamily === f.value}>
                <span style={{ fontFamily: f.value }}>{fontFamily === f.value ? '✓ ' : ''}{f.label}</span>
              </DropdownItem>
            ))}
          </DarkDropdown>

          <DarkDropdown label={<span className="text-xs font-medium">{fontSize}</span>} width={90}>
            {FONT_SIZES.map(s => (
              <DropdownItem key={s} onSelect={() => applyFontSize(s)} active={fontSize === s}>
                {fontSize === s ? '✓ ' : ''}{s}
              </DropdownItem>
            ))}
          </DarkDropdown>

          <ToolbarDivider />
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><BsTypeBold size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><BsTypeItalic size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><BsTypeUnderline size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><BsTypeStrikethrough size={13} /></ToolBtn>

          <ToolbarDivider />

          {/* Text color */}
          <div className="relative flex flex-col items-center justify-center w-7 h-7 rounded cursor-pointer transition-all hover:bg-white/6" title="Text Color">
            <BsPaintBucket size={11} style={{ color: 'rgba(255,255,255,0.55)' }} />
            <div className="w-4 h-0.5 rounded-sm mt-0.5" style={{ background: '#818cf8' }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
          </div>

          {/* Highlight */}
          <div className="relative flex flex-col items-center justify-center w-7 h-7 rounded cursor-pointer transition-all hover:bg-white/6" title="Highlight">
            <BsHighlighter size={11} style={{ color: 'rgba(255,255,255,0.55)' }} />
            <div className="w-4 h-0.5 rounded-sm mt-0.5" style={{ background: '#fef08a' }} />
            <input type="color" defaultValue="#fef08a" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
          </div>

          <ToolbarDivider />
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><BsTextLeft size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><BsTextCenter size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><BsTextRight size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><BsJustify size={13} /></ToolBtn>

          <ToolbarDivider />
          <ToolBtn onClick={() => editor.chain().focus().sinkListItem('listItem').run()} title="Indent"><BsTextIndentLeft size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().liftListItem('listItem').run()} title="Outdent"><BsTextIndentRight size={13} /></ToolBtn>
          <ToolbarDivider />
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><BsListUl size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List"><BsListOl size={13} /></ToolBtn>
          <ToolbarDivider />
          <ToolBtn onClick={addImage} title="Image"><BsImage size={13} /></ToolBtn>
          <ToolBtn onClick={insertTable} title="Table"><BsTable size={13} /></ToolBtn>
          <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Link"><BsLink45Deg size={13} /></ToolBtn>
        </div>
      </div>

      {/* ── Ruler ── */}
      <div className="no-print h-5 shrink-0 flex items-center overflow-hidden" style={{ background: '#0a0d15', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-end gap-0 mx-auto" style={{ width: `${Math.min(816 * zoom / 100, 900)}px` }}>
          {Array.from({ length: 17 }, (_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="text-[7px] leading-none" style={{ color: 'rgba(255,255,255,0.2)' }}>{i > 0 ? i : ''}</div>
              <div className="w-px" style={{ height: i % 2 === 0 ? 6 : 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Page canvas */}
        <div className="flex-1 overflow-auto py-8 px-4" style={{ background: '#141820' }}>
          <div
            className="mx-auto bg-white shadow-2xl"
            style={{
              width: `${816 * zoom / 100}px`,
              minHeight: `${1056 * zoom / 100}px`,
              padding: `${Math.round(96 * zoom / 100)}px`,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* ── AI Chat Panel ── */}
        {showChat && (
          <div className="flex flex-col shrink-0 border-l" style={{ width: 290, borderColor: 'rgba(255,255,255,0.08)', background: '#0a0d15' }}>
            <div className="h-8 flex items-center justify-between px-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              <div className="flex items-center gap-1.5">
                <BsRobot size={11} className="text-indigo-400" />
                <span className="text-[10px] font-semibold text-white/60">AI Writing Assistant</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: aiLoading ? '#fbbf24' : '#34d399' }} />
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] shrink-0 font-bold mt-0.5 ${msg.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-600/40 text-slate-300'}`}>
                    {msg.role === 'assistant' ? 'AI' : 'U'}
                  </div>
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className={`rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'assistant' ? 'bg-white/4 text-white/75' : 'bg-indigo-600/20 text-indigo-200'}`}>
                      {msg.content}
                    </div>
                    {msg.insertable && (
                      <button
                        onClick={() => insertAIContent(msg.insertable!)}
                        className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg self-start transition-all"
                        style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
                      >
                        <BsPlusCircle size={10} /> Insert into document
                      </button>
                    )}
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
                  placeholder="Draft intro, improve paragraph, suggest title…"
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
      </div>

      {/* ── Status Bar ── */}
      <div className="no-print flex items-center gap-4 px-4 h-6 shrink-0 border-t text-[10px]" style={{ background: '#0c0f17', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
        <span>{wordCount.toLocaleString()} words</span>
        <span>{charCount.toLocaleString()} chars</span>
        <div className="flex-1" />
        <span>Zoom {zoom}%</span>
        <input type="range" min={50} max={200} step={25} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-16 h-1 accent-indigo-400 cursor-pointer" />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <span>Print Layout</span>
      </div>
    </div>
  );
}
