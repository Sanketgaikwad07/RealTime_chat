import { Profile } from "@/types/chat";

interface AvatarProps {
  user: Profile;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  isOnline?: boolean;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const statusSizeMap = {
  sm: "h-2.5 w-2.5 border-[1.5px]",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
};

const gradients = [
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-violet-500 to-purple-400",
  "from-indigo-500 to-blue-400",
];

const getGradient = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
};

const ChatAvatar = ({ user, size = "md", showStatus = false, isOnline = false }: AvatarProps) => {
  const initials = user.username
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-flex shrink-0">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.username}
          className={`${sizeMap[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeMap[size]} bg-gradient-to-br ${getGradient(user.id)} rounded-full flex items-center justify-center font-semibold text-primary-foreground shadow-sm`}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeMap[size]} rounded-full border-card ${
            isOnline ? "bg-online" : "bg-offline"
          }`}
        />
      )}
    </div>
  );
};

export default ChatAvatar;
