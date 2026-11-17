import React, { useState, useRef } from 'react';
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
import { VideoExtension } from './tiptap/VideoExtension';
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
  Video as VideoIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Upload,
} from 'lucide-react';
import { uploadMedia } from '../utils/api';

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
  const [uploadStatus, setUploadStatus] = useState<'image' | 'video' | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
      VideoExtension,
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
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleProcessUpload(file, 'image');
            return true;
          } else if (file.type.startsWith('video/')) {
            event.preventDefault();
            handleProcessUpload(file, 'video');
            return true;
          }
        }
        return false;
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

  const handleProcessUpload = async (file: File, type: 'image' | 'video') => {
    setUploadStatus(type);
    try {
      const res = await uploadMedia(file);
      if (res.url) {
        if (type === 'image' || res.mediaType === 'image') {
          editor.chain().focus().setImage({ src: res.url }).run();
        } else {
          editor.chain().focus().setVideo({ src: res.url }).run();
        }
      }
    } catch (uploadErr: any) {
      alert(`Upload failed: ${uploadErr.message || 'Error uploading file'}`);
    } finally {
      setUploadStatus(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessUpload(file, 'image');
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessUpload(file, 'video');
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

        {/* Direct Image Upload to Website */}
        <label
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-elevated cursor-pointer transition-colors border border-border/60 hover:border-orange-500/50"
          title="Upload image from computer (stored directly on website)"
        >
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          <span>Upload Image</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
            className="hidden"
            onChange={handleImageFileChange}
            disabled={uploadStatus !== null}
          />
        </label>

        {/* Direct Video Upload to Website */}
        <label
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-elevated cursor-pointer transition-colors border border-border/60 hover:border-orange-500/50"
          title="Upload video from computer (stored directly on website)"
        >
          <VideoIcon className="w-3.5 h-3.5 text-primary" />
          <span>Upload Video</span>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
            className="hidden"
            onChange={handleVideoFileChange}
            disabled={uploadStatus !== null}
          />
        </label>

        <button
          type="button"
          onClick={insertTable}
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        {uploadStatus && (
          <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-semibold ml-2 animate-pulse bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20">
            <Upload className="w-3 h-3 animate-bounce" />
            Uploading {uploadStatus} to website...
          </span>
        )}
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
};
