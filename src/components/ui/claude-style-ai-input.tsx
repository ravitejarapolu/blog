"use client";

import type React from 'react';
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ArrowUp,
  X,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  type: string;
  uploadStatus: 'pending' | 'uploading' | 'complete' | 'error';
  uploadProgress?: number;
  abortController?: AbortController;
  textContent?: string;
}

export interface PastedContent {
  id: string;
  content: string;
  timestamp: Date;
  wordCount: number;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export interface ChatModelSelection {
  interfaceTheme: 'anthropic' | 'openai' | 'wise';
  modelId: string;
  modelName: string;
  effort: string;
}

interface ChatInputProps {
  onSendMessage?: (
    message: string,
    files: FileWithPreview[],
    pastedContent: PastedContent[],
    selection: ChatModelSelection,
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  models?: ModelOption[];
  defaultModel?: string;
  onModelChange?: (modelId: string) => void;
  onSelectionChange?: (selection: ChatModelSelection) => void;
  variant?: 'anthropic' | 'openai' | 'wise';
  onVariantChange?: (variant: 'anthropic' | 'openai' | 'wise') => void;
  siteTheme?: 'dark' | 'light';
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const PASTE_THRESHOLD = 200;
const DEFAULT_MODELS_INTERNAL: ModelOption[] = [
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Balanced model',
    badge: 'Latest',
  },
  {
    id: 'claude-opus-3.5',
    name: 'Claude Opus 3.5',
    description: 'Highest intelligence',
  },
  {
    id: 'claude-haiku-3',
    name: 'Claude Haiku 3',
    description: 'Fastest responses',
  },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const AnthropicThemeIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
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

const OpenAIThemeIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
    <g
      stroke="currentColor"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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

const getFileIcon = (type: string, isSiteDark: boolean) => {
  const iconClassName = isSiteDark
    ? 'h-5 w-5 text-zinc-400'
    : 'h-5 w-5 text-[var(--color-text-offset)]';

  if (type.startsWith('image/')) {
    return <ImageIcon className={iconClassName} />;
  }
  if (type.startsWith('video/')) {
    return <Video className={iconClassName} />;
  }
  if (type.startsWith('audio/')) {
    return <Music className={iconClassName} />;
  }
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) {
    return <Archive className={iconClassName} />;
  }
  return <FileText className={iconClassName} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileTypeLabel = (type: string): string => {
  const parts = type.split('/');
  let label = parts[parts.length - 1].toUpperCase();
  if (label.length > 7 && label.includes('-')) {
    label = label.substring(0, label.indexOf('-'));
  }
  if (label.length > 10) {
    label = `${label.substring(0, 10)}...`;
  }
  return label;
};

const isTextualFile = (file: File): boolean => {
  const textualTypes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
  ];

  const textualExtensions = [
    'txt',
    'md',
    'py',
    'js',
    'ts',
    'jsx',
    'tsx',
    'html',
    'htm',
    'css',
    'scss',
    'sass',
    'json',
    'xml',
    'yaml',
    'yml',
    'csv',
    'sql',
    'sh',
    'bash',
    'php',
    'rb',
    'go',
    'java',
    'c',
    'cpp',
    'h',
    'hpp',
    'cs',
    'rs',
    'swift',
    'kt',
    'scala',
    'r',
    'vue',
    'svelte',
    'astro',
    'config',
    'conf',
    'ini',
    'toml',
    'log',
    'gitignore',
    'dockerfile',
    'makefile',
    'readme',
  ];

  const isTextualMimeType = textualTypes.some((type) =>
    file.type.toLowerCase().startsWith(type),
  );

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const lowerName = file.name.toLowerCase();
  const isTextualExtension =
    textualExtensions.includes(extension) ||
    lowerName.includes('readme') ||
    lowerName.includes('dockerfile') ||
    lowerName.includes('makefile');

  return isTextualMimeType || isTextualExtension;
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve((event.target?.result as string) || '');
    reader.onerror = (event) => reject(event);
    reader.readAsText(file);
  });
};

const getFileExtension = (filename: string): string => {
  const extension = filename.split('.').pop()?.toUpperCase() || 'FILE';
  return extension.length > 8 ? `${extension.substring(0, 8)}...` : extension;
};

const previewCardShellClassName =
  'group relative size-[125px] shrink-0 overflow-hidden rounded-lg border shadow-md';
const previewBadgeClassName =
  'absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md px-2 py-1 text-xs font-medium';
const previewRemoveButtonClassName =
  'absolute right-1.5 top-1.5 size-6 rounded-full border border-black/10 bg-white p-0 text-black opacity-0 shadow-sm transition-opacity hover:bg-white hover:text-black group-hover:opacity-100';

const FilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
  isSiteDark?: boolean;
}> = ({ file, onRemove, isSiteDark = false }) => {
  const isImage = file.type.startsWith('image/');
  const isTextual = isTextualFile(file.file);

  if (isTextual) {
    return <TextualFilePreviewCard file={file} onRemove={onRemove} isSiteDark={isSiteDark} />;
  }

  return (
    <div
      className={cn(
        isSiteDark
          ? 'bg-zinc-700 border-zinc-600'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm',
        previewCardShellClassName,
      )}
    >
      {isImage && file.preview ? (
        <>
          <div className={cn('flex h-full w-full items-center justify-center', isSiteDark ? 'bg-zinc-800' : 'bg-[var(--color-background-offset)]')}>
            <img
              src={file.preview || '/placeholder.svg'}
              alt={file.file.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t',
            isSiteDark ? 'from-[#30302E]/90 to-transparent' : 'from-[var(--color-surface)]/90 to-transparent',
          )}
          />
          <p className={cn(
            previewBadgeClassName,
            isSiteDark
              ? 'text-white bg-zinc-800/95 border border-zinc-700'
              : 'text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)]',
          )}
          >
            IMG
          </p>
        </>
      ) : (
        <div className="flex h-full flex-col p-3">
          <div className="mb-2 flex h-6 items-center">
            {getFileIcon(file.type, isSiteDark)}
            {file.uploadStatus === 'uploading' && (
              <Loader2 className={cn('ml-1.5 h-3.5 w-3.5 animate-spin', isSiteDark ? 'text-blue-400' : 'text-blue-600')} />
            )}
            {file.uploadStatus === 'error' && (
              <AlertCircle className="ml-1.5 h-3.5 w-3.5 text-red-400" />
            )}
          </div>
          <p
            className={cn('line-clamp-2 min-h-[2.2rem] text-xs font-semibold leading-snug', isSiteDark ? 'text-zinc-100' : 'text-[var(--color-text)]')}
            title={file.file.name}
          >
            {file.file.name}
          </p>
          <p className={cn('mt-1 text-[10px]', isSiteDark ? 'text-zinc-500' : 'text-[var(--color-text-offset)]')}>
            {formatFileSize(file.file.size)}
          </p>
          <p className={cn(
            previewBadgeClassName,
            isSiteDark
              ? 'text-white bg-zinc-800 border border-zinc-700'
              : 'text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)]',
          )}
          >
            {getFileTypeLabel(file.type)}
          </p>
        </div>
      )}
      <Button
        size="icon"
        variant="outline"
        className={previewRemoveButtonClassName}
        onClick={() => onRemove(file.id)}
        title="Remove file"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

const PastedContentCard: React.FC<{
  content: PastedContent;
  onRemove: (id: string) => void;
  isSiteDark?: boolean;
}> = ({ content, onRemove, isSiteDark = false }) => {
  const previewText = content.content.slice(0, 150);
  const needsTruncation = content.content.length > 150;

  return (
    <div className={cn(
      isSiteDark
        ? 'bg-zinc-700 border-zinc-600'
        : 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm',
      previewCardShellClassName,
    )}>
      <div className={cn('h-full overflow-y-auto p-3 text-[8px] whitespace-pre-wrap break-words custom-scrollbar', isSiteDark ? 'text-zinc-300' : 'text-[var(--color-text-offset)]')}>
        {previewText}
        {needsTruncation && '...'}
      </div>
      <div className={cn(
        'group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b from-transparent overflow-hidden',
        isSiteDark ? 'to-[#30302E]' : 'to-[var(--color-surface)]',
      )}>
        <p className={cn(
          previewBadgeClassName,
          isSiteDark
            ? 'text-white bg-zinc-800 border border-zinc-700'
            : 'text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)]',
        )}>
          PASTED
        </p>
        <div className="absolute top-2 right-2">
          <Button
            size="icon"
            variant="outline"
            className={previewRemoveButtonClassName}
            onClick={() => onRemove(content.id)}
            title="Remove content"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const OPENAI_EFFORTS_BY_MODEL: Record<string, string[]> = {
  '5.6-sol': ['Light', 'Medium', 'High', 'Extra High', 'Ultra'],
  '5.6-terra': ['Light', 'Medium', 'High', 'Extra High', 'Ultra'],
  '5.6-luna': ['Light', 'Medium', 'High', 'Extra High', 'Ultra'],
  '5.5': ['Instant', 'Medium', 'High', 'Extra High', 'Pro'],
  '5.4': ['Instant', 'Medium', 'High'],
  '5.4-mini': ['Instant', 'Medium'],
  '5.3-codex-spark': ['Instant'],
};

const ModelSelectorDropdown: React.FC<{
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onSelectionChange?: (selection: ChatModelSelection) => void;
  variant?: 'anthropic' | 'openai' | 'wise';
  siteTheme?: 'dark' | 'light';
  onOpenChange?: (isOpen: boolean) => void;
  onInteractionChange?: (isInteracting: boolean) => void;
}> = ({
  models,
  selectedModel,
  onModelChange,
  variant = 'anthropic',
  siteTheme = 'dark',
  onOpenChange,
  onInteractionChange,
  onSelectionChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'above' | 'below'>('above');
  const [anthropicPanel, setAnthropicPanel] = useState<'effort' | null>(null);
  const [anthropicEffort, setAnthropicEffort] = useState<'Low' | 'Medium' | 'High' | 'Max'>('Low');
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [openAIEffort, setOpenAIEffort] = useState(
    () => OPENAI_EFFORTS_BY_MODEL[selectedModel]?.[0] || 'Light',
  );
  const [isOpenAIAdvancedOpen, setIsOpenAIAdvancedOpen] = useState(false);
  const [openAIAdvancedPanel, setOpenAIAdvancedPanel] = useState<'model' | 'effort' | 'speed' | null>(null);
  const [openAISpeed, setOpenAISpeed] = useState<'Standard' | 'Fast'>('Standard');
  const isOpenAI = variant === 'openai';
  const isWise = variant === 'wise';
  const isSiteDark = siteTheme === 'dark';
  const selectedModelData =
    models.find((model) => model.id === selectedModel) || models[0];
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const setDropdownOpen = useCallback(
    (nextIsOpen: boolean) => {
      setIsOpen(nextIsOpen);
      onOpenChange?.(nextIsOpen);
      onInteractionChange?.(nextIsOpen);
      if (!nextIsOpen) {
        setMenuStyle(null);
        setAnthropicPanel(null);
        setIsOpenAIAdvancedOpen(false);
        setOpenAIAdvancedPanel(null);
      }
    },
    [onInteractionChange, onOpenChange],
  );

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const boundaryRect = button
      .closest('[data-chat-input-root]')
      ?.getBoundingClientRect();
    const boundaryLeft = Math.max(8, Math.round(boundaryRect?.left ?? 8));
    const boundaryRight = Math.min(
      viewportWidth - 8,
      Math.round(boundaryRect?.right ?? viewportWidth - 8),
    );
    const boundaryWidth = Math.max(160, boundaryRight - boundaryLeft);

    const mainMenuWidth = isOpenAI ? 300 : 318;
    const mainWidth = Math.min(mainMenuWidth, boundaryWidth);
    const hasSidePanel =
      (isOpenAI && openAIAdvancedPanel !== null) ||
      (!isOpenAI && anthropicPanel !== null);
    const panelGap = hasSidePanel ? 8 : 0;
    const desiredSideWidth = isOpenAI ? 186 : 320;
    const maxSideWidth = Math.max(0, viewportWidth - 16 - mainWidth - panelGap);
    const canPlaceSidePanel = maxSideWidth >= 180;
    const sideWidth = hasSidePanel
      ? canPlaceSidePanel
        ? Math.min(desiredSideWidth, maxSideWidth)
        : mainWidth
      : 0;
    const menuWidth = hasSidePanel && !canPlaceSidePanel
      ? mainWidth
      : mainWidth + panelGap + sideWidth;
    const desiredLeft = rect.right - mainWidth;
    const left = Math.min(
      Math.max(8, desiredLeft),
      viewportWidth - menuWidth - 8,
    );
    const menuGap = 8;
    const showAbove = rect.top > viewportHeight - rect.bottom;
    const maxHeight =
      Math.max(
        132,
        Math.floor(showAbove
          ? rect.top - menuGap - 8
          : viewportHeight - rect.bottom - menuGap - 8,
        ),
      );
    setMenuPlacement(showAbove ? 'above' : 'below');

    setMenuStyle({
      left: `${Math.round(left)}px`,
      top: showAbove
        ? `${Math.round(rect.top - menuGap)}px`
        : `${Math.round(rect.bottom + menuGap)}px`,
      width: `${menuWidth}px`,
      maxHeight: `${Math.min(maxHeight, 280)}px`,
      transform: showAbove ? 'translateY(-100%)' : undefined,
      transformOrigin: showAbove ? 'bottom right' : 'top right',
    });
  }, [anthropicPanel, isOpenAI, openAIAdvancedPanel]);

  const checkColorClassName = isOpenAI
    ? isSiteDark
      ? 'text-white'
      : 'text-[#0d0d0d]'
    : isSiteDark
      ? 'text-[#4d9cff]'
      : 'text-[#2563eb]';

  const selectedLabel = isOpenAI
    ? `${selectedModelData.name} ${openAIEffort}`
    : `${selectedModelData.name} ${anthropicEffort}`;
  const menuWidthValue =
    Number.parseInt(String(menuStyle?.width || ''), 10) || (isOpenAI ? 300 : 318);
  const hasSidePanel =
    (isOpenAI && openAIAdvancedPanel !== null) ||
    (!isOpenAI && anthropicPanel !== null);
  const mainPanelWidth = isOpenAI
    ? Math.min(300, menuWidthValue)
    : Math.min(318, menuWidthValue);
  const isPanelReplacement = hasSidePanel && menuWidthValue <= mainPanelWidth;
  const sidePanelWidth = hasSidePanel
    ? isPanelReplacement
      ? mainPanelWidth
      : Math.max(0, menuWidthValue - mainPanelWidth - 8)
    : 0;
  const openAIEfforts =
    OPENAI_EFFORTS_BY_MODEL[selectedModel] || OPENAI_EFFORTS_BY_MODEL['5.6-sol'];
  const openAIDefaultEffort = openAIEfforts[0] || 'Light';
  const openAIEffortIndex = Math.max(0, openAIEfforts.indexOf(openAIEffort));
  const openAIEffortProgress = openAIEfforts.length > 1
    ? openAIEffortIndex / (openAIEfforts.length - 1)
    : 0.5;
  const isPremiumOpenAIEffort = openAIEffort === 'Ultra';

  useEffect(() => {
    if (!selectedModelData) return;

    onSelectionChange?.({
      interfaceTheme: variant,
      modelId: selectedModelData.id,
      modelName: selectedModelData.name,
      effort: isOpenAI ? openAIEffort : anthropicEffort,
    });
  }, [
    anthropicEffort,
    isOpenAI,
    onSelectionChange,
    openAIEffort,
    selectedModelData,
    variant,
  ]);

  useEffect(() => {
    if (!isOpenAI || openAIEfforts.includes(openAIEffort)) return;
    setOpenAIEffort(openAIDefaultEffort);
  }, [isOpenAI, openAIDefaultEffort, openAIEffort, openAIEfforts]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleEscape(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setDropdownOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
        <Button
            ref={buttonRef}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 px-3 text-sm font-semibold',
              isOpenAI
                ? isSiteDark
                  ? 'rounded-full border-0 bg-[#30302f] text-[#f4f4f4] hover:bg-[#3b3b39] hover:text-white'
                  : 'rounded-full border-0 bg-[#f1f1f1] text-[#0d0d0d] hover:bg-[#e9e9e9]'
                : isSiteDark
                  ? 'h-8 rounded-lg border-0 bg-[#30302E] text-[#f3eee5] hover:bg-[#3a3936] hover:text-white'
                  : 'h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-offset)] text-[var(--color-text)] hover:bg-[var(--color-surface)]',
            )}
        aria-label={`Current intelligence setting: ${selectedLabel}`}
        title={selectedLabel}
        aria-expanded={isOpen}
        onClick={() => setDropdownOpen(!isOpen)}
      >
        {isOpenAI ? (
          <span className="flex min-w-0 max-w-[150px] items-center gap-1.5 truncate sm:max-w-[200px]">
            <span className="shrink-0">{selectedModelData.name}</span>
            <span className={cn(
              'min-w-0 truncate',
              openAIEffort === 'Ultra'
                ? 'text-[#a66cff]'
                : isSiteDark ? 'text-white/[0.62]' : 'text-black/[0.58]',
            )}>
              {openAIEffort}
            </span>
          </span>
        ) : (
          <span className="truncate max-w-[150px] sm:max-w-[200px]">
            {selectedLabel}
          </span>
        )}
        <ChevronDown
          className={cn(
            'ml-1 h-4 w-4 shrink-0 opacity-70 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </Button>
      {isOpen && menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className={cn(
              'fixed z-[220] flex gap-2',
              menuPlacement === 'above' ? 'items-end' : 'items-start',
              isOpenAI ? 'font-openai' : isWise ? 'font-wise' : 'font-anthropic',
            )}
          >
            <div
              className={cn(
                'max-h-full overflow-y-auto rounded-2xl border p-1.5 shadow-[0_18px_48px_rgb(0_0_0_/_45%)]',
                isPanelReplacement && 'hidden',
                isOpenAI
                  ? isSiteDark
                    ? 'border-white/[0.12] bg-[#3a3a3a] text-white shadow-black/40'
                    : 'border-[#d9d9e3] bg-white text-[#0d0d0d] shadow-[0_8px_22px_rgb(0_0_0_/_16%)]'
                  : isSiteDark
                    ? 'border-white/[0.12] bg-[#30302E] text-[#f2f0ea] shadow-black/40'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_8px_22px_rgb(31_25_16_/_14%)]',
              )}
              style={{ width: mainPanelWidth }}
              role="listbox"
            >
              {isOpenAI ? (
                <>
                  {!isOpenAIAdvancedOpen ? (
                    <>
                  <div className="px-3 pb-2 pt-3">
                    <div
                      className={cn(
                        'relative grid h-9 items-center rounded-full px-1',
                        isSiteDark ? 'bg-white/[0.12]' : 'bg-black/[0.10]',
                      )}
                      style={{ gridTemplateColumns: `repeat(${openAIEfforts.length}, minmax(0, 1fr))` }}
                    >
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, openAIEfforts.length - 1)}
                        step={1}
                        value={openAIEffortIndex}
                        aria-label="Response effort"
                        aria-valuetext={openAIEffort}
                        className="peer absolute inset-0 z-30 h-full w-full touch-none cursor-grab appearance-none opacity-0 active:cursor-grabbing"
                        onChange={(event) => {
                          const nextEffort = openAIEfforts[Number(event.currentTarget.value)];
                          if (nextEffort) setOpenAIEffort(nextEffort);
                        }}
                      />
                      <div
                        className={cn(
                          'pointer-events-none absolute left-1 top-1 h-7 rounded-full transition-[width,background,opacity] duration-200 ease-out',
                        )}
                        style={{
                          width: openAIEffortIndex === 0
                            ? '0px'
                            : openAIEfforts.length > 1
                              ? `calc(${openAIEffortProgress * 100}% + ${14 - openAIEffortProgress * 36}px)`
                              : 'calc(100% - 8px)',
                          opacity: openAIEffortIndex === 0 ? 0 : 1,
                          background: isPremiumOpenAIEffort
                            ? 'linear-gradient(90deg, #72a7ff 0%, #8b7dff 42%, #b45cff 100%)'
                            : '#0a84ff',
                        }}
                      />
                      <div
                        className="pointer-events-none absolute top-1 z-20 h-7 w-7 rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0_/_28%)] transition-[left,transform] duration-150 ease-out peer-active:scale-[1.14] peer-focus-visible:scale-[1.08]"
                        style={{
                          left: openAIEfforts.length > 1
                            ? `calc(${openAIEffortProgress * 100}% + ${4 - openAIEffortProgress * 36}px)`
                            : 'calc(50% - 14px)',
                        }}
                      />
                      {openAIEfforts.map((effort, index) => (
                        <span
                          key={effort}
                          title={effort}
                          aria-hidden="true"
                          className="relative z-10 flex h-7 items-center justify-center"
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full transition-colors',
                              index <= openAIEffortIndex
                                ? 'bg-white/45'
                                : isSiteDark ? 'bg-white/30' : 'bg-black/30',
                            )}
                          />
                        </span>
                      ))}
                    </div>
                    <div className={cn(
                      'mt-2 text-center text-xs font-medium',
                      isPremiumOpenAIEffort
                        ? 'text-[#9b64ff]'
                        : isSiteDark ? 'text-white/60' : 'text-black/55',
                    )}>
                      {openAIEffort}
                    </div>
                  </div>
                  <div className={cn('mx-3 my-2 border-t', isSiteDark ? 'border-white/[0.12]' : 'border-black/10')} />
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-base font-semibold transition-colors',
                      isSiteDark ? 'hover:bg-white/[0.08]' : 'hover:bg-[#f4f4f4]',
                    )}
                    onClick={() => setIsOpenAIAdvancedOpen(true)}
                    aria-expanded={false}
                  >
                    <span className={cn(isSiteDark ? 'text-white/70' : 'text-black/65')}>Advanced</span>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </button>
                    </>
                  ) : (
                    <>
                      {([
                        ['model', 'Model', selectedModelData.name],
                        ['effort', 'Effort', openAIEffort],
                        ['speed', 'Speed', openAISpeed],
                      ] as const).map(([panel, label, value]) => (
                        <button
                          key={panel}
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors',
                            openAIAdvancedPanel === panel
                              ? isSiteDark ? 'bg-white/[0.10]' : 'bg-[#ececec]'
                              : isSiteDark ? 'hover:bg-white/[0.08]' : 'hover:bg-[#f4f4f4]',
                          )}
                          onClick={() => setOpenAIAdvancedPanel((current) => current === panel ? null : panel)}
                          aria-expanded={openAIAdvancedPanel === panel}
                        >
                          <span>{label}</span>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={cn(
                              'max-w-[150px] truncate font-medium',
                              panel === 'effort' && openAIEffort === 'Ultra'
                                ? 'text-[#a66cff]'
                                : isSiteDark ? 'text-white/50' : 'text-black/45',
                            )}>
                              {value}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 opacity-55" />
                          </span>
                        </button>
                      ))}
                      <div className={cn('mx-3 my-1.5 border-t', isSiteDark ? 'border-white/[0.12]' : 'border-black/10')} />
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors',
                          isSiteDark ? 'text-white/55 hover:bg-white/[0.08]' : 'text-black/50 hover:bg-[#f4f4f4]',
                        )}
                        onClick={() => {
                          setIsOpenAIAdvancedOpen(false);
                          setOpenAIAdvancedPanel(null);
                        }}
                        aria-expanded={true}
                      >
                        <span>Advanced</span>
                        <ChevronDown className="h-4 w-4 rotate-180 opacity-70" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {models.map((model) => {
                    const isSelected = model.id === selectedModel;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        className={cn(
                          'flex w-full items-start justify-between rounded-xl px-3 py-2 text-left transition-colors',
                          isSiteDark ? 'hover:bg-white/[0.06]' : 'hover:bg-[var(--color-background-offset)]',
                        )}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onModelChange(model.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium leading-tight">
                            <span className="truncate">{model.name}</span>
                            {model.badge && (
                              <span className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                                isSiteDark ? 'bg-white/[0.07] text-white/[0.45]' : 'bg-black/[0.05] text-[var(--color-text-offset)]',
                              )}
                              >
                                {model.badge}
                              </span>
                            )}
                          </span>
                          <span className={cn(
                            'mt-0.5 block text-xs leading-snug',
                            isSiteDark ? 'text-white/[0.44]' : 'text-[var(--color-text-offset)]',
                          )}
                          >
                            {model.description}
                          </span>
                        </span>
                        <span className="ml-3 flex h-5 shrink-0 items-center">
                          {isSelected && (
                            <Check className={cn('h-4 w-4', checkColorClassName)} />
                          )}
                        </span>
                      </button>
                    );
                  })}
                  <div className={cn('mx-3 my-1 border-t', isSiteDark ? 'border-white/[0.12]' : 'border-black/10')} />
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                      anthropicPanel === 'effort'
                        ? isSiteDark ? 'bg-white/[0.07]' : 'bg-[var(--color-background-offset)]'
                        : isSiteDark ? 'hover:bg-white/[0.06]' : 'hover:bg-[var(--color-background-offset)]',
                    )}
                    onClick={() => setAnthropicPanel((panel) => panel === 'effort' ? null : 'effort')}
                    aria-expanded={anthropicPanel === 'effort'}
                  >
                    <span>Effort</span>
                    <span className={cn('flex items-center gap-2', isSiteDark ? 'text-white/50' : 'text-[var(--color-text-offset)]')}>
                      {anthropicEffort}
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </span>
                  </button>
                </>
              )}
            </div>
            {isOpenAI && openAIAdvancedPanel !== null && (
              <div
                className={cn(
                  'max-h-full overflow-y-auto rounded-2xl border p-2 shadow-[0_18px_48px_rgb(0_0_0_/_42%)]',
                  isSiteDark
                    ? 'border-white/[0.12] bg-[#3a3a3a] text-white'
                    : 'border-[#d9d9e3] bg-white text-[#0d0d0d]',
                )}
                style={{ width: sidePanelWidth }}
              >
                <div className={cn('px-3 pb-1 pt-1 text-sm font-medium', isSiteDark ? 'text-white/50' : 'text-black/45')}>
                  {openAIAdvancedPanel === 'model' ? 'Model' : openAIAdvancedPanel === 'effort' ? 'Effort' : 'Speed'}
                </div>
                {openAIAdvancedPanel === 'model' && models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors',
                        isSiteDark ? 'hover:bg-white/[0.08]' : 'hover:bg-[#f4f4f4]',
                      )}
                      role="option"
                      aria-selected={model.id === selectedModel}
                      onClick={() => {
                        const nextEfforts =
                          OPENAI_EFFORTS_BY_MODEL[model.id] || OPENAI_EFFORTS_BY_MODEL['5.6-sol'];
                        setOpenAIEffort(nextEfforts[0] || 'Light');
                        onModelChange(model.id);
                        setOpenAIAdvancedPanel(null);
                      }}
                    >
                      <span className="min-w-0 truncate">{model.name}</span>
                      {model.id === selectedModel && (
                        <Check className={cn('h-4 w-4 shrink-0', checkColorClassName)} />
                      )}
                    </button>
                ))}
                {openAIAdvancedPanel === 'effort' && openAIEfforts.map((effort) => (
                  <button
                    key={effort}
                    type="button"
                    className={cn(
                      'flex w-full items-start justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors',
                      isSiteDark ? 'hover:bg-white/[0.08]' : 'hover:bg-[#f4f4f4]',
                    )}
                    role="option"
                    aria-selected={effort === openAIEffort}
                    onClick={() => {
                      setOpenAIEffort(effort);
                      setOpenAIAdvancedPanel(null);
                    }}
                  >
                    <span>
                      <span className={cn('block', effort === 'Ultra' && 'text-[#a66cff]')}>{effort}</span>
                      {effort === 'Ultra' && (
                        <span className={cn('mt-0.5 block text-xs font-medium', isSiteDark ? 'text-white/45' : 'text-black/45')}>
                          Consumes usage limits faster
                        </span>
                      )}
                    </span>
                    {effort === openAIEffort && (
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', checkColorClassName)} />
                    )}
                  </button>
                ))}
                {openAIAdvancedPanel === 'speed' && (['Standard', 'Fast'] as const).map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    className={cn(
                      'flex w-full items-start justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors',
                      isSiteDark ? 'hover:bg-white/[0.08]' : 'hover:bg-[#f4f4f4]',
                    )}
                    role="option"
                    aria-selected={speed === openAISpeed}
                    onClick={() => {
                      setOpenAISpeed(speed);
                      setOpenAIAdvancedPanel(null);
                    }}
                  >
                    <span>
                      <span className="block">{speed}</span>
                      <span className={cn('mt-0.5 block text-xs font-medium', isSiteDark ? 'text-white/45' : 'text-black/45')}>
                        {speed === 'Standard' ? 'Default speed' : '1.5x speed, more usage'}
                      </span>
                    </span>
                    {speed === openAISpeed && (
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', checkColorClassName)} />
                    )}
                  </button>
                ))}
              </div>
            )}
            {!isOpenAI && anthropicPanel === 'effort' && (
              <div
                className={cn(
                  'max-h-full overflow-y-auto rounded-2xl border p-3 shadow-[0_18px_48px_rgb(0_0_0_/_42%)]',
                  isSiteDark
                    ? 'border-white/[0.12] bg-[#30302E] text-[#f2f0ea]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
                )}
                style={{ width: sidePanelWidth }}
              >
                <p className={cn('px-1 pb-2 text-sm leading-snug', isSiteDark ? 'text-white/[0.48]' : 'text-[var(--color-text-offset)]')}>
                  Higher effort means more thorough responses, but takes longer and uses your limits faster.
                </p>
                {(['Low', 'Medium', 'High', 'Max'] as const).map((effort) => (
                  <button
                    key={effort}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-medium transition-colors',
                      isSiteDark ? 'hover:bg-white/[0.06]' : 'hover:bg-[var(--color-background-offset)]',
                    )}
                    onClick={() => setAnthropicEffort(effort)}
                  >
                    <span className="flex items-center gap-2">
                      {effort}
                      {effort === 'Low' && (
                        <span className={cn(
                          'rounded px-1.5 py-0.5 text-[10px]',
                          isSiteDark ? 'bg-white/[0.07] text-white/[0.55]' : 'bg-black/[0.05] text-[var(--color-text-offset)]',
                        )}
                        >
                          Default
                        </span>
                      )}
                      {effort === 'Max' && (
                        <span className={cn('text-[11px]', isSiteDark ? 'text-white/40' : 'text-[var(--color-text-offset)]')}>
                          (i)
                        </span>
                      )}
                    </span>
                    {anthropicEffort === effort && (
                      <Check className={cn('h-4 w-4', checkColorClassName)} />
                    )}
                  </button>
                ))}
                <div className={cn('mx-2 my-2 border-t', isSiteDark ? 'border-white/[0.12]' : 'border-black/10')} />
                <button
                  type="button"
                  role="switch"
                  aria-checked={isThinkingEnabled}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition-colors',
                    isSiteDark ? 'hover:bg-white/[0.06]' : 'hover:bg-[var(--color-background-offset)]',
                  )}
                  onClick={() => setIsThinkingEnabled((value) => !value)}
                >
                  <span>
                    <span className="block text-sm font-medium leading-tight">Thinking</span>
                    <span className={cn('mt-0.5 block text-xs leading-snug', isSiteDark ? 'text-white/[0.44]' : 'text-[var(--color-text-offset)]')}>
                      Can think for more complex tasks
                    </span>
                  </span>
                  <span
                    className={cn(
                      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                      isThinkingEnabled ? 'bg-[#4d9cff]' : isSiteDark ? 'bg-white/[0.18]' : 'bg-black/[0.15]',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                        isThinkingEnabled ? 'translate-x-[18px]' : 'translate-x-0.5',
                      )}
                    />
                  </span>
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};

const TextualFilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
  isSiteDark?: boolean;
}> = ({ file, onRemove, isSiteDark = false }) => {
  const previewText = file.textContent?.slice(0, 150) || '';
  const needsTruncation = (file.textContent?.length || 0) > 150;
  const fileExtension = getFileExtension(file.file.name);

  return (
    <div className={cn(
      isSiteDark
        ? 'bg-zinc-700 border-zinc-600'
        : 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm',
      previewCardShellClassName,
    )}>
      <div className={cn('h-full overflow-y-auto p-3 text-[8px] whitespace-pre-wrap break-words custom-scrollbar', isSiteDark ? 'text-zinc-300' : 'text-[var(--color-text-offset)]')}>
        {file.textContent ? (
          <>
            {previewText}
            {needsTruncation && '...'}
          </>
        ) : (
          <div className={cn('flex items-center justify-center h-full', isSiteDark ? 'text-zinc-400' : 'text-[var(--color-text-offset)]')}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      <div className={cn(
        'group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b from-transparent overflow-hidden',
        isSiteDark ? 'to-[#30302E]' : 'to-[var(--color-surface)]',
      )}>
        <p className={cn(
          previewBadgeClassName,
          isSiteDark
            ? 'text-white bg-zinc-800 border border-zinc-700'
            : 'text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)]',
        )}
        >
          {fileExtension}
        </p>
        {file.uploadStatus === 'uploading' && (
          <div className="absolute top-2 left-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
          </div>
        )}
        {file.uploadStatus === 'error' && (
          <div className="absolute top-2 left-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Button
            size="icon"
            variant="outline"
            className={previewRemoveButtonClassName}
            onClick={() => onRemove(file.id)}
            title="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ClaudeChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'How can I help you today?',
  maxFiles = MAX_FILES,
  maxFileSize = MAX_FILE_SIZE,
  acceptedFileTypes,
  models = DEFAULT_MODELS_INTERNAL,
  defaultModel,
  onModelChange,
  onSelectionChange,
  variant = 'anthropic',
  onVariantChange,
  siteTheme = 'dark',
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMenuStyle, setAddMenuStyle] = useState<React.CSSProperties | null>(null);
  const [selectedModel, setSelectedModel] = useState(
    defaultModel || models[0]?.id || '',
  );
  const selectedModelData =
    models.find((model) => model.id === selectedModel) || models[0];
  const [currentSelection, setCurrentSelection] = useState<ChatModelSelection>({
    interfaceTheme: variant,
    modelId: selectedModelData?.id || '',
    modelName: selectedModelData?.name || '',
    effort: variant === 'openai' ? 'Light' : 'Low',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextModel =
      defaultModel && models.some((model) => model.id === defaultModel)
        ? defaultModel
        : models[0]?.id || '';

    setSelectedModel(nextModel);
  }, [defaultModel, models]);

  useEffect(() => {
    const nextModelData =
      models.find((model) => model.id === selectedModel) || models[0];
    if (!nextModelData) return;

    setCurrentSelection((selection) => ({
      ...selection,
      interfaceTheme: variant,
      modelId: nextModelData.id,
      modelName: nextModelData.name,
    }));
  }, [models, selectedModel, variant]);

  const handleSelectionChange = useCallback(
    (selection: ChatModelSelection) => {
      setCurrentSelection(selection);
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  const updateAddMenuPosition = useCallback(() => {
    const button = addButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const desiredWidth = 272;
    const menuWidth = Math.min(desiredWidth, viewportWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      viewportWidth - menuWidth - 8,
    );
    const menuGap = 8;
    const showAbove = rect.top > viewportHeight - rect.bottom;
    const maxHeight = Math.max(
      132,
      Math.floor(showAbove
        ? rect.top - menuGap - 8
        : viewportHeight - rect.bottom - menuGap - 8),
    );

    setAddMenuStyle({
      left: `${Math.round(left)}px`,
      top: showAbove
        ? `${Math.round(rect.top - menuGap)}px`
        : `${Math.round(rect.bottom + menuGap)}px`,
      width: `${menuWidth}px`,
      maxHeight: `${Math.min(maxHeight, 280)}px`,
      transform: showAbove ? 'translateY(-100%)' : undefined,
      transformOrigin: showAbove ? 'bottom left' : 'top left',
    });
  }, []);

  useLayoutEffect(() => {
    if (!isAddMenuOpen) {
      setAddMenuStyle(null);
      return;
    }

    updateAddMenuPosition();
    window.addEventListener('scroll', updateAddMenuPosition, true);
    window.addEventListener('resize', updateAddMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateAddMenuPosition, true);
      window.removeEventListener('resize', updateAddMenuPosition);
    };
  }, [isAddMenuOpen, updateAddMenuPosition]);

  useEffect(() => {
    if (!isAddMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !addMenuRef.current?.contains(target) &&
        !addButtonRef.current?.contains(target)
      ) {
        setIsAddMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddMenuOpen]);

  const adjustTextareaHeight = useCallback((textarea = textareaRef.current) => {
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight =
      Number.parseInt(getComputedStyle(textarea).maxHeight, 10) || 160;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight, message]);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const currentFileCount = files.length;
      if (currentFileCount >= maxFiles) {
        alert(
          `Maximum ${maxFiles} files allowed. Please remove some files to add new ones.`,
        );
        return;
      }

      const availableSlots = maxFiles - currentFileCount;
      const filesToAdd = Array.from(selectedFiles).slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        alert(
          `You can only add ${availableSlots} more file(s). ${
            selectedFiles.length - availableSlots
          } file(s) were not added.`,
        );
      }

      const newFiles = filesToAdd
        .filter((file) => {
          if (file.size > maxFileSize) {
            alert(
              `File ${file.name} (${formatFileSize(
                file.size,
              )}) exceeds size limit of ${formatFileSize(maxFileSize)}.`,
            );
            return false;
          }
          if (
            acceptedFileTypes &&
            !acceptedFileTypes.some(
              (type) =>
                file.type.includes(type) || type === file.name.split('.').pop(),
            )
          ) {
            alert(
              `File type for ${
                file.name
              } not supported. Accepted types: ${acceptedFileTypes.join(', ')}`,
            );
            return false;
          }
          return true;
        })
        .map((file) => ({
          id: createId(),
          file,
          preview: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : undefined,
          type: file.type || 'application/octet-stream',
          uploadStatus: 'pending' as const,
          uploadProgress: 0,
        }));

      setFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((fileToUpload) => {
        if (isTextualFile(fileToUpload.file)) {
          readFileAsText(fileToUpload.file)
            .then((textContent) => {
              setFiles((prev) =>
                prev.map((file) =>
                  file.id === fileToUpload.id ? { ...file, textContent } : file,
                ),
              );
            })
            .catch((error) => {
              console.error('Error reading file content:', error);
              setFiles((prev) =>
                prev.map((file) =>
                  file.id === fileToUpload.id
                    ? { ...file, textContent: 'Error reading file content' }
                    : file,
                ),
              );
            });
        }

        setFiles((prev) =>
          prev.map((file) =>
            file.id === fileToUpload.id
              ? { ...file, uploadStatus: 'uploading' }
              : file,
          ),
        );

        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20 + 5;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setFiles((prev) =>
              prev.map((file) =>
                file.id === fileToUpload.id
                  ? { ...file, uploadStatus: 'complete', uploadProgress: 100 }
                  : file,
              ),
            );
          } else {
            setFiles((prev) =>
              prev.map((file) =>
                file.id === fileToUpload.id
                  ? { ...file, uploadProgress: progress }
                  : file,
              ),
            );
          }
        }, 150);
      });
    },
    [files.length, maxFiles, maxFileSize, acceptedFileTypes],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((file) => file.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboardData = event.clipboardData;
      const items = clipboardData.items;

      const fileItems = Array.from(items).filter(
        (item) => item.kind === 'file',
      );
      if (fileItems.length > 0 && files.length < maxFiles) {
        event.preventDefault();
        const pastedFiles = fileItems
          .map((item) => item.getAsFile())
          .filter(Boolean) as File[];
        const dataTransfer = new DataTransfer();
        pastedFiles.forEach((file) => dataTransfer.items.add(file));
        handleFileSelect(dataTransfer.files);
        return;
      }

      const textData = clipboardData.getData('text');
      if (
        textData &&
        textData.length > PASTE_THRESHOLD &&
        pastedContent.length < 5
      ) {
        event.preventDefault();
        setMessage(`${message}${textData.slice(0, PASTE_THRESHOLD)}...`);

        const pastedItem: PastedContent = {
          id: createId(),
          content: textData,
          timestamp: new Date(),
          wordCount: textData.split(/\s+/).filter(Boolean).length,
        };

        setPastedContent((prev) => [...prev, pastedItem]);
      }
    },
    [handleFileSelect, files.length, maxFiles, pastedContent.length, message],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      if (event.dataTransfer.files) {
        handleFileSelect(event.dataTransfer.files);
      }
    },
    [handleFileSelect],
  );

  const handleSend = useCallback(() => {
    if (
      disabled ||
      (!message.trim() && files.length === 0 && pastedContent.length === 0)
    ) {
      return;
    }

    if (files.some((file) => file.uploadStatus === 'uploading')) {
      alert('Please wait for all files to finish uploading.');
      return;
    }

    onSendMessage?.(message, files, pastedContent, currentSelection);

    setMessage('');
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [message, files, pastedContent, currentSelection, disabled, onSendMessage]);

  const handleModelChangeInternal = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId);
      onModelChange?.(modelId);
    },
    [onModelChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleMessageChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(event.target.value);
      adjustTextareaHeight(event.target);
    },
    [adjustTextareaHeight],
  );

  const handleComposerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      const target = event.target as HTMLElement;
      if (target.closest('button, input, textarea, [role="button"]')) return;

      textareaRef.current?.focus();
    },
    [disabled],
  );

  const hasContent =
    message.trim() || files.length > 0 || pastedContent.length > 0;
  const canSend =
    hasContent &&
    !disabled &&
    !files.some((file) => file.uploadStatus === 'uploading');
  const isOpenAI = variant === 'openai';
  const isSiteDark = siteTheme === 'dark';

  return (
    <div
      data-chat-input-root
      className="relative mx-auto w-full max-w-2xl min-w-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
      <div
        className={cn(
          'absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed pointer-events-none',
          isOpenAI
            ? isSiteDark
              ? 'border-[#4d9cff] bg-[#111111] text-[#8ec2ff]'
              : 'border-[#d9d9e3] bg-white text-[#0d0d0d]'
            : isSiteDark
              ? 'border-blue-500 bg-[#1C3F62] text-blue-500'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
        )}
      >
          <p className="text-sm flex items-center gap-2">
            <ImageIcon className="size-4 opacity-50" />
            Drop files here to add to chat
          </p>
        </div>
      )}

      <div
        onClick={handleComposerClick}
        className={cn(
          'flex min-h-[104px] cursor-text flex-col items-end gap-2 overflow-x-hidden overflow-y-visible rounded-[28px] border p-2 shadow-lg [contain:inline-size]',
          isOpenAI
            ? isSiteDark
              ? 'border-white/10 bg-[#181818] shadow-black/30'
              : 'border-[#d9d9e3] bg-white shadow-[0_2px_10px_rgb(0_0_0_/_8%)]'
            : isSiteDark
              ? 'border-zinc-700 bg-[#30302E]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]',
        )}
      >
        {(files.length > 0 || pastedContent.length > 0) && (
          <div
            className={cn(
              'overflow-x-auto border-b-[1px] p-3 w-full hide-scroll-bar',
              isOpenAI
                ? isSiteDark
                  ? 'border-white/10 bg-[#111111]'
                  : 'border-[#ececf1] bg-[#f7f7f8]'
                : isSiteDark
                  ? 'border-zinc-700 bg-[#262624]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]',
            )}
          >
            <div className="flex gap-3">
              {pastedContent.map((content) => (
                <PastedContentCard
                  key={content.id}
                  content={content}
                  isSiteDark={isSiteDark}
                  onRemove={(id) =>
                    setPastedContent((prev) => prev.filter((item) => item.id !== id))
                  }
                />
              ))}
              {files.map((file) => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={removeFile}
                  isSiteDark={isSiteDark}
                />
              ))}
            </div>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleMessageChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'min-h-[44px] w-full max-h-[160px] resize-none border-none bg-transparent px-3 py-2 text-base leading-[26px] shadow-none outline-none focus:border-none focus:outline-none focus-visible:ring-0 focus-within:border-none focus-within:outline-none focus-within:ring-0 focus-within:ring-offset-0 custom-scrollbar',
            isOpenAI
              ? isSiteDark
                ? 'text-[#f4f4f4] placeholder:text-[#8e8e8e]'
                : 'text-[#0d0d0d] placeholder:text-[#8e8ea0]'
              : isSiteDark
                ? 'text-zinc-100 placeholder:text-zinc-500'
                : 'text-[var(--color-text)] placeholder:text-[var(--color-text-offset)]',
          )}
          rows={1}
        />
        <div className="flex w-full items-center justify-between gap-2 px-1 pb-0.5">
          <div className="flex items-center gap-2">
            <div
              className="relative"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                ref={addButtonRef}
                size="icon"
                variant="ghost"
                className={cn(
                  'h-9 w-9 p-0 flex-shrink-0',
                  isOpenAI
                    ? isSiteDark
                      ? 'text-[#f4f4f4] hover:bg-white/10 hover:text-white'
                      : 'text-[#5f5f66] hover:bg-[#f7f7f8] hover:text-[#0d0d0d]'
                    : isSiteDark
                      ? 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'text-[var(--color-text-offset)] hover:bg-[var(--color-background-offset)]',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsAddMenuOpen((isOpen) => !isOpen);
                }}
                disabled={disabled}
                title="Add"
                aria-label="Open add menu"
                aria-haspopup="menu"
                aria-expanded={isAddMenuOpen}
              >
                <Plus className="h-5 w-5" />
              </Button>
              {isAddMenuOpen && addMenuStyle &&
                createPortal(
                  <div
                    ref={addMenuRef}
                    style={addMenuStyle}
                    className={cn(
                      'fixed z-[230] overflow-y-auto rounded-2xl border p-2 text-left shadow-[0_18px_48px_rgb(0_0_0_/_38%)]',
                      isOpenAI
                        ? isSiteDark
                          ? 'border-white/[0.12] bg-[#2f2f2f] text-white'
                          : 'border-[#d9d9e3] bg-white text-[#0d0d0d] shadow-[0_8px_22px_rgb(0_0_0_/_14%)]'
                        : isSiteDark
                          ? 'border-white/[0.12] bg-[#30302E] text-[#f2f0ea]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_8px_22px_rgb(31_25_16_/_14%)]',
                    )}
                    role="menu"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className={cn('px-3 pb-1 pt-1 text-sm font-semibold', isSiteDark ? 'text-white/[0.52]' : 'text-black/[0.52]')}>
                      Add
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                        isOpenAI
                          ? isSiteDark ? 'hover:bg-white/[0.08]' : 'hover:bg-[#f4f4f4]'
                          : isSiteDark ? 'hover:bg-white/[0.06]' : 'hover:bg-[var(--color-background-offset)]',
                      )}
                      disabled={files.length >= maxFiles}
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                    >
                      <FileText className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="min-w-0">
                        <span className="block">Add files</span>
                        {files.length >= maxFiles && (
                          <span className={cn('block text-xs font-medium', isSiteDark ? 'text-white/[0.45]' : 'text-black/[0.45]')}>
                            Max {maxFiles} files reached
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                        isOpenAI
                          ? isSiteDark ? 'hover:bg-white/[0.08]' : 'hover:bg-[#f4f4f4]'
                          : isSiteDark ? 'hover:bg-white/[0.06]' : 'hover:bg-[var(--color-background-offset)]',
                      )}
                      disabled={!onVariantChange}
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onVariantChange?.(isOpenAI ? 'anthropic' : 'openai');
                      }}
                    >
                      {isOpenAI ? (
                        <AnthropicThemeIcon className="h-4 w-4 shrink-0 text-[hsl(var(--accent-brand)_/_1)]" />
                      ) : (
                        <OpenAIThemeIcon className={cn('h-4 w-4 shrink-0', isSiteDark ? 'text-white' : 'text-black')} />
                      )}
                      <span className="min-w-0">
                        <span className="block">Switch theme</span>
                        <span className={cn('block text-xs font-medium', isSiteDark ? 'text-white/[0.45]' : 'text-black/[0.45]')}>
                          {isOpenAI ? 'Anthropic style' : 'OpenAI style'}
                        </span>
                      </span>
                    </button>
                  </div>,
                  document.body,
                )}
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {models && models.length > 0 && (
              <ModelSelectorDropdown
                models={models}
                selectedModel={selectedModel}
                onModelChange={handleModelChangeInternal}
                onSelectionChange={handleSelectionChange}
                variant={variant}
                siteTheme={siteTheme}
              />
            )}

            <Button
              size="icon"
              className={cn(
                'h-9 w-9 p-0 flex-shrink-0 transition-colors',
                isOpenAI
                  ? canSend
                    ? isSiteDark
                      ? 'rounded-full bg-white text-black hover:bg-[#ececec]'
                      : 'rounded-full bg-[#0d0d0d] text-white hover:bg-[#2f2f2f]'
                    : isSiteDark
                      ? 'rounded-full bg-white text-black cursor-not-allowed opacity-40'
                      : 'rounded-full bg-[#0d0d0d] text-white cursor-not-allowed opacity-40'
                  : canSend
                    ? 'rounded-md bg-amber-600 hover:bg-amber-700 text-white'
                    : 'rounded-md bg-zinc-700 text-zinc-500 cursor-not-allowed',
              )}
              onClick={handleSend}
              disabled={!canSend}
              title="Send message"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={acceptedFileTypes?.join(',')}
        onChange={(event) => {
          handleFileSelect(event.target.files);
          if (event.target) event.target.value = '';
        }}
      />
    </div>
  );
};

export const Component = () => {
  const handleSendMessage = (
    message: string,
    files: FileWithPreview[],
    pastedContent: PastedContent[],
  ) => {
    console.log('Message:', message);
    console.log('Files:', files);
    console.log('Pasted Content:', pastedContent);
  };

  return (
    <div className="min-h-screen w-screen bg-[#262624] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center py-16">
          <h1 className="text-3xl font-serif font-light text-[#C2C0B6] mb-2">
            What&apos;s new, Suraj?
          </h1>
        </div>

        <ClaudeChatInput
          onSendMessage={handleSendMessage}
          placeholder="Try pasting large text or uploading textual files..."
          maxFiles={10}
          maxFileSize={10 * 1024 * 1024}
        />
      </div>
    </div>
  );
};
