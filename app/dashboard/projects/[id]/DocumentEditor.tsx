'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';

interface DocumentEditorProps {
  content: string;
  onChange: (html: string) => void;
  projectName?: string;
}

// ── Toolbar button ──
function ToolBtn({
  onClick, active = false, disabled = false, title, children
}: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className="px-2 py-1 rounded text-[12px] font-medium transition-all select-none"
      style={{
        background: active ? 'rgba(99,102,241,0.25)' : 'transparent',
        color: active ? '#a5b4fc' : disabled ? '#ffffff30' : '#ffffffb0',
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.12)' }} />;
}

export default function DocumentEditor({ content, onChange, projectName }: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: 'nexios-code-block' } } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'nexios-link' } }),
      Placeholder.configure({ placeholder: 'Start writing your document…' }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'nexios-doc-editor',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes (e.g. load from storage)
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

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

  if (!editor) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'rgba(255,255,255,0.3)' }}>
      Loading editor…
    </div>
  );

  const h = editor.isActive('heading', { level: 1 }) ? 1 : editor.isActive('heading', { level: 2 }) ? 2 : editor.isActive('heading', { level: 3 }) ? 3 : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0c0f17' }}>

      {/* ── Toolbar (Word-style) ── */}
      <div className="shrink-0 border-b px-3 py-1.5 flex flex-wrap items-center gap-0.5 select-none"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#111520' }}>

        {/* Heading selector */}
        <select
          value={h}
          onChange={e => {
            const val = Number(e.target.value);
            if (val === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: val as 1 | 2 | 3 }).run();
          }}
          className="text-[11px] px-2 py-1 rounded mr-1 outline-none"
          style={{ background: '#1a1e2d', color: '#ffffffb0', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <option value={0}>Paragraph</option>
          <option value={1}>Heading 1</option>
          <option value={2}>Heading 2</option>
          <option value={3}>Heading 3</option>
        </select>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><span style={{ textDecoration: 'underline' }}>U</span></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><span style={{ textDecoration: 'line-through' }}>S</span></ToolBtn>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">≡</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">≡</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">≡</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">≡</ToolBtn>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1. List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">❝</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">{`<>`}</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">⌥{`</>`}</ToolBtn>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight({ color: '#fbbf2440' }).run()} active={editor.isActive('highlight')} title="Highlight">🖌</ToolBtn>
        <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Insert link">🔗</ToolBtn>
        <ToolBtn onClick={addImage} title="Insert image">🖼</ToolBtn>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">↩</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">↪</ToolBtn>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {editor.storage?.characterCount?.characters?.() ?? editor.getText().length} chars
          </span>
        </div>
      </div>

      {/* ── Page canvas — looks like a Word document ── */}
      <div className="flex-1 overflow-auto py-10 px-4" style={{ background: '#161b22' }}>
        <div className="mx-auto max-w-3xl shadow-2xl rounded-sm" style={{ background: '#fff', minHeight: 1122 }}>
          {projectName && (
            <div className="px-16 pt-12 pb-2 border-b" style={{ borderColor: '#e5e7eb' }}>
              <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#9ca3af' }}>{projectName}</p>
            </div>
          )}
          <div className="px-16 py-12">
            <style>{`
              .nexios-doc-editor { outline: none; color: #111827; font-family: 'Georgia', 'Times New Roman', serif; font-size: 16px; line-height: 1.8; min-height: 600px; }
              .nexios-doc-editor h1 { font-size: 2rem; font-weight: 700; margin: 1.5rem 0 0.5rem; color: #111827; line-height: 1.2; }
              .nexios-doc-editor h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.4rem; color: #1f2937; line-height: 1.3; }
              .nexios-doc-editor h3 { font-size: 1.2rem; font-weight: 600; margin: 1rem 0 0.35rem; color: #374151; line-height: 1.4; }
              .nexios-doc-editor p { margin: 0.5rem 0; }
              .nexios-doc-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
              .nexios-doc-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
              .nexios-doc-editor li { margin: 0.25rem 0; }
              .nexios-doc-editor blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; margin: 1rem 0; color: #4b5563; font-style: italic; }
              .nexios-doc-editor code { background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; font-family: 'Fira Code', monospace; font-size: 0.85em; color: #6366f1; }
              .nexios-code-block { background: #1e293b !important; color: #e2e8f0; padding: 1rem; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 0.85em; overflow-x: auto; margin: 1rem 0; }
              .nexios-link { color: #6366f1; text-decoration: underline; }
              .nexios-doc-editor img { max-width: 100%; border-radius: 4px; margin: 1rem 0; }
              .nexios-doc-editor hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
              .nexios-doc-editor mark { background: #fef08a; padding: 0.1em 0; border-radius: 2px; }
              .nexios-doc-editor s { color: #9ca3af; }
              .tiptap p.is-editor-empty:first-child::before { color: #adb5bd; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
            `}</style>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
