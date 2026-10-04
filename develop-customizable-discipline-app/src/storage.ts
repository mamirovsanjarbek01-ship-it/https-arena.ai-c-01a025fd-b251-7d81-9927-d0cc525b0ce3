import type { Lang } from "./i18n";
import type { ThemeId } from "./themes";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  time: string; // HH:MM or ""
  createdAt: number;
  order: number;
}

export interface AppState {
  habits: Habit[];
  checks: Record<string, boolean>; // habitId-dayKey
  lang: Lang;
  theme: ThemeId;
  year: number;
  month: number; // 0-11
  hasSeenIntro: boolean;
  userName: string;
}

const STORAGE_KEY = "discipline-app-v1";

const defaultHabitsEN: Array<Omit<Habit, "id" | "createdAt" | "order">> = [
  { name: "Fajr Prayer", icon: "🕌", time: "05:00" },
  { name: "Quran Reading", icon: "📖", time: "05:30" },
  { name: "Dhikr & Istighfar", icon: "📿", time: "06:00" },
  { name: "Dhuhr Prayer", icon: "🕌", time: "12:30" },
  { name: "Asr Prayer", icon: "🕌", time: "15:30" },
  { name: "Maghrib Prayer", icon: "🕌", time: "18:10" },
  { name: "Isha Prayer", icon: "🕌", time: "20:00" },
  { name: "Morning & Evening Adhkar", icon: "🤲", time: "07:00" },
  { name: "Learn Deen", icon: "📚", time: "21:00" },
  { name: "Charity / Good Deed", icon: "🤝", time: "" },
  { name: "Guard Tongue / No Haram", icon: "🤐", time: "" },
  { name: "Early Sleep for Tahajjud", icon: "🌙", time: "22:00" },
];

const defaultHabitsRU: Array<Omit<Habit, "id" | "createdAt" | "order">> = [
  { name: "Фаджр намаз", icon: "🕌", time: "05:00" },
  { name: "Чтение Корана", icon: "📖", time: "05:30" },
  { name: "Зикр и Истигфар", icon: "📿", time: "06:00" },
  { name: "Зухр намаз", icon: "🕌", time: "12:30" },
  { name: "Аср намаз", icon: "🕌", time: "15:30" },
  { name: "Магриб намаз", icon: "🕌", time: "18:10" },
  { name: "Иша намаз", icon: "🕌", time: "20:00" },
  { name: "Утренние и вечерние азкары", icon: "🤲", time: "07:00" },
  { name: "Изучение религии", icon: "📚", time: "21:00" },
  { name: "Садака / доброе дело", icon: "🤝", time: "" },
  { name: "Контроль языка", icon: "🤐", time: "" },
  { name: "Ранний сон для Тахаджуда", icon: "🌙", time: "22:00" },
];

export const createDefaultState = (lang: Lang): AppState => {
  const now = new Date();
  const templates = lang === "ru" ? defaultHabitsRU : defaultHabitsEN;
  const habits: Habit[] = templates.map((h, i) => ({
    ...h,
    id: `habit-${Date.now()}-${i}`,
    createdAt: Date.now() + i,
    order: i,
  }));
  return {
    habits,
    checks: {},
    lang,
    theme: "mint",
    year: now.getFullYear(),
    month: now.getMonth(),
    hasSeenIntro: false,
    userName: "",
  };
};

export const loadState = (): AppState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.userName) parsed.userName = "";
    // Force mint theme for muslim version if still light
    if (parsed.theme === "light") parsed.theme = "mint";
    return parsed as AppState;
  } catch {
    return null;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

export const dayKey = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const daysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const firstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const formatTime = (time: string, lang: Lang): string => {
  if (!time) return lang === "ru" ? "Без времени" : "No time";
  return time;
};
