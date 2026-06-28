import { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './ChatInput';
import ChatBubble from './ChatBubble';
import LoadingBubble from './LoadingBubble';
import type { ChatCategory, ChatPrompt, ChatMessage, ChatInterfaceTheme } from './types';

const promptData: Record<ChatCategory, ChatPrompt[]> = {
  "Basic": [
    { id: "basic-1", text: "What is your educational background?" },
    { id: "basic-2", text: "How did you get started in software engineering?" },
    { id: "basic-3", text: "What programming languages do you know?" },
    { id: "basic-4", text: "What are your strongest technical skills?" },
    { id: "basic-5", text: "How to contact you?" },
  ],
  "Work": [
    { id: "work-1", text: "Where are you currently working?" },
    { id: "work-2", text: "What companies have you worked for?" },
    { id: "work-3", text: "What was your most challenging project?" },
    { id: "work-4", text: "What was your Current project?" },
    { id: "work-5", text: "What is your leadership experience?" },
  ],
  "Skills": [
    { id: "skills-1", text: "Tell me about your software engineering experience." },
    { id: "skills-2", text: "What industries have you worked in?" },
    { id: "skills-3", text: "What are your most impressive projects?" },
    { id: "skills-4", text: "Do you have any open source contributions?" },
    { id: "skills-5", text: "What technologies do you use in your projects?" },
  ],
  "Hobbies": [
    { id: "hobbies-1", text: "What are your hobbies?" },
    { id: "hobbies-2", text: "What do you like to do outside of work?" },
    { id: "hobbies-3", text: "What project are you most proud of?" },
    { id: "hobbies-4", text: "What are you learning right now?" },
    { id: "hobbies-5", text: "Can you share your GitHub?" },
  ],
};

const allPrompts = Object.entries(promptData).flatMap(([category, prompts]) =>
  prompts.map((prompt) => ({
    ...prompt,
    category: category as ChatCategory,
  })),
);

const emptyStatePhrases = [
  'Up late, Ravi?',
  'Ask something about Ravi?',
  'Ask Ravi a question?',
  'Ready to interrogate Ravi?',
  'What should we ask Ravi?',
  'Curious about Ravi?',
  'What is Ravi building?',
  'Need Ravi context?',
  'Looking for the real Ravi?',
  'What should Ravi explain?',
  'Interview Ravi for a minute?',
  'Ask Ravi about work?',
  'Ask Ravi about the weird stuff?',
  'What makes Ravi useful?',
  'Ravi, in one question?',
  'What is Ravi good at?',
  'Want the Ravi rundown?',
  'Ask the Ravi file?',
  'What has Ravi shipped?',
  'What is Ravi learning?',
  'What would Ravi say?',
  'Need a Ravi signal?',
  'Start with Ravi?',
];

const CHAT_INTERFACE_KEY = 'raviChatInterfaceTheme';

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [emptyPhraseIndex, setEmptyPhraseIndex] = useState(0);
  const [interfaceTheme, setInterfaceTheme] = useState<ChatInterfaceTheme>('anthropic');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      chatArea.scrollTo({ top: chatArea.scrollHeight, behavior });
      scrollFrameRef.current = null;
    });
  }, []);

  useEffect(() => {
    if ((messages.length > 0 || loading) && shouldStickToBottomRef.current) {
      scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
    }
  }, [loading, messages.length, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const chatContent = chatContentRef.current;
    if (!chatContent || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom('smooth');
      }
    });

    resizeObserver.observe(chatContent);

    return () => resizeObserver.disconnect();
  }, [scrollToBottom]);

  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;
    const chatAreaElement = chatArea;
    function handleScroll() {
      // If scrolled to bottom (or very close), hide button
      const isAtBottom = chatAreaElement.scrollHeight - chatAreaElement.scrollTop - chatAreaElement.clientHeight < 48;
      shouldStickToBottomRef.current = isAtBottom;
      setShowScrollToBottom(!isAtBottom);
    }
    chatAreaElement.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => chatAreaElement.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(CHAT_INTERFACE_KEY);
    if (stored === 'anthropic' || stored === 'openai') {
      setInterfaceTheme(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CHAT_INTERFACE_KEY, interfaceTheme);
  }, [interfaceTheme]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setEmptyPhraseIndex((current) => (current + 1) % emptyStatePhrases.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, []);

  const handleScrollToBottom = () => {
    shouldStickToBottomRef.current = true;
    scrollToBottom('smooth');
  };

  function handleSend(message: string) {
    shouldStickToBottomRef.current = true;
    setMessages(msgs => [
      ...msgs,
      { id: `user-${Date.now()}`, sender: 'user', content: message },
    ]);
    triggerAssistantResponse(message);
  }
  // Send AI response via API
  async function triggerAssistantResponse(userMessage: string) {
    setLoading(true);
    try {
      const response = await fetch('https://ravitejarapolu6--ravigpt-modal-ravi-gpt.modal.run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userMessage }),
      });
      const data = await response.json();
      setMessages(msgs => [
        ...msgs,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content: data?.response || 'Sorry, no response received.',
        },
      ]);
    } catch (error) {
      setMessages(msgs => [
        ...msgs,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content: 'Sorry, there was an error getting a response.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const isOpenAI = interfaceTheme === 'openai';
  const rootClassName = isOpenAI
    ? 'relative flex min-h-dvh w-full max-w-full flex-col overflow-hidden bg-black text-[#f4f4f4]'
    : 'font-anthropic relative flex min-h-dvh w-full max-w-full flex-col overflow-hidden bg-[#1f1f1d] text-[#f4efe7]';
  const mainClassName = 'mx-auto flex min-h-dvh w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6';
  const chatAreaClassName = 'relative flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-4 sm:px-5';
  const chatContentClassName = 'flex min-h-full w-full flex-col gap-2';
  const sectionClassName = 'flex min-h-0 flex-1 flex-col overflow-hidden';
  const composerClassName = 'mx-auto w-full max-w-3xl min-w-0 pb-1';



  return (
    <div className={rootClassName}>
      <main className={mainClassName}>
        <section className={sectionClassName}>
          <div
            ref={chatAreaRef}
            className={chatAreaClassName}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div ref={chatContentRef} className={chatContentClassName}>
              {messages.length === 0 && !loading && (
                <div className="flex flex-1 items-center justify-center py-8">
                  <div className="text-center">
                    <div className={isOpenAI ? 'mx-auto mb-5 flex h-14 w-14 items-center justify-center text-[#f4f4f4]' : 'mx-auto mb-5 flex h-14 w-14 items-center justify-center text-[#d97745]'}>
                      {isOpenAI ? <OpenAILogo /> : <ClaudeBurst />}
                    </div>
                    <p className={
                      isOpenAI
                        ? 'text-[2rem] font-semibold leading-tight text-[#f4f4f4] sm:text-5xl'
                        : 'text-[2rem] font-semibold leading-tight text-[#d7d2c8] sm:text-5xl'
                    }>
                      {emptyStatePhrases[emptyPhraseIndex]}
                    </p>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  sender={msg.sender}
                  content={msg.content}
                  interfaceTheme={interfaceTheme}
                />
              ))}
              {loading && <LoadingBubble interfaceTheme={interfaceTheme} />}
              <div
                ref={messagesEndRef}
                className="h-px w-full shrink-0 scroll-mt-4"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={composerClassName}>
            <ChatInput
              onSend={handleSend}
              interfaceTheme={interfaceTheme}
              onInterfaceThemeChange={setInterfaceTheme}
              suggestions={allPrompts.map((prompt) => ({
                id: prompt.id,
                text: prompt.text,
                category: prompt.category,
              }))}
            />
          </div>
        </section>

        {showScrollToBottom && (
          <button
            onClick={handleScrollToBottom}
            className="fixed bottom-24 right-4 z-50 rounded-full border border-[#010920] bg-primary p-3 text-[#010920] shadow-[0_12px_30px_rgb(1_9_32_/_18%)] transition hover:bg-tertiary dark:border-primary sm:bottom-8 sm:right-8"
            aria-label="Scroll to bottom"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </main>
    </div>
  );
}

function ClaudeBurst() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index * 22.5 * Math.PI) / 180;
        const x1 = 32 + Math.cos(angle) * 7;
        const y1 = 32 + Math.sin(angle) * 7;
        const x2 = 32 + Math.cos(angle) * 25;
        const y2 = 32 + Math.sin(angle) * 25;

        return (
          <line
            key={index}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function OpenAILogo() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 8.6c4.1 0 7.5 2.6 8.8 6.2 3.8-.5 7.7 1.3 9.8 4.9 2.1 3.6 1.6 7.8-.7 10.9 2.4 3.1 2.8 7.3.8 10.9-2.1 3.6-5.9 5.5-9.8 5-1.4 3.6-4.8 6.1-8.9 6.1s-7.5-2.5-8.9-6.1c-3.8.5-7.7-1.4-9.8-5-2.1-3.6-1.6-7.8.8-10.9-2.4-3.1-2.8-7.3-.7-10.9 2.1-3.6 5.9-5.4 9.8-4.9C24.5 11.2 27.9 8.6 32 8.6Z" />
        <path d="M40.8 14.8 25.7 23.5a8.3 8.3 0 0 0-4.1 7.2v15.8" />
        <path d="M49.9 30.6 34.8 21.9a8.3 8.3 0 0 0-8.2 0L12.9 29.8" />
        <path d="M40.9 46.5V29.1a8.3 8.3 0 0 0-4.1-7.2L23.2 14" />
        <path d="M23.2 46.5 38.3 37.8a8.3 8.3 0 0 0 4.1-7.2V14.8" />
        <path d="M14.1 30.6 29.2 39.3a8.3 8.3 0 0 0 8.2 0l13.7-7.9" />
        <path d="M23.1 14.8v17.4a8.3 8.3 0 0 0 4.1 7.2l13.6 7.9" />
      </g>
    </svg>
  );
}
