
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { IconButton, Tooltip, TextField } from '@mui/material';
import { Bold, Italic, List, Hash, Quote } from 'lucide-react';
import '@styles/richtext.css';

type Props = {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
};

// custom input component that TextField will render instead of <input>
const ContentEditableInput = React.forwardRef<HTMLDivElement, any>(function ContentEditableInput(
  { inputRef, value, onChange, className, placeholder, ...props }: any,
  forwardedRef,
) {
  // localRef points to the DOM node so we can update innerHTML only when needed
  const localRef = React.useRef<HTMLDivElement | null>(null);

  // stable ref callback to attach both forwardedRef and MUI's inputRef
  const setRefs = useCallback((el: HTMLDivElement | null) => {
    localRef.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) (forwardedRef as any).current = el;
    if (typeof inputRef === 'function') inputRef(el);
    else if (inputRef) (inputRef as any).current = el;
  }, [forwardedRef, inputRef]);

  // Only update the DOM content when the incoming `value` differs from current DOM
  // and the element is not focused (to avoid clobbering caret while typing).
  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    // if focused, skip DOM overwrite to preserve caret/selection
    if (document.activeElement === el) return;
    const incoming = value || '';
    if (el.innerHTML !== incoming) {
      el.innerHTML = incoming;
    }
  }, [value]);

  return (
    <div
      ref={setRefs}
      contentEditable
      suppressContentEditableWarning
      className={(className || '') + ' richtext-contenteditable'}
      role="textbox"
      aria-multiline="true"
      onInput={(e) => {
        const html = (e.currentTarget as HTMLElement).innerHTML || '';
        if (onChange) onChange({ target: { value: html } });
      }}
      {...props}
    />
  );
});

const RichTextEditor: React.FC<Props> = ({ id, value, onChange, placeholder, label }) => {
  // local html state for the contentEditable editor
  const [html, setHtml] = useState<string>(value || '');
  const contentRef = useRef<HTMLDivElement | null>(null);


  // Floating label state
  const [focused, setFocused] = useState(false);
  const [hasContent, setHasContent] = useState<boolean>(Boolean(value && String(value).trim()));
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
          // move caret to the end (deepest text node) to avoid appearing reversed
          const moveCaretToEnd = (container: Node) => {
            const range = document.createRange();
            let node: Node | null = container;
            // drill down to the last descendant text node
            while (node && node.lastChild) node = node.lastChild;
            if (!node) node = container;
            // if it's a text node, set offset to its length, otherwise place after it
            if (node.nodeType === Node.TEXT_NODE) {
              range.setStart(node as Node, (node as Text).length);
            } else {
              range.setStartAfter(node as Node);
            }
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          };

          moveCaretToEnd(el);
          // keep focus on editor
          (el as HTMLElement).focus();
        } catch (err) {
          // ignore selection errors
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  // ensure the floating-label state updates immediately when parent value changes
  // prefer the actual contentEditable text (if mounted) so `hasContent` reflects
  // the ContentEditableInput and not the TextField's native input element.
  useEffect(() => {
    const contentText = contentRef.current?.innerText;
    if (typeof contentText === 'string') {
      setHasContent(Boolean(contentText.trim()));
      return;
    }
    setHasContent(Boolean(value && String(value).trim()));
  }, [value]);

  // on mount or when the ref becomes available, initialize hasContent from the
  // actual contentEditable DOM so the floating label is correct immediately.
  useEffect(() => {
    const el = contentRef.current;
    if (el) setHasContent(Boolean((el.innerText || '').trim()));
  }, []);

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
    <>
      {/* <div className="richtext-container" lang="en-US" dir="ltr"> */}
        <div className={`richtext-container w-full ${label ? 'has-label' : ''} ${(focused ? 'richtext-focused' : '') || (hasContent ? 'richtext-filled' : '')}`}>
          {label && (
            <label className={`richtext-label ${focused || hasContent ? 'floating richtext-filled' : ''}`} onClick={() => contentRef.current?.focus()}>{label}</label>
          )}
          <TextField
            id={id}
            multiline
            fullWidth
            value={html}
            placeholder={placeholder}
            /* label shown above as a custom floating label */
            inputRef={(el: any) => { contentRef.current = el; }}
            InputProps={{
              inputComponent: ContentEditableInput as any,
              inputProps: { value: html, placeholder },
            }}
            onChange={() => { /* handled by contentEditable's onInput */ }}
            sx={{
              borderRadius: 0,
              '&::before': {
                border: '1px solid var(--Textarea-focusedHighlight)',
                transform: 'scaleX(0)',
                left: 0,
                right: 0,
                bottom: '-2px',
                top: 'unset',
                transition: 'transform .15s cubic-bezier(0.1,0.9,0.2,1)',
                borderRadius: 0,
              },
              '&:focus-within::before': {
                transform: 'scaleX(1)',
              },
              '& .richtext-contenteditable': { paddingBottom: '3.25rem' },
              '& label.richtext-filled': { transform: 'translate(14px, -6px) scale(0.75)'}, 
            }}
          />
          <div className="richtext-toolbar">
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
        {/* </div> */}
      </div>
    </>
  );
};

export default RichTextEditor;
