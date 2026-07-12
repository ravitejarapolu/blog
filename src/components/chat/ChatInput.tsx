import { ClaudeChatInput } from '@/components/ui/claude-style-ai-input';
import type { ChatModelSelection, ModelOption } from '@/components/ui/claude-style-ai-input';
import type { ChatInterfaceTheme } from './types';

interface Props {
  onSend: (message: string, selection: ChatModelSelection) => void;
  interfaceTheme?: ChatInterfaceTheme;
  onInterfaceThemeChange?: (theme: ChatInterfaceTheme) => void;
  siteTheme?: 'dark' | 'light';
}

const anthropicModels: ModelOption[] = [
  {
    id: 'fable',
    name: 'Fayble 5',
    description: 'For your toughest challenges',
  },
  {
    id: 'opus',
    name: 'Ohpus 4.8',
    description: 'For complex tasks',
  },
  {
    id: 'sonnet-5',
    name: 'Sonnet 5',
    description: 'Latest model for everyday tasks',
  },
  {
    id: 'sonnet',
    name: 'Sonnett 4.6',
    description: 'Most efficient for everyday tasks',
  },
  {
    id: 'haiku',
    name: 'Hyku 4.5',
    description: 'Fastest effort for quick answers',
  },
];

const openAIModels: ModelOption[] = [
  {
    id: '5.6-sol',
    name: '5.6 Sol',
    description: 'Flagship model for complex work',
  },
  {
    id: '5.6-terra',
    name: '5.6 Terra',
    description: 'Balanced intelligence and speed',
  },
  {
    id: '5.6-luna',
    name: '5.6 Luna',
    description: 'Fastest model for everyday work',
  },
  {
    id: '5.5',
    name: '5.5',
    description: 'Default GPT model family',
  },
  {
    id: '5.4',
    name: '5.4',
    description: 'Strong general responses',
  },
  {
    id: '5.4-mini',
    name: '5.4 Mini',
    description: 'Fast, efficient responses',
  },
  {
    id: '5.3-codex-spark',
    name: '5.3 Codex Spark',
    description: 'Fast coding assistance',
  },
];

export default function ChatInput({
  onSend,
  interfaceTheme = 'anthropic',
  onInterfaceThemeChange,
  siteTheme = 'dark',
}: Props) {
  const models = interfaceTheme === 'openai' ? openAIModels : anthropicModels;
  const defaultModel = interfaceTheme === 'openai' ? '5.6-sol' : 'opus';

  return (
    <ClaudeChatInput
      onSendMessage={(message, _files, _pastedContent, selection) => onSend(message, selection)}
      placeholder={interfaceTheme === 'openai' ? 'Message Ravi GPT' : 'Ask Ravi anything'}
      maxFiles={10}
      maxFileSize={10 * 1024 * 1024}
      models={models}
      defaultModel={defaultModel}
      siteTheme={siteTheme}
      variant={interfaceTheme}
      onVariantChange={onInterfaceThemeChange}
    />
  );
}
