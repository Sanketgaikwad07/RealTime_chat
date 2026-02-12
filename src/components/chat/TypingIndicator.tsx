import { motion } from "framer-motion";

const TypingIndicator = ({ username }: { username?: string }) => (
  <div className="flex items-center gap-2 px-4 py-1">
    <div className="flex items-center gap-1 bg-chat-received px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/60"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
    {username && (
      <span className="text-xs text-muted-foreground">{username} is typing...</span>
    )}
  </div>
);

export default TypingIndicator;
