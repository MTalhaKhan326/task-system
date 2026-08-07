export const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
};

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// Distinct-ish brand tones so different people's avatar circles are
// easy to tell apart at a glance, without introducing an off-brand
// palette. brand-light is excluded — too pale for white text contrast.
const AVATAR_COLORS = ["bg-brand", "bg-brand-dark", "bg-ink"];

export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && fullName) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

// done tasks are faded/dimmed rather than literally blurred — an actual
// CSS blur would make the title unreadable, which defeats the point.
export function calendarChipClasses(status: string): string {
  if (status === "done") {
    return "bg-cream-mid text-ink/40 opacity-60";
  }
  if (status === "doing") {
    return "bg-brand-soft text-brand ring-1 ring-brand-light";
  }
  return "bg-cream-mid text-ink/80";
}
