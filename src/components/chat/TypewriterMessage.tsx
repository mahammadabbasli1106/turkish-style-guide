import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef } from "react";

type Props = {
  text: string;
  isStreaming?: boolean;
  isNew?: boolean;
};

const markdownClasses =
  "prose prose-sm dark:prose-invert max-w-none text-foreground break-words overflow-hidden " +
  "[&>p]:m-0 [&>p]:mb-2 [&>p:last-child]:mb-0 " +
  "[&>ul]:my-1 [&>ul]:pl-4 [&>ol]:my-1 [&>ol]:pl-4 " +
  "[&_li]:my-0.5 [&_li]:text-foreground " +
  "[&_strong]:text-foreground [&_strong]:font-bold " +
  "[&_em]:text-muted-foreground " +
  "[&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-1 [&>h1]:text-foreground " +
  "[&>h2]:text-sm [&>h2]:font-bold [&>h2]:mb-1 [&>h2]:text-foreground " +
  "[&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1 [&>h3]:text-foreground " +
  "[&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs";

export default function TypewriterMessage({ text, isStreaming, isNew }: Props) {
  const fullLen = text.length;
  const [displayLen, setDisplayLen] = useState(isNew ? 0 : fullLen);
  const prevTextRef = useRef(text);

  useEffect(() => {
    // During streaming, always show full text (it arrives incrementally from the API)
    if (isStreaming) {
      setDisplayLen(fullLen);
      return;
    }

    // For old/history messages, show immediately
    if (!isNew) {
      setDisplayLen(fullLen);
      return;
    }

    // New completed message: typewriter from where we left off
    if (displayLen >= fullLen) return;

    const timer = setInterval(() => {
      setDisplayLen((prev) => {
        const next = Math.min(prev + 3, fullLen); // 3 chars per tick for speed
        if (next >= fullLen) clearInterval(timer);
        return next;
      });
    }, 12);

    return () => clearInterval(timer);
  }, [isStreaming, isNew, fullLen]);

  // During streaming, update display as new content arrives
  useEffect(() => {
    if (isStreaming && text !== prevTextRef.current) {
      setDisplayLen(text.length);
      prevTextRef.current = text;
    }
  }, [text, isStreaming]);

  const displayText = text.slice(0, displayLen);

  return (
    <div className={markdownClasses}>
      <ReactMarkdown>{displayText}</ReactMarkdown>
      {isNew && displayLen < fullLen && (
        <span className="inline-block w-0.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}
