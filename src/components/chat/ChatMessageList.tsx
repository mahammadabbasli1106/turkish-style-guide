import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2 } from "lucide-react";
import TypewriterMessage from "./TypewriterMessage";

export type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  messages: Msg[];
  isStreaming: boolean;
};

export default function ChatMessageList({ messages, isStreaming }: Props) {
  return (
    <AnimatePresence initial={false}>
      {messages.map((msg, i) => {
        const isLastAssistant =
          msg.role === "assistant" && i === messages.length - 1;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <TypewriterMessage
                  text={msg.content}
                  isStreaming={isLastAssistant && isStreaming}
                />
              ) : (
                <p>{msg.content}</p>
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
      {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
            <Bot size={16} className="text-primary-foreground" />
          </div>
          <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
