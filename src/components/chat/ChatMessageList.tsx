import { motion, AnimatePresence } from "framer-motion";
import { Bot, User } from "lucide-react";
import TypewriterMessage from "./TypewriterMessage";
import ThinkingBubble from "./ThinkingBubble";

export type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  messages: Msg[];
  isStreaming: boolean;
  latestAssistantIndex?: number;
};

export default function ChatMessageList({ messages, isStreaming }: Props) {
  // Find the index of the last assistant message to mark it as "new"
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  })();

  return (
    <AnimatePresence initial={false}>
      {messages.map((msg, i) => {
        const isLastAssistant = msg.role === "assistant" && i === lastAssistantIdx;

        return (
          <motion.div
            key={`${i}-${msg.role}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <TypewriterMessage
                  text={msg.content}
                  isStreaming={isLastAssistant && isStreaming}
                  isNew={isLastAssistant}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-foreground" />
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Thinking bubble — shown when waiting for first token */}
      {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
        <ThinkingBubble />
      )}
    </AnimatePresence>
  );
}
