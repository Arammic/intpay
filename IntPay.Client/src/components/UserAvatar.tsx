import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

const colorMap: Record<User["avatarColor"], string> = {
  purple: "bg-gradient-primary",
  green: "bg-gradient-secondary",
  orange: "bg-gradient-tertiary",
  neutral: "bg-card-neutral",
};

interface Props {
  user: Pick<User, "initials" | "avatarColor" | "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function UserAvatar({ user, size = "md", className }: Props) {
  return (
    <div
      title={user.name}
      className={cn(
        "rounded-full grid place-items-center font-label font-semibold text-primary-foreground shadow-sm ring-1 ring-white/10",
        colorMap[user.avatarColor],
        sizeMap[size],
        className,
      )}
    >
      {user.initials}
    </div>
  );
}
