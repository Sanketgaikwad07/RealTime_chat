import { User } from "@/types/chat";

interface AvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const statusSizeMap = {
  sm: "h-2.5 w-2.5 border",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
};

const colors = [
  "bg-primary",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
];

const getColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const ChatAvatar = ({ user, size = "md", showStatus = false }: AvatarProps) => {
  const initials = user.username.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${sizeMap[size]} ${getColor(user.id)} rounded-full flex items-center justify-center font-semibold text-primary-foreground`}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeMap[size]} rounded-full border-card ${
            user.online ? "bg-online" : "bg-offline"
          }`}
        />
      )}
    </div>
  );
};

export default ChatAvatar;
