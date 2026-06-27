export type ChatCategory = 'Basic' | 'Work' | 'Skills' | 'Hobbies';
export type ChatMode = 'openai' | 'anthropic';

export interface ChatPrompt {
  id: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
}
