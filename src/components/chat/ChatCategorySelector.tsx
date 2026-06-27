import type { ChatCategory, ChatMode } from './types';
import type { JSX } from 'react';

interface Props {
  selected: ChatCategory;
  mode: ChatMode;
  onSelect: (cat: ChatCategory) => void;
}

const categories: ChatCategory[] = ['Basic', 'Work', 'Skills', 'Hobbies'];

const iconClass = 'w-4 h-4 shrink-0';

const categoryIcons: Record<ChatCategory, JSX.Element> = {
  Basic: (
    <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6v13" /><path d="M12 6v13" /><path d="M21 6v13" /></svg>
  ),
  Work: (
    <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13a20 20 0 0 0 18 0" /></svg>
  ),
  Skills: (
    <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v1" /><path d="M4 12H3" /><path d="M21 12h-1" /><path d="m6.3 6.3-.7-.7" /><path d="m18.4 5.6-.7.7" /><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0-1 3h-4a3.5 3.5 0 0 0-1-3" /><path d="M9.7 17h4.6" /></svg>
  ),
  Hobbies: (
    <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m19.5 13.6-7.5 7.4-2.9-2.9" /><path d="M3 13h2l2 3 2-6 1 3h3" /><path d="M3 10a5 5 0 0 1 9-3a5 5 0 1 1 7.5 6.6" /></svg>
  ),
};

const modeStyles: Record<ChatMode, { selected: string; idle: string }> = {
  anthropic: {
    selected: 'border-amber-300 bg-amber-100 text-amber-900 shadow-sm dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100',
    idle: 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800',
  },
  openai: {
    selected: 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-100',
    idle: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
  },
};

export default function ChatCategorySelector({ selected, mode, onSelect }: Props) {
  return (
    <div className="mb-6 flex w-full flex-wrap items-center justify-center gap-2">
      {categories.map(cat => {
        const active = cat === selected;
        return (
          <button
            type="button"
            key={cat}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors duration-200 ${active ? modeStyles[mode].selected : modeStyles[mode].idle}`}
            onClick={() => onSelect(cat)}
            aria-pressed={active}
          >
            {categoryIcons[cat]}
            {cat}
          </button>
        );
      })}
    </div>
  );
}
