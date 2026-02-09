import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import ChatMessageList, { type Msg } from "@/components/chat/ChatMessageList";
import ChatInput from "@/components/chat/ChatInput";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import PremiumUpgradeModal from "@/components/PremiumUpgradeModal";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/style-chat`;

export default function StyleChat() {
  const { user, loading, session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canChat, chatMessagesLeft, isPremium, recordUsage } = useUsageLimits();

  // Fetch wardrobe items for mini product cards
  const { data: wardrobeItems = [] } = useQuery({
    queryKey: ["wardrobe-items-chat", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("clothing_items")
        .select("id, name, image_url")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming || !session) return;

    if (!canChat) {
      setPremiumOpen(true);
      return;
    }

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Record usage immediately
    await recordUsage("style_chat");

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
                }
                return [...prev, { role: "assistant", content: snapshot }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message || "Something went wrong. Please try again."}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] max-w-2xl mx-auto">
        {/* Scrollable message area with padding for fixed input */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-32 lg:pb-4 px-1 min-h-0">
          {messages.length === 0 ? (
            <ChatEmptyState onPromptClick={setInput} />
          ) : (
            <ChatMessageList messages={messages} isStreaming={isStreaming} wardrobeItems={wardrobeItems} />
          )}
        </div>

        {/* Input pinned above bottom nav */}
        <div className="hidden lg:block">
          <ChatInput
            input={input}
            setInput={setInput}
            isStreaming={isStreaming}
            onSend={sendMessage}
            messagesLeft={isPremium ? undefined : chatMessagesLeft}
          />
        </div>
      </div>

      {/* Mobile: fixed input above bottom nav (rendered outside flex container) */}
      <div className="lg:hidden">
        <ChatInput
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          onSend={sendMessage}
          messagesLeft={isPremium ? undefined : chatMessagesLeft}
        />
      </div>

      <PremiumUpgradeModal
        open={premiumOpen}
        onOpenChange={setPremiumOpen}
        trigger="Daily Message Limit Reached"
      />
    </DashboardLayout>
  );
}
