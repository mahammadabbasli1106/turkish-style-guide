import { motion, AnimatePresence } from "framer-motion";
import { Bot, User } from "lucide-react";
import TypewriterMessage from "./TypewriterMessage";
import ThinkingBubble from "./ThinkingBubble";
import MiniItemCard from "./MiniItemCard";
import { findMentionedItems } from "@/lib/fuzzyMatch";

export type Msg = { role: "user" | "assistant"; content: string };

type WardrobeItem = {
  id: string;
  name: string;
  image_url: string;
};

type Props = {
  messages: Msg[];
  isStreaming: boolean;
  wardrobeItems?: WardrobeItem[];
};

export default function ChatMessageList({ messages, isStreaming, wardrobeItems = [] }: Props) {
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
        const mentionedItems =
          msg.role === "assistant" && wardrobeItems.length > 0
            ? findMentionedItems(msg.content, wardrobeItems)
            : [];

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
            <div className="max-w-[80vw] lg:max-w-[85%] min-w-0 space-y-2">
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap overflow-hidden ${
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
              {/* Mini Product Cards */}
              {mentionedItems.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 pl-1">
                  {mentionedItems.map((item) => (
                    <MiniItemCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      imageUrl={item.image_url}
                    />
                  ))}
                </div>
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
