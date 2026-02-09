import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

type Props = {
  text: string;
  isStreaming?: boolean;
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};

export default function TypewriterMessage({ text, isStreaming }: Props) {
  // While streaming, render raw text with markdown (no typewriter needed — it's already appearing live)
  if (isStreaming) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  // For completed messages, apply word-by-word reveal
  const words = text.split(" ");

  return (
    <motion.div
      className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, i) => (
        <motion.span key={i} variants={wordVariants} className="inline">
          {word}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.div>
  );
}
