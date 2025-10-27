import React, { useEffect, useState } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { IconButton } from '@mui/material';
import { Bold, Italic, List, Hash, Quote } from 'lucide-react';
import './tiptap.css';

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
};

const TiptapEditor: React.FC<Props> = ({ value, onChange, placeholder, label }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Start typing...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Floating label state
  const [focused, setFocused] = useState(false);
  const [hasContent, setHasContent] = useState(Boolean(value && value.trim()));

  useEffect(() => {
    if (!editor) return;

    const handleFocus = () => setFocused(true);
    const handleBlur = () => setFocused(false);
    const handleUpdate = () => setHasContent(Boolean(editor.getText().trim()));

    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);
    editor.on('update', handleUpdate);

    // initialize state
    handleUpdate();

    return () => {
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  return (
    <div className="tiptap-editor gap-0">
        <div className={`tiptap-container ${label ? 'has-label' : ''} ${focused || hasContent ? 'tiptap-filled' : ''}`}>
            {label && (
                <label
                    className={`tiptap-label ${focused || hasContent ? 'floating' : ''}`}
                    onClick={() => editor?.commands.focus()}
                >
                    {label}
                </label>
            )}
            <div className="tiptap-content p-4" role="textbox" aria-multiline="true">
                <EditorContent 
                    editor={editor}
                    label="Description"
                    className="outline-none"
                />
            </div>
            <div className="tiptap-toolbar m-0">
                <IconButton
                    aria-label="Bold"
                    size="small"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    disabled={!editor}
                >
                <Bold size={16} />
                </IconButton>
                <IconButton
                    aria-label="Italic"
                    size="small"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    disabled={!editor}
                >
                <Italic size={16} />
                </IconButton>
                <IconButton
                    aria-label="Heading"
                    size="small"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    disabled={!editor}
                >
                <Hash size={16} />
                </IconButton>
                <IconButton
                    aria-label="Bullet list"
                    size="small"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    disabled={!editor}
                >
                <List size={16} />
                </IconButton>
                <IconButton
                    aria-label="Ordered list"
                    size="small"
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    disabled={!editor}
                >
                <List size={16} />
                </IconButton>
                <IconButton
                    aria-label="Blockquote"
                    size="small"
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    disabled={!editor}
                >
                    <Quote size={16} />
                </IconButton>
            </div>
        </div>
    </div>
  );
};

export default TiptapEditor;
