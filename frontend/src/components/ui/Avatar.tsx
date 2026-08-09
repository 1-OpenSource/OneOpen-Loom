import type { UserSummary } from "../../types/auth";

interface AvatarProps {
  user?: UserSummary | null;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ user, label, size = "md" }: AvatarProps) {
  const text = label ?? user?.name ?? user?.email ?? "User";
  const initials = text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (user?.avatar_url) {
    return <img className={`avatar avatar-${size}`} src={user.avatar_url} alt={text} />;
  }

  return (
    <span className={`avatar avatar-${size}`} aria-label={text}>
      {initials || "U"}
    </span>
  );
}
