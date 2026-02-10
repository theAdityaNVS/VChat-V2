import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import type { Message } from '../../types/message';
import type { UploadProgress } from '../../lib/uploadService';

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<boolean>;
  onSendFile?: (file: File, onProgress: (progress: UploadProgress) => void) => Promise<boolean>;
  disabled?: boolean;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

// Common emojis for the picker
const EMOJI_LIST = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😅',
  '😂',
  '🤣',
  '😊',
  '😇',
  '🙂',
  '🙃',
  '😉',
  '😌',
  '😍',
  '🥰',
  '😘',
  '😗',
  '😙',
  '😚',
  '😋',
  '😛',
  '😝',
  '😜',
  '🤪',
  '🤨',
  '🧐',
  '🤓',
  '😎',
  '🥳',
  '😏',
  '😒',
  '😞',
  '😔',
  '😟',
  '😕',
  '🙁',
  '😣',
  '😖',
  '😫',
  '😩',
  '🥺',
  '😢',
  '😭',
  '😤',
  '😠',
  '😡',
  '🤬',
  '🤯',
  '😳',
  '🥵',
  '👍',
  '👎',
  '👏',
  '🙌',
  '👌',
  '✌️',
  '🤞',
  '🤝',
  '🙏',
  '💪',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '🤎',
  '💔',
  '✨',
  '⭐',
  '🌟',
  '💫',
  '🔥',
  '💯',
  '✅',
  '❌',
  '⚡',
  '🎉',
];

const MessageInput = ({
  onSendMessage,
  onSendFile,
  disabled = false,
  onTyping,
  replyingTo,
  onCancelReply,
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Clear typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Signal typing stopped
      if (onTyping) {
        onTyping(false);
      }
    };
  }, [onTyping]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const handleTyping = useCallback(() => {
    if (!onTyping) return;

    // Signal typing started
    onTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  }, [onTyping]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sending || disabled) return;

    // Stop typing indicator
    if (onTyping) {
      onTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSending(true);
    const success = await onSendMessage(trimmedMessage);

    if (success) {
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Trigger typing indicator
    handleTyping();

    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !onSendFile || sending) return;

    setSending(true);
    setUploadProgress({ progress: 0, status: 'uploading' });

    const success = await onSendFile(selectedFile, (progress) => {
      setUploadProgress(progress);
    });

    if (success) {
      handleRemoveFile();
      setUploadProgress(null);
    } else {
      setUploadProgress(null);
    }
    setSending(false);
  };

  const handleEmojiClick = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + emoji + message.substring(end);

    setMessage(newMessage);
    setShowEmojiPicker(false);

    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded flex items-start justify-between">
          <div className="flex-1">
            <div className="text-xs font-semibold text-blue-700 mb-1">
              Replying to {replyingTo.senderName}
            </div>
            <div className="text-sm text-gray-700 truncate">
              {replyingTo.type === 'image' ? '📷 Image' : replyingTo.content}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-2 text-gray-500 hover:text-gray-700"
            title="Cancel reply"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Selected file:</span>
            <button
              onClick={handleRemoveFile}
              className="text-gray-500 hover:text-red-600"
              title="Remove file"
              disabled={sending}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {filePreview ? (
            <img src={filePreview} alt="Preview" className="max-h-48 rounded-lg" />
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span>{selectedFile.name}</span>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadProgress && uploadProgress.status === 'uploading' && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Uploading...</span>
                <span className="text-xs font-medium text-blue-600">
                  {Math.round(uploadProgress.progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadProgress && uploadProgress.status === 'error' && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              Error: {uploadProgress.error || 'Upload failed'}
            </div>
          )}

          <button
            onClick={handleFileUpload}
            disabled={sending}
            className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Uploading...' : 'Send File'}
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File Attachment Button */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,application/pdf,.doc,.docx,.txt"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !!selectedFile}
          className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          aria-label="Attach file"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Emoji Button */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled || !!selectedFile}
            className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Add emoji"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
              <div className="text-xs font-medium text-gray-700 mb-2">Pick an emoji</div>
              <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                {EMOJI_LIST.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{ maxHeight: '150px' }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className="flex-shrink-0 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending...
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
