export type ThemeId = "light" | "dark" | "sepia" | "mint" | "rose";

export interface Theme {
  id: ThemeId;
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
  checked: string;
  header: string;
  headerText: string;
  input: string;
  shadow: string;
  today: string;
  bar: string;
}

export const themes: Record<ThemeId, Theme> = {
  light: {
    id: "light",
    bg: "bg-stone-100",
    card: "bg-white",
    cardAlt: "bg-stone-50",
    text: "text-stone-900",
    textMuted: "text-stone-500",
    border: "border-stone-200",
    accent: "bg-stone-700",
    accentText: "text-white",
    checked: "bg-stone-800",
    header: "bg-stone-800",
    headerText: "text-white",
    input: "bg-white border-stone-300",
    shadow: "shadow-sm",
    today: "bg-amber-100 border-amber-400",
    bar: "bg-stone-700",
  },
  dark: {
    id: "dark",
    bg: "bg-zinc-900",
    card: "bg-zinc-800",
    cardAlt: "bg-zinc-700",
    text: "text-zinc-100",
    textMuted: "text-zinc-400",
    border: "border-zinc-700",
    accent: "bg-indigo-500",
    accentText: "text-white",
    checked: "bg-indigo-500",
    header: "bg-zinc-950",
    headerText: "text-zinc-100",
    input: "bg-zinc-800 border-zinc-600 text-zinc-100",
    shadow: "shadow-black/40",
    today: "bg-indigo-900 border-indigo-400",
    bar: "bg-indigo-500",
  },
  sepia: {
    id: "sepia",
    bg: "bg-amber-50",
    card: "bg-amber-100/60",
    cardAlt: "bg-amber-100",
    text: "text-amber-950",
    textMuted: "text-amber-800/70",
    border: "border-amber-200",
    accent: "bg-amber-700",
    accentText: "text-amber-50",
    checked: "bg-amber-800",
    header: "bg-amber-800",
    headerText: "text-amber-50",
    input: "bg-amber-50 border-amber-300",
    shadow: "shadow-amber-900/10",
    today: "bg-orange-200 border-orange-500",
    bar: "bg-amber-700",
  },
  mint: {
    id: "mint",
    bg: "bg-emerald-50",
    card: "bg-white",
    cardAlt: "bg-emerald-50",
    text: "text-emerald-950",
    textMuted: "text-emerald-700/70",
    border: "border-emerald-200",
    accent: "bg-emerald-600",
    accentText: "text-white",
    checked: "bg-emerald-600",
    header: "bg-emerald-700",
    headerText: "text-white",
    input: "bg-white border-emerald-300",
    shadow: "shadow-emerald-900/10",
    today: "bg-lime-100 border-lime-500",
    bar: "bg-emerald-600",
  },
  rose: {
    id: "rose",
    bg: "bg-rose-50",
    card: "bg-white",
    cardAlt: "bg-rose-50",
    text: "text-rose-950",
    textMuted: "text-rose-700/70",
    border: "border-rose-200",
    accent: "bg-rose-500",
    accentText: "text-white",
    checked: "bg-rose-500",
    header: "bg-rose-600",
    headerText: "text-white",
    input: "bg-white border-rose-300",
    shadow: "shadow-rose-900/10",
    today: "bg-yellow-100 border-yellow-500",
    bar: "bg-rose-500",
  },
};
