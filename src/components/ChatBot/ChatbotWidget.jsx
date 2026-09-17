import React, { useEffect, useMemo, useRef, useState } from "react";
import { getFaqAnswer } from "../../lib/faqBotEngine"; // local FAQ bot
import { useApp } from "../../context/AppContext";

import {
  surface,
  textPrimary,
  textSecondary,
  textMuted,
  hoverSurface,
} from "../../styles";

export default function ChatbotWidget({
  title = "GenAI Assistant",
  initialOpen = false,
}) {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) return null;

  const [open, setOpen] = useState(initialOpen);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // basic chat history (kept same)
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Hi! I'm your GenAI assistant. Ask me anything about GenAI foundations, concepts, or terminology.",
    },
  ]);

  const panelRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // close on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // auto-scroll to bottom
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  // -----------------------------
  // Local FAQ Bot (unchanged)
  // -----------------------------
  async function handleSend() {
    if (!canSend) return;

    const userText = input.trim();
    setInput("");

    const nextMessages = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const faq = getFaqAnswer(userText);

      const formatted =
        `Q: ${faq.question}\n\n` +
        `➤ ${faq.answer}\n\n` +
        `📌 Category: ${faq.category}\n` +
        `🔎 Match Score: ${faq.score.toFixed(2)}`;

      setMessages((prev) => [...prev, { role: "assistant", content: formatted }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Error processing your question. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared ✅\nHow can I help you with GenAI FAQs today?",
      },
    ]);
  }

  // -----------------------------
  // Theme-aware classes (UI only)
  // -----------------------------
  const panelClass = [
    "fixed bottom-20 right-5 z-50 w-[92vw] max-w-sm overflow-hidden rounded-2xl shadow-2xl",
    surface,
    "ring-1 ring-black/5 dark:ring-white/10",
  ].join(" ");

  const headerClass = [
    "flex items-center justify-between px-4 py-3",
    surface,
    "border-b border-gray-200 dark:border-gray-800",
  ].join(" ");

  const listClass = [
    "max-h-[55vh] min-h-[280px] overflow-y-auto px-3 py-3",
    "bg-gray-50 dark:bg-gray-950/40",
  ].join(" ");

  const bubbleUser =
    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm " +
    "bg-brand-600 text-white";

  const bubbleAssistant = [
    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm",
    surface,
    "border border-gray-200 dark:border-gray-800",
    "text-gray-800 dark:text-gray-100",
  ].join(" ");

  const chipButton = [
    "rounded-md px-2 py-1 text-xs transition",
    surface,
    hoverSurface,
    textPrimary,
    "focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400",
  ].join(" ");

  const textareaClass =
    "flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none transition " +
    "border-gray-300 bg-white text-gray-900 " +
    "focus:border-brand-500 focus:ring-2 focus:ring-brand-200 " +
    "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 " +
    "dark:focus:border-brand-400 dark:focus:ring-brand-900/40";

  const sendBtnClass = [
    "rounded-xl px-4 py-2 text-sm font-medium text-white transition",
    canSend
      ? "bg-brand-600 hover:bg-brand-700"
      : "bg-gray-300 cursor-not-allowed dark:bg-gray-700",
    "focus:outline-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-400",
  ].join(" ");

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg transition",
          "bg-brand-600 hover:bg-brand-700",
          "focus:outline-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-400",
        ].join(" ")}
        aria-label={open ? "Close chat" : "Open chat"}
        title={open ? "Close chat" : "Chat with assistant"}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        </svg>

        <span className="text-sm font-medium">{open ? "Close" : "Chat"}</span>
      </button>

      {/* Popup Panel */}
      {open && (
        <div ref={panelRef} className={panelClass} role="dialog" aria-label="Chat assistant">
          {/* Header */}
          <div className={headerClass}>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 2a7 7 0 0 0-7 7v4a4 4 0 0 0 4 4h1v3l3-3h4a4 4 0 0 0 4-4V9a7 7 0 0 0-7-7Z" />
                </svg>
              </span>

              <div>
                <div className={`text-sm font-semibold ${textPrimary}`}>{title}</div>
                <div className={`text-xs ${textMuted}`}>
                  {loading ? "Thinking..." : "Beta Version - Coming Soon!"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                className={chipButton}
                title="Clear chat"
                type="button"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className={chipButton}
                title="Close"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className={listClass}>
            <div className="space-y-2">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={m.role === "user" ? bubbleUser : bubbleAssistant}>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div
                    className={[
                      "rounded-2xl px-3 py-2 text-sm",
                      surface,
                      "border border-gray-200 dark:border-gray-800",
                      textSecondary,
                    ].join(" ")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:120ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className={`border-t p-3 ${surface} border-gray-200 dark:border-gray-800`}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type your message… (Enter to send)"
                className={textareaClass}
              />

              <button
                onClick={handleSend}
                disabled={!canSend}
                className={sendBtnClass}
                type="button"
              >
                Send
              </button>
            </div>

            <div className={`mt-2 text-[11px] ${textMuted}`}>
              Tip: Press <strong>Enter</strong> to send,{" "}
              <strong>Shift+Enter</strong> for newline.
            </div>
          </div>
        </div>
      )}
    </>
  );
}