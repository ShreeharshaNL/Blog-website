import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Upload,
} from 'lucide-react';
import { apiRequest } from '../utils/api';

interface BlogEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
  initialContent,
  onChange,
  placeholder = 'Tell your story...',
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-orange-500 underline underline-offset-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-6 shadow-lg shadow-black/30',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose-editorial focus:outline-none min-h-[350px] p-4 sm:p-6 text-foreground',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Read file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const res = await apiRequest<{ success: boolean; url: string }>('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
              data: base64Data,
              mimeType: file.type,
              filename: file.name,
            }),
          });
          if (res.url) {
            editor.chain().focus().setImage({ src: res.url }).run();
          }
        } catch (uploadErr: any) {
          alert('Upload failed: ' + (uploadErr.message || 'Error'));
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploading(false);
    }
  };

  const addImageUrl = () => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-background-surface">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 sm:p-3 border-b border-border bg-background-elevated/40 text-foreground">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated disabled:opacity-30"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated disabled:opacity-30"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-border mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' : 'hover:bg-background-elevated'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' : 'hover:bg-background-elevated'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' : 'hover:bg-background-elevated'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-border mx-1" />

        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('bold') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' : 'hover:bg-background-elevated'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('italic') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' : 'hover:bg-background-elevated'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('underline') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' : 'hover:bg-background-elevated'
          }`}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-border mx-1" />

        {/* Lists & Quotes */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('bulletList') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'hover:bg-background-elevated'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('orderedList') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'hover:bg-background-elevated'
          }`}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('blockquote') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'hover:bg-background-elevated'
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('codeBlock') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-mono' : 'hover:bg-background-elevated'
          }`}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-border mx-1" />

        {/* Media & Links */}
        <button
          type="button"
          onClick={setLink}
          className={`p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors ${
            editor.isActive('link') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'hover:bg-background-elevated'
          }`}
          title="Hyperlink"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <label
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated cursor-pointer transition-colors"
          title="Upload inline image"
        >
          <Upload className="w-4 h-4" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
        </label>

        <button
          type="button"
          onClick={addImageUrl}
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
          title="Image URL"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={insertTable}
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        {isUploading && (
          <span className="text-xs text-orange-500 dark:text-orange-400 font-medium ml-2 animate-pulse">
            Uploading image...
          </span>
        )}
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
};
