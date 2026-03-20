import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, ExternalLink, Plus } from 'lucide-react';
import supabase from '@lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SuggestedTask {
  title: string;
  description: string;
}

export interface SuggestedLink {
  label: string;
  url: string;
  reason: string;
}

interface Props {
  taskTitle: string;
  taskDescription?: string;
  goalTitle?: string;
  onAddSuggestedTask: (task: SuggestedTask) => void;
  /** Restore prior conversation on re-open */
  initialMessages?: ChatMessage[];
  /** Called whenever the message list changes so parent can persist it */
  onMessagesChange?: (messages: ChatMessage[]) => void;
  /** Restore pending AI-suggested tasks from last response */
  initialPendingTasks?: SuggestedTask[];
  /** Restore pending AI-suggested resource links from last response */
  initialPendingLinks?: SuggestedLink[];
  /** Called whenever pending suggested tasks change so parent can persist them */
  onPendingTasksChange?: (tasks: SuggestedTask[]) => void;
  /** Called whenever pending suggested links change so parent can persist them */
  onPendingLinksChange?: (links: SuggestedLink[]) => void;
}

const STARTER_PROMPTS = [
  'How should I approach this task?',
  'What are common pitfalls to avoid?',
  'Break this into smaller steps',
  'What resources would help?',
];

const FocusAIChat: React.FC<Props> = ({ taskTitle, taskDescription, goalTitle, onAddSuggestedTask, initialMessages, onMessagesChange, initialPendingTasks, initialPendingLinks, onPendingTasksChange, onPendingLinksChange }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);

  // If the parent loads a session after mount and passes non-empty initialMessages, sync once
  const didSyncRef = useRef(false);
  useEffect(() => {
    if (!didSyncRef.current && initialMessages && initialMessages.length > 0) {
      didSyncRef.current = true;
      setMessages(initialMessages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<SuggestedTask[]>(initialPendingTasks ?? []);
  const [pendingLinks, setPendingLinks] = useState<SuggestedLink[]>(initialPendingLinks ?? []);

  // Sync pending tasks/links from restored session (once, after parent load effect settles)
  const didSyncPendingTasksRef = useRef(false);
  useEffect(() => {
    if (!didSyncPendingTasksRef.current && initialPendingTasks && initialPendingTasks.length > 0) {
      didSyncPendingTasksRef.current = true;
      setPendingTasks(initialPendingTasks);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPendingTasks]);
  const didSyncPendingLinksRef = useRef(false);
  useEffect(() => {
    if (!didSyncPendingLinksRef.current && initialPendingLinks && initialPendingLinks.length > 0) {
      didSyncPendingLinksRef.current = true;
      setPendingLinks(initialPendingLinks);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPendingLinks]);

  // Notify parent whenever pending state changes (for persistence)
  useEffect(() => { onPendingTasksChange?.(pendingTasks); }, [pendingTasks]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onPendingLinksChange?.(pendingLinks); }, [pendingLinks]); // eslint-disable-line react-hooks/exhaustive-deps
  const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMessage: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    onMessagesChange?.(newMessages);
    setInput('');
    setLoading(true);
    setPendingTasks([]);
    setPendingLinks([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/.netlify/functions/focusChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          taskTitle,
          taskDescription,
          goalTitle,
          messages: newMessages,
        }),
      });

      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();

      const assistantMsg = { role: 'assistant' as const, content: data.message };
      const updatedWithReply = [...newMessages, assistantMsg];
      setMessages(updatedWithReply);
      onMessagesChange?.(updatedWithReply);
      if (data.suggestedTasks?.length) setPendingTasks(data.suggestedTasks);
      if (data.suggestedLinks?.length) setPendingLinks(data.suggestedLinks);
    } catch (err) {
      const errorMsg = { role: 'assistant' as const, content: "Sorry, I couldn't connect. Please try again." };
      const updatedWithError = [...newMessages, errorMsg];
      setMessages(updatedWithError);
      onMessagesChange?.(updatedWithError);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleAddTask = (task: SuggestedTask) => {
    const key = task.title;
    if (addedTaskIds.has(key)) return;
    setAddedTaskIds((prev) => new Set([...prev, key]));
    onAddSuggestedTask(task);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-2 min-h-0">
        {messages.length === 0 && (
          <div className="pt-2">
            <p className="text-sm text-secondary-text mb-3 text-center">Ask your Focus Assistant anything about this task.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs px-3 py-1.5 rounded-full border border-brand-50/40 text-brand-30 hover:bg-brand-60/20 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-brand-60 text-white rounded-br-sm'
                  : 'bg-brand-10 dark:bg-brand-90 text-primary-text rounded-bl-sm border border-gray-20 dark:border-gray-70'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-20 dark:bg-gray-80 border border-gray-20 dark:border-gray-70 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-secondary-text text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}

        {/* Suggested links after last AI message */}
        {pendingLinks.length > 0 && (
          <div className="rounded-md border border-brand-50/30 bg-brand-95/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-brand-30 uppercase tracking-wide">Suggested Resources</p>
            {pendingLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 group"
              >
                <div>
                    <div>
                        <span className="flex gap-2 text-sm text-brand-40 group-hover:text-brand-30 underline underline-offset-2">
                            {link.label}
                            <ExternalLink className="w-3.5 h-3.5 text-brand-40 mt-1 shrink-0" />
                        </span>
                    <p className="text-xs text-secondary-text mt-0.5">{link.reason}</p>
                    </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Suggested tasks after last AI message */}
        {pendingTasks.length > 0 && (
          <div className="rounded-xl border border-emerald-50/30 bg-emerald-95/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-30 uppercase tracking-wide">Suggested Tasks to Capture</p>
            {pendingTasks.map((task, i) => {
              const added = addedTaskIds.has(task.title);
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-text font-medium">{task.title}</p>
                    {task.description && <p className="text-xs text-secondary-text mt-0.5">{task.description}</p>}
                  </div>
                  <button
                    onClick={() => handleAddTask(task)}
                    disabled={added}
                    className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                      added
                        ? 'bg-gray-30 dark:bg-gray-70 text-gray-50 cursor-default'
                        : 'bg-emerald-60 hover:bg-emerald-70 text-white'
                    }`}
                  >
                    {added ? 'Added' : <><Plus className="w-3 h-3" /> Add</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-gray-20 dark:border-gray-80 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything… (Enter to send)"
          rows={2}
          className="flex-1 rounded-md border border-gray-30 dark:border-gray-70 bg-gray-10 dark:bg-gray-90 text-primary-text placeholder:text-secondary-text text-sm p-3 resize-none focus:outline-none focus:border-brand-50 transition-colors"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default FocusAIChat;
