import { Profile } from "@/types/chat";

interface AvatarProps {
  user: Profile;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
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

const ChatAvatar = ({ user, size = "md" }: AvatarProps) => {
  const initials = user.username
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${sizeMap[size]} ${getColor(user.id)} rounded-full flex items-center justify-center font-semibold text-primary-foreground`}
      >
        {initials}
      </div>
    </div>
  );
};

export default ChatAvatar;
