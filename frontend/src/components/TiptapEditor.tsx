import React, { useEffect, useState, useRef } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Bold, Italic, List, Hash, Quote } from 'lucide-react';
import './tiptap.css';

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
};

const TiptapEditor: React.FC<Props> = ({ value, onChange, placeholder, label }) => {
  // local html state for the contentEditable editor
  const [html, setHtml] = useState<string>(value || '');
  const contentRef = useRef<HTMLDivElement | null>(null);


  // Floating label state
  const [focused, setFocused] = useState(false);
  const [hasContent, setHasContent] = useState(Boolean(value && value.trim()));
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);

  // keep local html in sync with external value prop
  useEffect(() => {
    // only sync external value when the editor is not focused to avoid clobbering
    // the user's current selection/caret while typing
    if (value !== html && !focused) {
      setHtml(value || '');
      // after DOM updates, ensure caret is at end so new content doesn't appear to behave RTL
      requestAnimationFrame(() => {
        const el = contentRef.current;
        if (!el) return;
        try {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          // keep focus on editor
          el.focus();
        } catch (err) {
          // ignore selection errors
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleFocus = () => setFocused(true);
    const handleBlur = () => setFocused(false);
    const handleInput = () => {
      const text = el.innerText || '';
      setHasContent(Boolean(text.trim()));
      const newHtml = el.innerHTML || '';
      setHtml(newHtml);
      onChange(newHtml);
    };
    el.addEventListener('focus', handleFocus);
    el.addEventListener('blur', handleBlur);
    el.addEventListener('input', handleInput);

    // keyboard shortcuts (Ctrl/Cmd+B, I)
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        applyCommand('bold');
      } else if (key === 'i') {
        e.preventDefault();
        applyCommand('italic');
      }
    };
    el.addEventListener('keydown', handleKeyDown as any);

    // update active states when selection changes
    const updateActive = () => {
      try {
        const qcs = (document as any).queryCommandState;
        if (typeof qcs === 'function') {
          const b = !!(document as any).queryCommandState('bold');
          const i = !!(document as any).queryCommandState('italic');
          setActiveBold(b);
          setActiveItalic(i);
          return;
        }
        // fallback: check selection ancestor nodes
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          setActiveBold(false);
          setActiveItalic(false);
          return;
        }
        let node: Node | null = sel.anchorNode;
        let foundBold = false;
        let foundItalic = false;
        while (node) {
          if (node.nodeType === 1) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            if (tag === 'strong' || tag === 'b') foundBold = true;
            if (tag === 'em' || tag === 'i') foundItalic = true;
          }
          node = node.parentNode;
        }
        setActiveBold(foundBold);
        setActiveItalic(foundItalic);
      } catch (err) {
        setActiveBold(false);
        setActiveItalic(false);
      }
    };
    document.addEventListener('selectionchange', updateActive);
    // initialize
    handleInput();
    return () => {
      el.removeEventListener('focus', handleFocus);
      el.removeEventListener('blur', handleBlur);
      el.removeEventListener('input', handleInput);
      el.removeEventListener('keydown', handleKeyDown as any);
      document.removeEventListener('selectionchange', updateActive);
    };
  }, [contentRef]);

  // Helper: apply command with execCommand primary and fallbacks
  const applyCommand = (cmd: 'bold' | 'italic' | 'formatBlock:h2' | 'formatBlock:blockquote' | 'insertUnorderedList' | 'insertOrderedList') => {
    try {
      if (cmd === 'bold' || cmd === 'italic') {
        const c = cmd;
        if (document.queryCommandSupported && document.queryCommandSupported(c)) {
          document.execCommand(c);
          contentRef.current?.focus();
          onChange(contentRef.current?.innerHTML || '');
          return;
        }
        // fallback: wrap selection
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          // insert empty tag and place caret
          const el = document.createElement(cmd === 'bold' ? 'strong' : 'em');
          el.appendChild(document.createTextNode('\u200B'));
          range.insertNode(el);
          range.setStart(el.firstChild as Node, 0);
          range.setEnd(el.firstChild as Node, 0);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          try {
            const wrapper = document.createElement(cmd === 'bold' ? 'strong' : 'em');
            range.surroundContents(wrapper);
          } catch (err) {
            // fallback: use execCommand as last resort
            document.execCommand(cmd);
          }
        }
        contentRef.current?.focus();
        onChange(contentRef.current?.innerHTML || '');
        return;
      }

      if (cmd.startsWith('formatBlock')) {
        const parts = cmd.split(':');
        const tag = parts[1];
        try {
          document.execCommand('formatBlock', false, tag);
        } catch (e) {
          // fallback: wrap block
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          const range = sel.getRangeAt(0);
          let block = range.startContainer as Node;
          while (block && block.nodeType !== 1) block = block.parentNode as Node;
          const blockEl = block as HTMLElement | null;
          if (blockEl) {
            const newEl = document.createElement(tag);
            newEl.innerHTML = blockEl.innerHTML;
            blockEl.parentNode?.replaceChild(newEl, blockEl);
          }
        }
        contentRef.current?.focus();
        onChange(contentRef.current?.innerHTML || '');
        return;
      }

      if (cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') {
        const listType = cmd === 'insertUnorderedList' ? 'insertUnorderedList' : 'insertOrderedList';
        try {
          document.execCommand(listType);
        } catch (e) {
          // basic fallback: wrap selected lines
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          const range = sel.getRangeAt(0);
          const container = range.startContainer.parentElement;
          if (!container) return;
          const items = container.innerText.split('\n').map((t) => t.trim()).filter(Boolean);
          const list = document.createElement(cmd === 'insertUnorderedList' ? 'ul' : 'ol');
          items.forEach((it) => {
            const li = document.createElement('li');
            li.textContent = it;
            list.appendChild(li);
          });
          range.deleteContents();
          range.insertNode(list);
        }
        contentRef.current?.focus();
        onChange(contentRef.current?.innerHTML || '');
        return;
      }
    } catch (err) {
      // best-effort: focus and continue
      contentRef.current?.focus();
    }
  };

    // paste sanitization
    useEffect(() => {
      const el = contentRef.current;
      if (!el) return;
      const sanitize = (raw: string) => {
        try {
          const w = window as any;
          if (w.DOMPurify && typeof w.DOMPurify.sanitize === 'function') return w.DOMPurify.sanitize(raw);
        } catch (err) {
          // ignore
        }
        // very small fallback: escape tags and preserve line breaks
        return (raw || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
      };

      const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const clipboard = (e.clipboardData || (window as any).clipboardData);
        const html = clipboard?.getData && (clipboard.getData('text/html') || clipboard.getData('text/plain'));
        const clean = sanitize(html || '');
        try {
          // insert sanitized HTML
          document.execCommand('insertHTML', false, clean);
        } catch (err) {
          // fallback: append text
          const text = (clipboard?.getData && clipboard.getData('text/plain')) || '';
          document.execCommand('insertText', false, text);
        }
        // notify change
        onChange(contentRef.current?.innerHTML || '');
      };
      el.addEventListener('paste', handlePaste as any);
      return () => {
        el.removeEventListener('paste', handlePaste as any);
      };
    }, [contentRef]);


  return (
  <div className="tiptap-editor gap-0" lang="en-US" dir="ltr">
    <div className={`tiptap-container ${focused || hasContent ? 'tiptap-filled' : ''}`} lang="en-US" dir="ltr">
            {/* {label && (
                <label
                    className={`tiptap-label ${focused || hasContent ? 'floating' : ''}`}
                    onClick={() => editor?.commands.focus()}
                >
                    {label}
                </label>
            )} */}
            <div className="tiptap-content p-0" role="textbox" aria-multiline="true">
                {/* <EditorContent 
                    editor={editor}
                    label="Description"
                    className="outline"
                /> */}
                {/* <TextArea
                    minRows={5}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || 'Start typing...'}
                    label={label || 'Description'}
                    className="w-full border-0 p-0 m-0 outline-none resize-none bg-transparent"
                /> */}
        <div className="tiptap-textfield-wrapper relative w-full">
          {label && (
            <label className={`tiptap-label ${focused || hasContent ? 'floating' : ''}`} onClick={() => contentRef.current?.focus()}>{label}</label>
          )}
          <div
            id="goal-description"
            ref={(el) => {
              contentRef.current = el;
            }}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            className="tiptap-contenteditable text-gray-90 dark:text-gray-10 w-full min-h-[6rem] p-4 border rounded outline-none"
            lang="en-US"
            dir="ltr"
            dangerouslySetInnerHTML={{ __html: html || '' }}
          />
          {!hasContent && focused && (
            <div className="tiptap-placeholder absolute top-3 left-3 pointer-events-none">{placeholder || 'Start typing...'}</div>
          )}
        </div>
                <div className="tiptap-toolbar absolute bottom-0 left-0 z-10">
                  <Tooltip title="Bold (Ctrl/Cmd+B)" arrow>
                    <span>
                    <IconButton
                      aria-label="Bold"
                      aria-pressed={activeBold}
                      color={activeBold ? 'primary' : 'default'}
                      size="small"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { applyCommand('bold'); }}
                    >
                      <Bold size={16} />
                    </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Italic (Ctrl/Cmd+I)" arrow>
                    <span>
                    <IconButton
                      aria-label="Italic"
                      aria-pressed={activeItalic}
                      color={activeItalic ? 'primary' : 'default'}
                      size="small"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { applyCommand('italic'); }}
                    >
                      <Italic size={16} />
                    </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Heading" arrow>
                    <span>
                    <IconButton
                      aria-label="Heading"
                      size="small"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { applyCommand('formatBlock:h2'); }}
                    >
                      <Hash size={16} />
                    </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Bullet list" arrow>
                    <span>
                    <IconButton
                      aria-label="Bullet list"
                      size="small"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { applyCommand('insertUnorderedList'); }}
                    >
                      <List size={16} />
                    </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Ordered list" arrow>
                    <span>
                    <IconButton
                      aria-label="Ordered list"
                      size="small"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { applyCommand('insertOrderedList'); }}
                    >
                      <List size={16} />
                    </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Blockquote" arrow>
                    <span>
                    <IconButton
                      aria-label="Blockquote"
                      size="small"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { applyCommand('formatBlock:blockquote'); }}
                    >
                      <Quote size={16} />
                    </IconButton>
                    </span>
                  </Tooltip>
                </div>
            </div>
        </div>
    </div>
  );
};

export default TiptapEditor;
