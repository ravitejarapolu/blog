import type { ChatMode } from './types';

interface Props {
  mode: ChatMode;
}

export default function ChatHeader({ mode }: Props) {
  const isOpenAI = mode === 'openai';

  return (
    <header className="rounded-t-xl bg-inherit py-4 text-center sm:py-6">
      <h1 className={`text-2xl font-bold sm:text-3xl ${isOpenAI ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-200'}`}>
        Ask me anything about rAvI
      </h1>
    </header>
  );
}
