import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  onSend: () => void;
  messagesLeft?: number;
};

export default function ChatInput({ input, setInput, isStreaming, onSend, messagesLeft }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus();
  }, [isStreaming]);

  // Detect mobile keyboard open/close via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // If viewport height is significantly less than window height, keyboard is open
      const isOpen = vv.height < window.innerHeight * 0.75;
      setKeyboardOpen(isOpen);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  // Emit custom event so BottomTabBar can hide
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("keyboard-state", { detail: { open: keyboardOpen } }));
  }, [keyboardOpen]);

  return (
    <div className={`fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border pt-2 pb-3 px-4 lg:px-1 ${
      keyboardOpen ? "bottom-0" : "bottom-[calc(5rem+env(safe-area-inset-bottom))]"
    } lg:sticky lg:bottom-0`}>
      {messagesLeft !== undefined && (
        <p className="text-xs text-muted-foreground text-center mb-2">
          {messagesLeft}/5 messages left today
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-center gap-2 max-w-2xl mx-auto"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.placeholder")}
          className="flex-1 bg-card border border-border rounded-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isStreaming}
          className="rounded-full h-11 w-11 bg-gradient-primary text-primary-foreground shadow-warm shrink-0"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
