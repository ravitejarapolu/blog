import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { ArrowDown } from 'lucide-react';
import ChatInput from './ChatInput';
import ChatBubble from './ChatBubble';
import LoadingBubble from './LoadingBubble';
import {
  THEME_CHANGE_EVENT,
  getStoredThemeMode,
} from '../../scripts/theme';
import type { ChatMessage, ChatInterfaceTheme } from './types';
import type { ChatModelSelection } from '@/components/ui/claude-style-ai-input';

type ChatSiteTheme = 'light' | 'dark';

const RAVI_GPT_ENDPOINT = 'https://ravitejarapolu6--ravigpt-modal-ravi-gpt.modal.run';
const RAVI_GPT_STREAM_ENDPOINT = `${RAVI_GPT_ENDPOINT}/stream`;
const RATE_LIMIT_FALLBACK_MESSAGE =
  'Rate limit exceeded on Cerebras free tier.\n\nRavi GPT uses `gpt-oss-120b` and `zai-glm-4.7`, which are limited to **5 requests per minute** and **30K tokens per minute** on the free trial. The quota refills continuously, so wait about 60 seconds and try again.';
const PROVIDER_ERROR_FALLBACK_MESSAGE =
  'Ravi GPT could not reach the model provider. If you just sent several messages quickly, the Cerebras free-tier quota may still be refilling. Please try again in about a minute.';
const STREAM_REVEAL_INTERVAL_MS = 18;

const emptyStatePhrases = [
  'What should we ask Ravi?',
  'Want the quick read on Ravi?',
  "Need Ravi's work story?",
  'Curious what Ravi has built?',
  "Looking for Ravi's technical side?",
  'What would you ask Ravi first?',
  'Should we talk work, projects, or life?',
  'What would help you understand Ravi?',
  'Want a sharper intro to Ravi?',
];

const EMPTY_STATE_PHRASE_SESSION_KEY = 'raviChatEmptyStatePhrase';

