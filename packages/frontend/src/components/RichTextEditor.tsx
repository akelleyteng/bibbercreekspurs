import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  maxLength?: number;
  compact?: boolean;
}

export default function RichTextEditor({ content, onChange, placeholder, editable = true, maxLength, compact = false }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Write something...' }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const textLen = editor.state.doc.textContent.length;
      if (maxLength && textLen > maxLength) {
        // Prevent typing beyond limit by truncating
        return;
      }
      setCharCount(textLen);
      onChange(html);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Update char count when content changes externally
  useEffect(() => {
    if (editor) {
      setCharCount(editor.state.doc.textContent.length);
    }
  }, [editor, content]);

  if (!editor) return null;

  const showToolbar = editable && isFocused;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      isFocused ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-300'
    }`}>
      {/* Toolbar - only visible when focused */}
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap" onMouseDown={(e) => e.preventDefault()}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm font-bold ${editor.isActive('bold') ? 'bg-gray-200 text-primary-700' : 'text-gray-600'}`}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm italic ${editor.isActive('italic') ? 'bg-gray-200 text-primary-700' : 'text-gray-600'}`}
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm line-through ${editor.isActive('strike') ? 'bg-gray-200 text-primary-700' : 'text-gray-600'}`}
            title="Strikethrough"
          >
            S
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm ${editor.isActive('bulletList') ? 'bg-gray-200 text-primary-700' : 'text-gray-600'}`}
            title="Bullet List"
          >
            &bull; List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm ${editor.isActive('orderedList') ? 'bg-gray-200 text-primary-700' : 'text-gray-600'}`}
            title="Numbered List"
          >
            1. List
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm ${editor.isActive('blockquote') ? 'bg-gray-200 text-primary-700' : 'text-gray-600'}`}
            title="Quote"
          >
            &ldquo; Quote
          </button>
        </div>
      )}
      {/* Editor content area - compact starts single-line, resizable when focused */}
      <div className={compact && !isFocused ? '' : 'resize-y overflow-auto'} style={compact && !isFocused ? {} : { minHeight: '80px' }}>
        <EditorContent
          editor={editor}
          className={`prose prose-sm max-w-none p-3 [&_.ProseMirror]:outline-none ${
            compact && !isFocused ? '[&_.ProseMirror]:min-h-[20px]' : '[&_.ProseMirror]:min-h-[60px]'
          }`}
        />
      </div>
      {/* Character counter */}
      {maxLength && isFocused && (
        <div className={`text-xs px-3 py-1 text-right border-t ${isOverLimit ? 'text-red-500 bg-red-50' : 'text-gray-400'}`}>
          {charCount}/{maxLength}
        </div>
      )}
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>
    </div>
  );
}
