import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function RichTextEditor({ content, onChange, placeholder, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Write something...' }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync editable prop
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
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
      {/* Editor content area */}
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 min-h-[80px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60px]" />
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
