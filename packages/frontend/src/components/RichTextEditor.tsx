import { useEditor, EditorContent } from '@tiptap/react';
import Image from '@tiptap/extension-image';
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
  showHeadings?: boolean;
  showImageEmbed?: boolean;
}

export default function RichTextEditor({ content, onChange, placeholder, editable = true, maxLength, compact = false, showHeadings = false, showImageEmbed = false }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const extensions = [
    StarterKit,
    Placeholder.configure({ placeholder: placeholder || 'Write something...' }),
    ...(showImageEmbed ? [Image.configure({ inline: false, allowBase64: false })] : []),
  ];

  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const textLen = editor.state.doc.textContent.length;
      if (maxLength && textLen > maxLength) {
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

  useEffect(() => {
    if (editor) {
      setCharCount(editor.state.doc.textContent.length);
    }
  }, [editor, content]);

  if (!editor) return null;

  const showToolbar = editable && isFocused;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const btnClass = (active: boolean) =>
    `p-1.5 rounded hover:bg-gray-200 text-sm ${active ? 'bg-gray-200 text-primary-700' : 'text-gray-600'}`;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      isFocused ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-300'
    }`}>
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap" onMouseDown={(e) => e.preventDefault()}>
          {showHeadings && (
            <>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`${btnClass(editor.isActive('heading', { level: 2 }))} font-bold`}
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`${btnClass(editor.isActive('heading', { level: 3 }))} font-bold`}
                title="Heading 3"
              >
                H3
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1" />
            </>
          )}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${btnClass(editor.isActive('bold'))} font-bold`}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${btnClass(editor.isActive('italic'))} italic`}
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`${btnClass(editor.isActive('strike'))} line-through`}
            title="Strikethrough"
          >
            S
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={btnClass(editor.isActive('bulletList'))}
            title="Bullet List"
          >
            &bull; List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={btnClass(editor.isActive('orderedList'))}
            title="Numbered List"
          >
            1. List
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={btnClass(editor.isActive('blockquote'))}
            title="Quote"
          >
            &ldquo; Quote
          </button>
          {showImageEmbed && (
            <>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <button
                type="button"
                onClick={addImage}
                className={btnClass(false)}
                title="Insert Image"
              >
                Image
              </button>
            </>
          )}
        </div>
      )}
      <div className={compact && !isFocused ? '' : 'resize-y overflow-auto'} style={compact && !isFocused ? {} : { minHeight: '80px' }}>
        <EditorContent
          editor={editor}
          className={`prose prose-sm max-w-none p-3 [&_.ProseMirror]:outline-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg ${
            compact && !isFocused ? '[&_.ProseMirror]:min-h-[20px]' : '[&_.ProseMirror]:min-h-[60px]'
          }`}
        />
      </div>
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