function getSessionEmptyStatePhrase() {
  const storedPhrase = window.sessionStorage.getItem(EMPTY_STATE_PHRASE_SESSION_KEY);
  if (storedPhrase && emptyStatePhrases.includes(storedPhrase)) {
    return storedPhrase;
  }

  const phrase =
    emptyStatePhrases[Math.floor(Math.random() * emptyStatePhrases.length)] ||
    emptyStatePhrases[0];
  window.sessionStorage.setItem(EMPTY_STATE_PHRASE_SESSION_KEY, phrase);
  return phrase;
}

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [emptyStatePhrase, setEmptyStatePhrase] = useState(emptyStatePhrases[0]);
  const [interfaceTheme, setInterfaceTheme] = useState<ChatInterfaceTheme>('anthropic');
  const [interfaceThemeReady, setInterfaceThemeReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [siteTheme, setSiteTheme] = useState<ChatSiteTheme>('dark');
  const syncSiteTheme = useCallback(() => {
    const resolvedMode = getStoredThemeMode();
    if (resolvedMode === 'dark' || resolvedMode === 'light') {
      setSiteTheme(resolvedMode);
      return;
    }

    const datasetTheme = document.documentElement.dataset.theme;
    if (datasetTheme === 'dark' || datasetTheme === 'light') {
      setSiteTheme(datasetTheme);
      return;
    }

    const matchesDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setSiteTheme(matchesDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    syncSiteTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handleThemeChange = () => syncSiteTheme();
    const handleAppThemeChange = () => {
      handleThemeChange();
    };
    media.addEventListener('change', handleThemeChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleAppThemeChange);

    return () => {
      media.removeEventListener('change', handleThemeChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleAppThemeChange);
    };
  }, [syncSiteTheme]);

  useLayoutEffect(() => {
    setInterfaceTheme(Math.random() < 0.5 ? 'anthropic' : 'openai');
    setInterfaceThemeReady(true);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      chatArea.scrollTo({
        top: Math.max(0, chatArea.scrollHeight - chatArea.clientHeight),
        behavior,
      });
      scrollFrameRef.current = null;
    });
  }, []);

  useLayoutEffect(() => {
    if ((messages.length > 0 || loading) && shouldStickToBottomRef.current) {
      scrollToBottom(loading || messages.length <= 1 ? 'auto' : 'smooth');
    }
  }, [loading, messages, scrollToBottom]);

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
    setEmptyStatePhrase(getSessionEmptyStatePhrase());
  }, []);

  const handleScrollToBottom = () => {
    shouldStickToBottomRef.current = true;
    setShowScrollToBottom(false);
    scrollToBottom('smooth');
  };

  function handleInterfaceThemeChange(nextTheme: ChatInterfaceTheme) {
    setInterfaceTheme(nextTheme);
  }

  function handleSend(message: string, selection: ChatModelSelection) {
    shouldStickToBottomRef.current = true;
    setMessages(msgs => [
      ...msgs,
      { id: `user-${Date.now()}`, sender: 'user', content: message },
    ]);
    triggerAssistantResponse(message, selection);
  }

  function buildRequestPayload(userMessage: string, selection: ChatModelSelection) {
    return {
      prompt: userMessage,
      interface_theme: selection.interfaceTheme,
      selected_model_id: selection.modelId,
      selected_model_name: selection.modelName,
      selected_effort: selection.effort,
    };
  }

  function appendAssistantMessage(content: string) {
    setMessages(msgs => [
      ...msgs,
      {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content,
      },
    ]);
  }

  // Send AI response via API
  async function triggerAssistantResponse(userMessage: string, selection: ChatModelSelection) {
    setLoading(true);
    const assistantId = `assistant-${Date.now()}`;
    const requestPayload = buildRequestPayload(userMessage, selection);
    const writer = createStreamingAssistantWriter(assistantId);

    try {
      const response = await fetch(RAVI_GPT_STREAM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          await writer.finish();
          appendAssistantMessage(RATE_LIMIT_FALLBACK_MESSAGE);
          return;
        }

        throw new Error(`Ravi GPT stream failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        writer.append(chunk);
      }

      const tail = decoder.decode();
      if (tail) {
        writer.append(tail);
      }

      await writer.finish();

      if (!writer.fullText.trim()) {
        appendAssistantMessage('Ravi GPT did not return any text. Please try again.');
      }
    } catch {
      if (writer.fullText.trim()) {
        writer.append('\n\nThe response stopped before it finished. Please try again.');
        await writer.finish();
      } else {
        await writer.finish();
        appendAssistantMessage(PROVIDER_ERROR_FALLBACK_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  }

  function createStreamingAssistantWriter(assistantId: string) {
    let fullText = '';
    let visibleText = '';
    let hasAssistantMessage = false;
    let isFinished = false;
    let timerId: number | null = null;
    let resolveFinished: () => void = () => {};

    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    const upsertAssistantMessage = (content: string) => {
      if (!hasAssistantMessage) {
        hasAssistantMessage = true;
        setMessages(msgs => [
          ...msgs,
          {
            id: assistantId,
            sender: 'assistant',
            content,
          },
        ]);
        return;
      }

      setMessages(msgs =>
        msgs.map(msg => (msg.id === assistantId ? { ...msg, content } : msg)),
      );
    };

    const revealNextChunk = () => {
      timerId = null;

      if (visibleText.length < fullText.length) {
        const remaining = fullText.length - visibleText.length;
        const stepSize = remaining > 120 ? 14 : remaining > 48 ? 9 : 5;
        visibleText = fullText.slice(0, visibleText.length + stepSize);
        upsertAssistantMessage(visibleText);
      }

      if (isFinished && visibleText.length >= fullText.length) {
        resolveFinished();
        return;
      }

      scheduleReveal();
    };

    const scheduleReveal = () => {
      if (timerId !== null) return;
      timerId = window.setTimeout(revealNextChunk, STREAM_REVEAL_INTERVAL_MS);
    };

    return {
      get fullText() {
        return fullText;
      },
      append(text: string) {
        if (!text) return;
        fullText += text;
        scheduleReveal();
      },
      finish() {
        isFinished = true;
        scheduleReveal();
        return finished;
      },
    };
  }

  const isOpenAI = interfaceTheme === 'openai';
  const chatThemeTokens = getChatThemeTokens(interfaceTheme, siteTheme);
  const rootClassName = isOpenAI
    ? siteTheme === 'dark'
      ? 'font-openai relative flex h-dvh min-h-dvh w-full max-w-full flex-col overflow-hidden bg-black text-white'
      : 'font-openai relative flex h-dvh min-h-dvh w-full max-w-full flex-col overflow-hidden bg-white text-[#0d0d0d]'
    : 'font-anthropic relative flex h-dvh min-h-dvh w-full max-w-full flex-col overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]';
  const mainClassName = 'mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6';
  const chatAreaClassName = 'relative flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-4 sm:px-5';
  const chatContentClassName = 'flex min-h-full w-full flex-col gap-2';
  const sectionClassName = 'relative flex min-h-0 flex-1 flex-col overflow-hidden';
  const composerClassName = 'relative z-20 mx-auto w-full max-w-3xl min-w-0 shrink-0 pb-1';
  const scrollButtonClassName = [
    'absolute bottom-[calc(100%+0.75rem)] left-1/2 z-30 flex h-10 w-10 -translate-x-1/2 items-center justify-center border shadow-lg transition-colors',
    isOpenAI
      ? siteTheme === 'dark'
        ? 'rounded-full border-white/10 bg-[#2f2f2f] text-white shadow-black/35 hover:bg-[#3a3a3a]'
        : 'rounded-full border-[#d9d9e3] bg-white text-[#0d0d0d] shadow-[0_8px_22px_rgb(0_0_0_/_12%)] hover:bg-[#f4f4f4]'
      : siteTheme === 'dark'
          ? 'rounded-lg border-white/10 bg-[#30302E] text-[#f2f0ea] shadow-black/30 hover:bg-[#3a3936]'
          : 'rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_8px_22px_rgb(31_25_16_/_14%)] hover:bg-[var(--color-background-offset)]',
  ].join(' ');



  return (
    <div
      className={`${rootClassName} ${interfaceThemeReady ? 'visible' : 'invisible'}`}
      data-chat-interface={interfaceTheme}
      style={chatThemeTokens}
    >
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
                          <div
                        className={
                          isOpenAI
                            ? 'mx-auto mb-5 flex h-14 w-14 items-center justify-center text-[var(--color-text)]'
                            : 'mx-auto mb-5 flex h-14 w-14 items-center justify-center text-[var(--color-primary)]'
                        }
                      >
                        {isOpenAI ? <OpenAILogo /> : <ClaudeBurst />}
                      </div>
                      <p className={
                        'mx-auto max-w-[22rem] px-4 text-xl font-semibold leading-tight text-[var(--color-text)] sm:max-w-2xl sm:text-3xl'
                      }>
                      {emptyStatePhrase}
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
                  siteTheme={siteTheme}
                />
              ))}
              {loading && <LoadingBubble interfaceTheme={interfaceTheme} siteTheme={siteTheme} />}
              <div
                ref={messagesEndRef}
                className="h-px w-full shrink-0 scroll-mt-4"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={composerClassName}>
            {showScrollToBottom && (
              <button
                onClick={handleScrollToBottom}
                className={scrollButtonClassName}
                aria-label="Scroll to latest message"
                title="Scroll to latest message"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            )}
            <ChatInput
              onSend={handleSend}
              interfaceTheme={interfaceTheme}
              siteTheme={siteTheme}
              onInterfaceThemeChange={handleInterfaceThemeChange}
            />
          </div>
        </section>

      </main>
    </div>
  );
}

function getChatThemeTokens(
  interfaceTheme: ChatInterfaceTheme,
  siteTheme: ChatSiteTheme,
): CSSProperties {
  if (interfaceTheme === 'openai') {
    return {
      '--color-primary': siteTheme === 'dark' ? '#ffffff' : '#111111',
      '--color-text': siteTheme === 'dark' ? '#f4f4f4' : '#0d0d0d',
      '--color-text-offset': siteTheme === 'dark' ? '#a6a6a6' : '#676767',
      '--color-background': siteTheme === 'dark' ? '#000000' : '#ffffff',
      '--color-background-offset': siteTheme === 'dark' ? '#111111' : '#f7f7f5',
      '--color-surface': siteTheme === 'dark' ? '#181818' : '#ffffff',
      '--color-border': siteTheme === 'dark' ? '#2a2a2a' : '#e5e5e0',
    } as CSSProperties;
  }

  return {
    '--accent-brand': '14.8 63.1% 59.6%',
    '--color-primary': 'hsl(var(--accent-brand) / 1)',
    '--color-text': siteTheme === 'dark' ? '#f5efe7' : '#28231d',
    '--color-text-offset': siteTheme === 'dark' ? '#b6aea3' : '#756d63',
    '--color-background': siteTheme === 'dark' ? '#191816' : '#faf7f0',
    '--color-background-offset': siteTheme === 'dark' ? '#23211e' : '#f1ece3',
    '--color-surface': siteTheme === 'dark' ? '#2f2e2a' : '#f6f1e8',
    '--color-border': siteTheme === 'dark' ? '#45413a' : '#ded5c8',
  } as CSSProperties;
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
