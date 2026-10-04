export const habitIcons = [
  "🕌", "📖", "📿", "🤲", "🌙", "⭐", "☪️", "🤝",
  "📚", "🤐", "😴", "⏰", "💧", "🧎", "🕋", "✨",
  "❤️", "🌱", "🔥", "💪", "🚿", "💼", "🎯", "🍎",
  "🏃", "💧", "☀️", "🧹", "🛏️", "📝", "🎓", "🗣️",
  "🌿", "🍵", "🥗", "🧠", "🕊️", "💎", "🌟", "🙏",
  "📜", "🕌", "📿", "🤲", "🌙", "☪️", "🕋", "📖",
];

export const HabitIcon = ({ icon, className = "" }: { icon: string; className?: string }) => {
  return <span className={className}>{icon}</span>;
};
