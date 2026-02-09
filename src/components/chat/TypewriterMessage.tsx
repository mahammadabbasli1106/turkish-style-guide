import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useRef, useState, useEffect } from "react";

type Props = {
  text: string;
  isStreaming?: boolean;
  isNew?: boolean;
};

const markdownClasses =
  "prose prose-sm dark:prose-invert max-w-none " +
  "[&>p]:m-0 [&>p]:mb-2 [&>p:last-child]:mb-0 " +
  "[&>ul]:my-1 [&>ul]:pl-4 [&>ol]:my-1 [&>ol]:pl-4 " +
  "[&_li]:my-0.5 " +
  "[&_strong]:text-primary [&_strong]:font-semibold " +
  "[&_em]:text-muted-foreground " +
  "[&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-1 " +
  "[&>h2]:text-sm [&>h2]:font-bold [&>h2]:mb-1 " +
  "[&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1 " +
  "[&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs";

export default function TypewriterMessage({ text, isStreaming, isNew }: Props) {
  const hasAnimated = useRef(false);
  const [showFull, setShowFull] = useState(!isNew || hasAnimated.current);

  useEffect(() => {
    // After streaming is done and it was a new message, briefly show typewriter then resolve
    if (!isStreaming && isNew && !hasAnimated.current) {
      hasAnimated.current = true;
      // Small delay then show full markdown
      const timer = setTimeout(() => setShowFull(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, isNew]);

  // Streaming: render live markdown
  if (isStreaming) {
    return (
      <div className={markdownClasses}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  // Completed message: render full markdown
  if (showFull) {
    return (
      <motion.div
        initial={isNew && !hasAnimated.current ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        className={markdownClasses}
      >
        <ReactMarkdown>{text}</ReactMarkdown>
      </motion.div>
    );
  }

  // Brief typewriter for newly completed messages (word reveal)
  const words = text.split(" ");
  return (
    <motion.div
      className={markdownClasses}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.02 } },
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.1 } },
          }}
          className="inline"
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.div>
  );
}
