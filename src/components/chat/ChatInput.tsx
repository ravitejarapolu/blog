import { useState } from 'react';
import type { ChatMode } from './types';

interface Props {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSend: (message: string) => void;
}

const modes: Array<{ id: ChatMode; label: string; dot: string }> = [
  { id: 'anthropic', label: 'Anthropic', dot: 'bg-amber-700' },
  { id: 'openai', label: 'OpenAI', dot: 'bg-emerald-600' },
];

const pickerStyles: Record<ChatMode, string> = {
  anthropic: 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',
  openai: 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800',
};

export default function ChatInput({ mode, onModeChange, onSend }: Props) {
  const [value, setValue] = useState('');

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  }

  return (

    <form className="flex items-center gap-2 px-2 sm:px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 fixed bottom-0 left-0 right-0 w-screen mx-auto max-w-3xl rounded-full" onSubmit={(e) => handleSend(e)}>
      <a
        href="/blog/"
        className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition text-sm"
        style={{ minWidth: 'fit-content' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" width={24} height={24} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M6 22.879a3 3 0 0 1-3-3v-10q0-.052.005-.1H3c0-.577.229-1.13.636-1.536L9.88 2a3 3 0 0 1 4.242 0l6.243 6.243c.407.407.636.96.636 1.535h-.005q.005.05.005.1v10a3 3 0 0 1-3 3zm6.707-19.465L19 9.707V19.88a1 1 0 0 1-1 1h-3v-5a3 3 0 1 0-6 0v5H6a1 1 0 0 1-1-1V9.707l6.293-6.293a1 1 0 0 1 1.414 0" clipRule="evenodd"></path></svg>
      </a>
      <div className={`inline-flex h-9 shrink-0 items-center rounded-full border p-0.5 shadow-sm transition-colors ${pickerStyles[mode]}`} aria-label="Choose chat model provider">
        {modes.map(option => {
          const active = option.id === mode;
          return (
            <button
              key={option.id}
              type="button"
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors sm:px-3 ${
                active
                  ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
              onClick={() => onModeChange(option.id)}
              aria-pressed={active}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${option.dot}`} aria-hidden="true" />
              <span className="hidden sm:inline">{option.label}</span>
              <span className="sm:hidden">{option.label.slice(0, 2)}</span>
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => setValue((e.target as HTMLInputElement).value)}
        placeholder="Ask me anything about Ravi Teja Rapolu..."
        aria-label="Type your message"
        className="min-w-0 flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/60 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
      <button
        type="submit"
        aria-label="Send message"
        className="ml-2 bg-blue-400/30 hover:bg-blue-700/70 text-white px-4 py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/70"
      >
        <span className="text-lg">↑</span>
      </button>
    </form>
  );
}
