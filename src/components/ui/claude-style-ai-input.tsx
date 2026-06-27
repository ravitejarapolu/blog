"use client";

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  SlidersHorizontal,
  ArrowUp,
  X,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Copy,
  BookOpen,
  BriefcaseBusiness,
  HeartPulse,
  Lightbulb,
  Mail,
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

export interface ChatInputSuggestion {
  id: string;
  text: string;
  category?: string;
}

interface ChatInputProps {
  onSendMessage?: (
    message: string,
    files: FileWithPreview[],
    pastedContent: PastedContent[],
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  models?: ModelOption[];
  defaultModel?: string;
  onModelChange?: (modelId: string) => void;
  suggestions?: ChatInputSuggestion[];
  variant?: 'anthropic' | 'openai';
  onVariantChange?: (variant: 'anthropic' | 'openai') => void;
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

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) {
    return <ImageIcon className="h-5 w-5 text-zinc-400" />;
  }
  if (type.startsWith('video/')) {
    return <Video className="h-5 w-5 text-zinc-400" />;
  }
  if (type.startsWith('audio/')) {
    return <Music className="h-5 w-5 text-zinc-400" />;
  }
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) {
    return <Archive className="h-5 w-5 text-zinc-400" />;
  }
  return <FileText className="h-5 w-5 text-zinc-400" />;
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

const FilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith('image/');
  const isTextual = isTextualFile(file.file);

  if (isTextual) {
    return <TextualFilePreviewCard file={file} onRemove={onRemove} />;
  }

  return (
    <div
      className={cn(
        'relative group bg-zinc-700 border w-fit border-zinc-600 rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden',
        isImage ? 'p-0' : 'p-3',
      )}
    >
      <div className="flex items-start gap-3 size-[125px] overflow-hidden">
        {isImage && file.preview ? (
          <div className="relative size-full rounded-md overflow-hidden bg-zinc-600">
            <img
              src={file.preview || '/placeholder.svg'}
              alt={file.file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
        {!isImage && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-[#30302E] from-transparent overflow-hidden">
                <p className="absolute bottom-2 left-2 capitalize text-white text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md">
                  {getFileTypeLabel(file.type)}
                </p>
              </div>
              {getFileIcon(file.type)}
              {file.uploadStatus === 'uploading' && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
              )}
              {file.uploadStatus === 'error' && (
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>

            <p
              className="max-w-[90%] text-xs font-medium text-zinc-100 truncate"
              title={file.file.name}
            >
              {file.file.name}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        )}
      </div>
      <Button
        size="icon"
        variant="outline"
        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={() => onRemove(file.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const PastedContentCard: React.FC<{
  content: PastedContent;
  onRemove: (id: string) => void;
}> = ({ content, onRemove }) => {
  const previewText = content.content.slice(0, 150);
  const needsTruncation = content.content.length > 150;

  return (
    <div className="bg-zinc-700 border border-zinc-600 relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden">
      <div className="text-[8px] text-zinc-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto custom-scrollbar">
        {previewText}
        {needsTruncation && '...'}
      </div>
      <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-[#30302E] from-transparent overflow-hidden">
        <p className="capitalize text-white text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md">
          PASTED
        </p>
        <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300 flex items-center gap-0.5 absolute top-2 right-2">
          <Button
            size="icon"
            variant="outline"
            className="size-6"
            onClick={() => navigator.clipboard.writeText(content.content)}
            title="Copy content"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="size-6"
            onClick={() => onRemove(content.id)}
            title="Remove content"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ModelSelectorDropdown: React.FC<{
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  variant?: 'anthropic' | 'openai';
  onOpenChange?: (isOpen: boolean) => void;
}> = ({ models, selectedModel, onModelChange, variant = 'anthropic', onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenAI = variant === 'openai';
  const selectedModelData =
    models.find((model) => model.id === selectedModel) || models[0];
  const dropdownRef = useRef<HTMLDivElement>(null);
  const updateIsOpen = useCallback(
    (nextIsOpen: boolean) => {
      setIsOpen(nextIsOpen);
      onOpenChange?.(nextIsOpen);
    },
    [onOpenChange],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        updateIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [updateIsOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-9 px-2.5 text-sm font-medium',
          isOpenAI
            ? 'text-[#f4f4f4] hover:bg-white/10 hover:text-white'
            : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100',
        )}
        aria-label={`Current model: ${selectedModelData.name}`}
        title={selectedModelData.name}
        onClick={() => updateIsOpen(!isOpen)}
      >
        <span className="truncate max-w-[150px] sm:max-w-[200px]">
          {selectedModelData.name}
        </span>
        <ChevronDown
          className={cn(
            'ml-1 h-4 w-4 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </Button>

      {isOpen && (
        <div className={cn(
          'absolute bottom-full right-0 z-20 mb-2 w-72 rounded-lg border p-2 shadow-xl',
          isOpenAI
            ? 'border-white/10 bg-[#181818] shadow-black/40'
            : 'border-zinc-700 bg-zinc-800',
        )}>
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-md p-2.5 text-left transition-colors',
                isOpenAI
                  ? 'hover:bg-white/10'
                  : 'hover:bg-zinc-700',
                model.id === selectedModel && (isOpenAI ? 'bg-white/10' : 'bg-zinc-700'),
              )}
              onClick={() => {
                onModelChange(model.id);
                updateIsOpen(false);
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium', isOpenAI ? 'text-[#f4f4f4]' : 'text-zinc-100')}>
                    {model.name}
                  </span>
                  {model.badge && (
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-xs',
                      isOpenAI
                        ? 'bg-[#4d9cff]/15 text-[#8ec2ff]'
                        : 'bg-blue-500/20 text-blue-300',
                    )}>
                      {model.badge}
                    </span>
                  )}
                </div>
                <p className={cn('mt-0.5 text-xs', isOpenAI ? 'text-[#9b9b9b]' : 'text-zinc-400')}>
                  {model.description}
                </p>
              </div>
              {model.id === selectedModel && (
                <Check className={cn('h-4 w-4 flex-shrink-0', isOpenAI ? 'text-[#4d9cff]' : 'text-blue-400')} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TextualFilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const previewText = file.textContent?.slice(0, 150) || '';
  const needsTruncation = (file.textContent?.length || 0) > 150;
  const fileExtension = getFileExtension(file.file.name);

  return (
    <div className="bg-zinc-700 border border-zinc-600 relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden">
      <div className="text-[8px] text-zinc-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto custom-scrollbar">
        {file.textContent ? (
          <>
            {previewText}
            {needsTruncation && '...'}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-[#30302E] from-transparent overflow-hidden">
        <p className="capitalize text-white text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md">
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
        <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300 flex items-center gap-0.5 absolute top-2 right-2">
          {file.textContent && (
            <Button
              size="icon"
              variant="outline"
              className="size-6"
              onClick={() =>
                navigator.clipboard.writeText(file.textContent || '')
              }
              title="Copy content"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            className="size-6"
            onClick={() => onRemove(file.id)}
            title="Remove file"
          >
            <X className="h-3 w-3" />
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
  suggestions = [],
  variant = 'anthropic',
  onVariantChange,
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    defaultModel || models[0]?.id || '',
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight =
        Number.parseInt(getComputedStyle(textareaRef.current).maxHeight, 10) ||
        120;
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        maxHeight,
      )}px`;
    }
  }, [message]);

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

    onSendMessage?.(message, files, pastedContent);

    setMessage('');
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [message, files, pastedContent, disabled, onSendMessage]);

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

  const hasContent =
    message.trim() || files.length > 0 || pastedContent.length > 0;
  const canSend =
    hasContent &&
    !disabled &&
    !files.some((file) => file.uploadStatus === 'uploading');
  const isOpenAI = variant === 'openai';
  const suggestionQuery = message.trim().toLowerCase();
  const suggestionTokens = suggestionQuery.split(/\s+/).filter(Boolean);
  const visibleSuggestions = (suggestionTokens.length > 0
    ? suggestions.filter((suggestion) => {
        const searchableText = `${suggestion.text} ${suggestion.category || ''}`.toLowerCase();
        return suggestionTokens.every((token) => searchableText.includes(token));
      })
    : suggestions
  ).slice(0, 3);
  const shouldShowSuggestions =
    visibleSuggestions.length > 0 &&
    files.length === 0 &&
    pastedContent.length === 0 &&
    !isTextareaFocused &&
    !isModelSelectorOpen;

  return (
    <div
      className="relative w-full max-w-2xl mx-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div
          className={cn(
            'absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed pointer-events-none',
            isOpenAI
              ? 'border-[#4d9cff] bg-[#111111] text-[#8ec2ff]'
              : 'border-blue-500 bg-[#1C3F62] text-blue-500',
          )}
        >
          <p className="text-sm flex items-center gap-2">
            <ImageIcon className="size-4 opacity-50" />
            Drop files here to add to chat
          </p>
        </div>
      )}

      {shouldShowSuggestions && (
        <div
          className={cn(
            'absolute bottom-[calc(100%+0.8rem)] left-0 right-0 z-30 mx-auto grid max-w-2xl gap-2',
            isOpenAI ? 'font-sans' : 'font-anthropic',
          )}
        >
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className={cn(
                'group flex w-full items-center gap-3 px-4 py-1 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                isOpenAI
                  ? 'text-[#b7b7b7] hover:text-[#f4f4f4] focus-visible:outline-[#4d9cff]'
                  : 'text-[#cfc8bd] hover:text-[#f4efe7] focus-visible:outline-[#d97745]',
              )}
              onClick={() => {
                setMessage(suggestion.text);
                textareaRef.current?.focus();
              }}
              title={suggestion.text}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center',
                  isOpenAI
                    ? 'text-[#9f9f9f] group-hover:text-[#4d9cff]'
                    : 'text-[#d97745]',
                )}
              >
                <SuggestionIcon
                  category={suggestion.category}
                  text={suggestion.text}
                  className="h-5 w-5 shrink-0"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block whitespace-normal break-words',
                    isOpenAI
                      ? 'text-sm font-semibold leading-snug tracking-normal'
                      : 'text-sm font-semibold leading-snug',
                  )}
                >
                  {suggestion.text}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          'items-end gap-2 min-h-[150px] flex flex-col overflow-hidden rounded-xl border shadow-lg',
          isOpenAI
            ? 'border-white/10 bg-[#181818] shadow-black/30'
            : 'border-zinc-700 bg-[#30302E]',
        )}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsTextareaFocused(true)}
          onBlur={() => setIsTextareaFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 min-h-[100px] w-full p-4 focus-within:border-none focus:outline-none focus:border-none border-none outline-none focus-within:ring-0 focus-within:ring-offset-0 focus-within:outline-none max-h-[120px] resize-none bg-transparent text-base leading-[26px] shadow-none focus-visible:ring-0 custom-scrollbar',
            isOpenAI
              ? 'text-[#f4f4f4] placeholder:text-[#8e8e8e]'
              : 'text-zinc-100 placeholder:text-zinc-500',
          )}
          rows={1}
        />
        <div className="flex items-center gap-2 justify-between w-full px-3 pb-1.5">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-9 w-9 p-0 flex-shrink-0',
                isOpenAI
                  ? 'text-[#f4f4f4] hover:bg-white/10 hover:text-white'
                  : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
              )}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || files.length >= maxFiles}
              title={
                files.length >= maxFiles
                  ? `Max ${maxFiles} files reached`
                  : 'Attach files'
              }
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-9 w-9 p-0 flex-shrink-0',
                isOpenAI
                  ? 'text-[#4d9cff] hover:bg-white/10 hover:text-[#8ec2ff]'
                  : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
              )}
              disabled={disabled}
              onClick={() => onVariantChange?.(isOpenAI ? 'anthropic' : 'openai')}
              title={isOpenAI ? 'Switch to Anthropic chat style' : 'Switch to OpenAI chat style'}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {models && models.length > 0 && (
              <ModelSelectorDropdown
                models={models}
                selectedModel={selectedModel}
                onModelChange={handleModelChangeInternal}
                variant={variant}
                onOpenChange={setIsModelSelectorOpen}
              />
            )}

            <Button
              size="icon"
              className={cn(
                'h-9 w-9 p-0 flex-shrink-0 transition-colors',
                isOpenAI
                  ? canSend
                    ? 'rounded-full bg-white text-black hover:bg-[#ececec]'
                    : 'rounded-full bg-white text-black cursor-not-allowed'
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
        {(files.length > 0 || pastedContent.length > 0) && (
          <div
            className={cn(
              'overflow-x-auto border-t-[1px] p-3 w-full hide-scroll-bar',
              isOpenAI
                ? 'border-white/10 bg-[#111111]'
                : 'border-zinc-700 bg-[#262624]',
            )}
          >
            <div className="flex gap-3">
              {pastedContent.map((content) => (
                <PastedContentCard
                  key={content.id}
                  content={content}
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
                />
              ))}
            </div>
          </div>
        )}
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

function SuggestionIcon({
  category,
  text,
  className = 'h-3.5 w-3.5 shrink-0 text-zinc-400',
}: {
  category?: string;
  text: string;
  className?: string;
}) {
  if (text.toLowerCase().includes('contact')) {
    return <Mail className={className} />;
  }

  if (category === 'Work') {
    return <BriefcaseBusiness className={className} />;
  }

  if (category === 'Skills') {
    return <Lightbulb className={className} />;
  }

  if (category === 'Hobbies') {
    return <HeartPulse className={className} />;
  }

  return <BookOpen className={className} />;
}
