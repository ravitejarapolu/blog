import { useState, useRef, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import ChatCategorySelector from './ChatCategorySelector';
import ChatPromptList from './ChatPromptList';
import ChatInput from './ChatInput';
import ChatBubble from './ChatBubble';
import LoadingBubble from './LoadingBubble';
import type { ChatCategory, ChatPrompt, ChatMessage, ChatMode } from './types';

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

export default function ChatContainer() {
  const [category, setCategory] = useState<ChatCategory>('Basic');
  const [mode, setMode] = useState<ChatMode>('anthropic');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  useEffect(() => {
    if (messages.length > 1 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;
    function handleScroll() {
      // If scrolled to bottom (or very close), hide button
      const isAtBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 40;
      setShowScrollToBottom(!isAtBottom);
    }
    chatArea.addEventListener('scroll', handleScroll);
    return () => chatArea.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToBottom = () => {
    const chatArea = chatAreaRef.current;
    if (chatArea) {
      chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    }
  };

  function handlePromptSelect(prompt: ChatPrompt) {
    setShowCategories(false);
    setMessages(msgs => [
      ...msgs,
      { id: `user-${Date.now()}`, sender: 'user', content: prompt.text },
    ]);
    triggerAssistantResponse(prompt.text);
  }

  function handleSend(message: string) {
    setShowCategories(false);
    console.log('Sending message:', message);
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



  return (
    <div className={`relative min-h-screen w-full flex flex-col items-center px-2 sm:px-0 ${mode === 'openai' ? 'bg-white text-gray-950 dark:bg-gray-950 dark:text-gray-50' : 'bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50'}`}>
      <div className="w-full max-w-4xl mx-auto bg-inherit rounded-xl shadow-lg mt-4 sm:mt-10 mb-24 sm:mb-28 px-2 sm:px-6 pt-2 pb-8 flex flex-col">
        <ChatHeader mode={mode} />
        {showCategories && (
          <>
            <ChatCategorySelector selected={category} mode={mode} onSelect={setCategory} />
            <ChatPromptList prompts={promptData[category]} onSelect={handlePromptSelect} />
          </>
        )}
        <div
          ref={chatAreaRef}
          className="flex flex-col gap-1 mt-4 mb-2 w-full min-h-[120px] pb-32 relative"
          style={{ scrollBehavior: 'smooth' }}
        >
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} sender={msg.sender} content={msg.content} />
          ))}
          <div ref={messagesEndRef} />
          {loading && <LoadingBubble />}
        </div>
        {showScrollToBottom && (
          <button
            onClick={handleScrollToBottom}
            className="fixed bottom-28 right-8 z-50 bg-blue-600 text-white rounded-full shadow-lg p-2 hover:bg-blue-700 transition"
            aria-label="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {/* Sticky ChatInput at bottom of viewport */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-inherit border-t border-gray-200 dark:border-gray-800 px-2 sm:px-0 flex justify-center">
        <div className="w-full max-w-xl">
          <ChatInput mode={mode} onModeChange={setMode} onSend={handleSend} />
        </div>
      </div>
    </div>
  );
}
