"use client";

import { useCallback, useEffect, useRef } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
};

const toolbarButtons = [
  { cmd: "bold", label: "B", title: "Bold", className: "font-bold" },
  { cmd: "italic", label: "I", title: "Italic", className: "italic" },
  { cmd: "underline", label: "U", title: "Underline", className: "underline" },
  { cmd: "strikeThrough", label: "S", title: "Strikethrough", className: "line-through" },
  { cmd: "insertUnorderedList", label: "• List", title: "Bullet List" },
  { cmd: "insertOrderedList", label: "1. List", title: "Numbered List" },
  { cmd: "formatBlock", value: "blockquote", label: "❝", title: "Quote" },
  { cmd: "formatBlock", value: "h3", label: "H3", title: "Heading" },
  { cmd: "formatBlock", value: "p", label: "P", title: "Paragraph" },
  { cmd: "justifyLeft", label: "⬅", title: "Align Left" },
  { cmd: "justifyCenter", label: "⬌", title: "Align Center" },
  { cmd: "justifyRight", label: "➡", title: "Align Right" },
  { cmd: "removeFormat", label: "⌫", title: "Clear Formatting" },
] as const;

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  minHeight = 200,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (currentHtml !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = useCallback(
    (cmd: string, val?: string) => {
      if (disabled) return;
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      handleInput();
    },
    [disabled, handleInput]
  );

  const handleLink = useCallback(() => {
    if (disabled) return;
    const url = window.prompt("Enter URL:");
    if (url) {
      exec("createLink", url);
    }
  }, [disabled, exec]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        exec("insertText", "\t");
      }
    },
    [exec]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, text);
    handleInput();
  }, [handleInput]);

  return (
    <div className="rounded-md border border-slate-300 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {toolbarButtons.map((btn) => (
          <button
            key={`${btn.cmd}-${btn.label}`}
            type="button"
            disabled={disabled}
            title={btn.title}
            onClick={() => exec(btn.cmd, (btn as any).value)}
            className={`rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${"className" in btn ? btn.className : ""}`}
          >
            {btn.label}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-slate-300" />
        <button
          type="button"
          disabled={disabled}
          title="Insert Link"
          onClick={handleLink}
          className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🔗
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        suppressContentEditableWarning
        style={{ minHeight }}
        className="prose prose-sm max-w-none px-4 py-3 outline-none focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
      />
    </div>
  );
}
