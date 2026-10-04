import { useEffect, useMemo, useState } from "react";
import { t, monthKeys, type Lang, type TKey } from "./i18n";
import { themes, type Theme, type ThemeId } from "./themes";
import {
  loadState, saveState, createDefaultState,
  dayKey, daysInMonth, firstDayOfMonth,
  type AppState, type Habit,
} from "./storage";
import { habitIcons } from "./icons";

type View = "main" | "settings" | "addHabit" | "editHabit" | "intro";

function useApp() {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    if (loaded) return loaded;
    return createDefaultState("en");
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  return [state, setState] as const;
}

const App = () => {
  const [state, setState] = useApp();
  const [view, setView] = useState<View>(() => loadState()?.hasSeenIntro ? "main" : "intro");
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const theme: Theme = themes[state.theme];

  const totalDays = daysInMonth(state.year, state.month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === state.year && today.getMonth() === state.month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const monthName = t(state.lang, monthKeys[state.month] as TKey);

  const habitStats = useMemo(() => {
    return state.habits.map(h => {
      let done = 0;
      let possible = totalDays;
      for (let d = 1; d <= totalDays; d++) {
        if (state.checks[dayKey(state.year, state.month, d) + "-" + h.id]) done++;
      }
      return { habit: h, done, possible, pct: totalDays > 0 ? Math.round((done / totalDays) * 100) : 0 };
    }).sort((a, b) => b.pct - a.pct);
  }, [state.habits, state.checks, state.year, state.month, totalDays]);

  const overall = useMemo(() => {
    const total = state.habits.length * totalDays;
    const done = state.habits.length * totalDays > 0
      ? state.habits.reduce((acc, h) => {
          let c = 0;
          for (let d = 1; d <= totalDays; d++) {
            if (state.checks[dayKey(state.year, state.month, d) + "-" + h.id]) c++;
          }
          return acc + c;
        }, 0)
      : 0;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [state.habits, state.checks, state.year, state.month, totalDays]);

  const todayProgress = useMemo(() => {
    if (todayDate < 0) return { done: 0, total: state.habits.length };
    let done = 0;
    state.habits.forEach(h => {
      if (state.checks[dayKey(state.year, state.month, todayDate) + "-" + h.id]) done++;
    });
    return { done, total: state.habits.length };
  }, [state.habits, state.checks, state.year, state.month, todayDate]);

  const dailyProgress = useMemo(() => {
    // show last 14 days
    const result: Array<{ day: number; pct: number }> = [];
    const days = Math.min(totalDays, 14);
    const startDay = Math.max(1, totalDays - days + 1);
    for (let d = startDay; d <= totalDays; d++) {
      let done = 0;
      state.habits.forEach(h => {
        if (state.checks[dayKey(state.year, state.month, d) + "-" + h.id]) done++;
      });
      const pct = state.habits.length > 0 ? Math.round((done / state.habits.length) * 100) : 0;
      result.push({ day: d, pct });
    }
    return result;
  }, [state.habits, state.checks, state.year, state.month, totalDays]);

  const weeklyProgress = useMemo(() => {
    const weeks: Array<{ label: string; pct: number; start: number; end: number }> = [];
    let weekStart = 1;
    let weekNum = 1;
    while (weekStart <= totalDays) {
      const weekEnd = Math.min(weekStart + 6, totalDays);
      let done = 0;
      let possible = 0;
      for (let d = weekStart; d <= weekEnd; d++) {
        state.habits.forEach(h => {
          possible++;
          if (state.checks[dayKey(state.year, state.month, d) + "-" + h.id]) done++;
        });
      }
      const pct = possible > 0 ? Math.round((done / possible) * 100) : 0;
      weeks.push({ label: t(state.lang, "weekly") + " " + weekNum, pct, start: weekStart, end: weekEnd });
      weekStart = weekEnd + 1;
      weekNum++;
    }
    return weeks;
  }, [state.habits, state.checks, state.year, state.month, totalDays, state.lang]);

  const motivation = useMemo(() => {
    const quotes = ["motivationalQuote", "motivationalQuote2", "motivationalQuote3", "motivationalQuote4"] as TKey[];
    const dayIdx = new Date(state.year, state.month, 1).getDate() % quotes.length;
    return t(state.lang, quotes[dayIdx]);
  }, [state.year, state.month, state.lang]);

  const toggleCheck = (day: number, habitId: string) => {
    const k = dayKey(state.year, state.month, day) + "-" + habitId;
    setState(s => ({ ...s, checks: { ...s.checks, [k]: !s.checks[k] } }));
  };

  const updateHabit = (h: Habit) => {
    setState(s => ({
      ...s,
      habits: s.habits.map(x => x.id === h.id ? h : x)
    }));
  };

  const addHabit = (h: Omit<Habit, "id" | "createdAt" | "order">) => {
    setState(s => ({
      ...s,
      habits: [...s.habits, { ...h, id: `habit-${Date.now()}`, createdAt: Date.now(), order: s.habits.length }]
    }));
  };

  const deleteHabit = (id: string) => {
    setState(s => ({ ...s, habits: s.habits.filter(h => h.id !== id) }));
  };

  const changeMonth = (delta: number) => {
    setState(s => {
      let m = s.month + delta;
      let y = s.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { ...s, month: m, year: y };
    });
  };

  const resetMonth = () => {
    setState(s => {
      const newChecks = { ...s.checks };
      Object.keys(newChecks).forEach(k => {
        const [y, m] = k.split("-");
        if (parseInt(y) === s.year && parseInt(m) === s.month + 1) {
          delete newChecks[k];
        }
      });
      return { ...s, checks: newChecks };
    });
    setConfirmReset(false);
  };

  if (view === "intro") {
    return <IntroView
      lang={state.lang}
      theme={theme}
      onContinue={(lang, userName) => {
        setState(s => ({ ...s, lang, hasSeenIntro: true, userName }));
        setView("main");
      }}
    />;
  }

  if (view === "settings") {
    return <SettingsView
      state={state}
      setState={setState}
      theme={theme}
      onClose={() => setView("main")}
      onReset={() => setConfirmReset(true)}
    />;
  }

  if (view === "addHabit" || view === "editHabit") {
    return <HabitFormView
      lang={state.lang}
      theme={theme}
      initial={view === "editHabit" ? editingHabit : null}
      onSave={(h) => {
        if (view === "editHabit" && editingHabit) {
          updateHabit({ ...editingHabit, ...h });
        } else {
          addHabit(h);
        }
        setView("main");
        setEditingHabit(null);
      }}
      onCancel={() => { setView("main"); setEditingHabit(null); }}
      onDelete={view === "editHabit" && editingHabit ? () => {
        deleteHabit(editingHabit.id);
        setView("main");
        setEditingHabit(null);
      } : undefined}
    />;
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} pb-24`}>
      <ConfirmDialog
        open={confirmReset}
        theme={theme}
        lang={state.lang}
        onConfirm={resetMonth}
        onCancel={() => setConfirmReset(false)}
      />

      <Header
        title={t(state.lang, "appName")}
        subtitle={`${monthName} ${state.year}`}
        userName={state.userName}
        lang={state.lang}
        theme={theme}
        onSettings={() => setView("settings")}
        onPrev={() => changeMonth(-1)}
        onNext={() => changeMonth(1)}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-3 space-y-3">
        <HeroQuote theme={theme} quote={t(state.lang, "tagline")} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatsCard theme={theme}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme.textMuted}`}>
                {t(state.lang, "overall")}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <DonutChart percent={overall.pct} theme={theme} />
              <div className="flex-1 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className={theme.textMuted}>{t(state.lang, "goal")}</span>
                  <span className="font-semibold">{overall.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme.textMuted}>{t(state.lang, "completed")}</span>
                  <span className="font-semibold">{overall.done}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme.textMuted}>{t(state.lang, "left")}</span>
                  <span className="font-semibold">{overall.total - overall.done}</span>
                </div>
              </div>
            </div>
          </StatsCard>

          <StatsCard theme={theme}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme.textMuted}`}>
                {t(state.lang, "today")}
              </h3>
              <span className={`text-xs ${theme.textMuted}`}>
                {todayDate > 0 ? `${todayDate} ${monthName}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-full border-4 ${theme.border} flex items-center justify-center`}>
                <div className="text-center">
                  <div className="text-xl font-bold">{todayProgress.done}</div>
                  <div className={`text-[10px] ${theme.textMuted}`}>/{todayProgress.total}</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold mb-1">
                  {todayProgress.done} {t(state.lang, "completedToday")}
                </div>
                <div className={`text-xs ${theme.textMuted}`}>{motivation}</div>
              </div>
            </div>
          </StatsCard>
        </div>

        <CalendarCard
          state={state}
          theme={theme}
          totalDays={totalDays}
          todayDate={todayDate}
        />

        <ChartCard title={t(state.lang, "weekly")} theme={theme}>
          <div className="flex items-end gap-1 h-24">
            {weeklyProgress.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end h-20">
                  <div
                    className={`w-full ${theme.bar} rounded-t transition-all`}
                    style={{ height: `${Math.max(2, w.pct)}%` }}
                  />
                </div>
                <div className={`text-[9px] ${theme.textMuted}`}>{i + 1}</div>
              </div>
            ))}
            {weeklyProgress.length === 0 && <div className={`text-xs ${theme.textMuted}`}>—</div>}
          </div>
        </ChartCard>

        <ChartCard title={t(state.lang, "daily")} theme={theme}>
          <div className="flex items-end gap-1 h-24">
            {dailyProgress.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end h-20">
                  <div
                    className={`w-full ${theme.bar} rounded-t transition-all opacity-80`}
                    style={{ height: `${Math.max(2, d.pct)}%` }}
                  />
                </div>
                <div className={`text-[9px] ${theme.textMuted}`}>{d.day}</div>
              </div>
            ))}
            {dailyProgress.length === 0 && <div className={`text-xs ${theme.textMuted}`}>—</div>}
          </div>
        </ChartCard>

        <AnalysisCard habitStats={habitStats} theme={theme} lang={state.lang} />

        <TopHabitsCard habitStats={habitStats} theme={theme} lang={state.lang} />

        <HabitsListCard
          state={state}
          theme={theme}
          totalDays={totalDays}
          todayDate={todayDate}
          onToggle={toggleCheck}
          onEdit={(h) => { setEditingHabit(h); setView("editHabit"); }}
        />
      </div>

      <FAB
        onClick={() => setView("addHabit")}
        theme={theme}
        label={t(state.lang, "addHabit")}
      />
    </div>
  );
};

export default App;

// ============= Subcomponents =============

const Header = ({ title, subtitle, userName, lang, theme, onSettings, onPrev, onNext }: {
  title: string; subtitle: string; userName: string; lang: Lang; theme: Theme;
  onSettings: () => void; onPrev: () => void; onNext: () => void;
}) => (
  <div className={`${theme.header} ${theme.headerText} sticky top-0 z-30`}>
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2">
      <button
        onClick={onPrev}
        className="p-2 rounded-lg hover:bg-white/10 transition"
        aria-label="Previous month"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold truncate">{title}</span>
          <span className="text-[10px] opacity-60 hidden sm:inline">freedailyroutine.com</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs opacity-80">
          <span>{subtitle}</span>
          {userName && (
            <>
              <span className="opacity-40">·</span>
              <span>{t(lang, "hello")}, <span className="font-semibold">{userName}</span> 👋</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onNext}
        className="p-2 rounded-lg hover:bg-white/10 transition"
        aria-label="Next month"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <button
        onClick={onSettings}
        className="p-2 rounded-lg hover:bg-white/10 transition"
        aria-label="Settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  </div>
);

const HeroQuote = ({ quote, theme }: { quote: string; theme: Theme }) => (
  <div className={`${theme.card} ${theme.shadow} rounded-xl p-4 text-center border ${theme.border} relative overflow-hidden`}>
    <div className={`text-[10px] tracking-widest ${theme.textMuted} mb-1`}>بِسْمِ اللهِ • BISMILLAH</div>
    <div className="text-base sm:text-lg font-semibold">"{quote}"</div>
    <div className="text-xl mt-1">🕌</div>
  </div>
);

const StatsCard = ({ theme, children }: { theme: Theme; children: React.ReactNode }) => (
  <div className={`${theme.card} ${theme.shadow} rounded-xl p-4 border ${theme.border}`}>
    {children}
  </div>
);

const DonutChart = ({ percent, theme }: { percent: number; theme: Theme }) => {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" className="stroke-current opacity-20" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          className={`${theme.bar.replace("bg-", "stroke-")}`}
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-bold leading-none">{percent}%</div>
        <div className={`text-[9px] ${theme.textMuted} leading-none mt-0.5`}>DONE</div>
      </div>
    </div>
  );
};

const CalendarCard = ({ state, theme, totalDays, todayDate }: {
  state: AppState; theme: Theme; totalDays: number; todayDate: number;
}) => {
  const firstDay = firstDayOfMonth(state.year, state.month);
  // convert Sunday=0 to Monday=0 (for european style)
  const offset = (firstDay + 6) % 7;
  const dayLabels = ["mo", "tu", "we", "th", "fr", "sa", "su"] as TKey[];

  return (
    <div className={`${theme.card} ${theme.shadow} rounded-xl p-3 sm:p-4 border ${theme.border} overflow-hidden`}>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayLabels.map(dk => (
          <div key={dk} className={`text-center text-[10px] sm:text-xs font-semibold ${theme.textMuted} uppercase`}>
            {t(state.lang, dk)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={"empty-" + i} />
        ))}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          // Calculate completion for the day
          let done = 0;
          state.habits.forEach(h => {
            if (state.checks[dayKey(state.year, state.month, day) + "-" + h.id]) done++;
          });
          const pct = state.habits.length > 0 ? done / state.habits.length : 0;
          const isToday = day === todayDate;
          // Use opacity classes only for partial, else use solid color
          const finalBg = pct === 1
            ? theme.checked + " text-white"
            : pct > 0.5
              ? theme.checked + " text-white opacity-90"
              : pct > 0
                ? theme.bar + " text-white opacity-70"
                : theme.cardAlt;
          return (
            <button
              key={day}
              className={`aspect-square rounded-md flex items-center justify-center text-xs sm:text-sm font-semibold transition border ${
                isToday ? "ring-2 ring-amber-400 " : ""
              } ${finalBg} ${theme.border}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ChartCard = ({ title, theme, children }: { title: string; theme: Theme; children: React.ReactNode }) => (
  <div className={`${theme.card} ${theme.shadow} rounded-xl p-4 border ${theme.border}`}>
    <h3 className={`text-sm font-bold uppercase tracking-wider ${theme.textMuted} mb-3`}>{title}</h3>
    {children}
  </div>
);

const AnalysisCard = ({ habitStats, theme, lang }: {
  habitStats: Array<{ habit: Habit; done: number; possible: number; pct: number }>;
  theme: Theme; lang: Lang;
}) => {
  const top = habitStats.slice(0, 8);
  return (
    <div className={`${theme.card} ${theme.shadow} rounded-xl p-4 border ${theme.border}`}>
      <h3 className={`text-sm font-bold uppercase tracking-wider ${theme.textMuted} mb-3`}>
        {t(lang, "analysis")}
      </h3>
      <div className="overflow-x-auto -mx-1">
        <div className="min-w-[360px] px-1">
          <div className={`grid grid-cols-12 text-[10px] font-semibold ${theme.textMuted} uppercase pb-2 border-b ${theme.border}`}>
            <div className="col-span-6">{t(lang, "habit")}</div>
            <div className="col-span-2 text-center">{t(lang, "goal")}</div>
            <div className="col-span-2 text-center">{t(lang, "actual")}</div>
            <div className="col-span-2 text-right">{t(lang, "progress")}</div>
          </div>
          {top.map(({ habit, possible, done, pct }) => (
            <div key={habit.id} className={`grid grid-cols-12 items-center text-xs py-2 border-b ${theme.border} last:border-b-0`}>
              <div className="col-span-6 flex items-center gap-2 truncate">
                <span className="text-base">{habit.icon}</span>
                <span className="truncate">{habit.name}</span>
              </div>
              <div className="col-span-2 text-center">{possible}</div>
              <div className="col-span-2 text-center">{done}</div>
              <div className="col-span-2 flex items-center gap-1 justify-end">
                <div className={`flex-1 h-1.5 rounded-full ${theme.cardAlt} overflow-hidden`}>
                  <div className={`h-full ${theme.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-semibold w-8 text-right">{pct}%</span>
              </div>
            </div>
          ))}
          {top.length === 0 && <div className={`text-xs ${theme.textMuted} py-2`}>—</div>}
        </div>
      </div>
    </div>
  );
};

const TopHabitsCard = ({ habitStats, theme, lang }: {
  habitStats: Array<{ habit: Habit; done: number; pct: number }>;
  theme: Theme; lang: Lang;
}) => {
  const top = habitStats.slice(0, 10);
  return (
    <div className={`${theme.card} ${theme.shadow} rounded-xl p-4 border ${theme.border}`}>
      <h3 className={`text-sm font-bold uppercase tracking-wider ${theme.textMuted} mb-3`}>
        {t(lang, "topHabits")}
      </h3>
      <ol className="space-y-1.5">
        {top.map((s, i) => (
          <li key={s.habit.id} className="flex items-center gap-2 text-sm">
            <span className={`w-5 text-right ${theme.textMuted} text-xs font-mono`}>{i + 1}.</span>
            <span className="text-base">{s.habit.icon}</span>
            <span className="flex-1 truncate">{s.habit.name}</span>
            <span className={`text-xs ${theme.textMuted}`}>{s.pct}%</span>
          </li>
        ))}
        {top.length === 0 && <div className={`text-xs ${theme.textMuted}`}>—</div>}
      </ol>
    </div>
  );
};

const HabitsListCard = ({ state, theme, totalDays, todayDate, onToggle, onEdit }: {
  state: AppState; theme: Theme; totalDays: number; todayDate: number;
  onToggle: (day: number, habitId: string) => void;
  onEdit: (h: Habit) => void;
}) => {
  const sorted = [...state.habits].sort((a, b) => a.order - b.order);
  // Show day numbers in 5-week blocks (rows of 7), like Excel
  const firstDay = firstDayOfMonth(state.year, state.month);
  const offset = (firstDay + 6) % 7; // Monday-first offset
  const rows: Array<Array<number | null>> = [];
  let cells: Array<number | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d);
    if (cells.length === 7) {
      rows.push(cells);
      cells = [];
    }
  }
  if (cells.length > 0) {
    while (cells.length < 7) cells.push(null);
    rows.push(cells);
  }
  const dayLabels = ["mo", "tu", "we", "th", "fr", "sa", "su"] as TKey[];

  return (
    <div className={`${theme.card} ${theme.shadow} rounded-xl p-3 sm:p-4 border ${theme.border}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${theme.textMuted}`}>
          {t(state.lang, "habits")}
        </h3>
        <span className={`text-xs ${theme.textMuted}`}>{sorted.length}</span>
      </div>

      {/* Excel-style table: scrollable horizontally on small screens */}
      <div className="overflow-x-auto -mx-1 pb-2">
        <div className="inline-block min-w-full align-middle px-1">
          {/* Header row: empty cell + day numbers */}
          <div className="flex">
            <div className={`shrink-0 w-32 sm:w-44 ${theme.textMuted} text-[10px] font-semibold uppercase flex items-end pb-1 pr-2`}>
              {t(state.lang, "habit")}
            </div>
            <div className="flex-1 grid grid-cols-7 gap-px">
              {dayLabels.map(dk => (
                <div key={dk} className={`text-center text-[9px] font-semibold ${theme.textMuted} uppercase pb-1`}>
                  {t(state.lang, dk)}
                </div>
              ))}
            </div>
          </div>

          {/* One row per habit, with 5 weekly sub-rows of checkboxes */}
          {sorted.map(h => {
            let done = 0;
            for (let d = 1; d <= totalDays; d++) {
              if (state.checks[dayKey(state.year, state.month, d) + "-" + h.id]) done++;
            }
            return (
              <div key={h.id} className={`${theme.cardAlt} border ${theme.border} rounded-md mb-1`}>
                <div className="flex items-center gap-2 p-2 border-b ${theme.border}">
                  <button
                    onClick={() => onEdit(h)}
                    className={`shrink-0 w-8 h-8 rounded ${theme.card} ${theme.border} border flex items-center justify-center text-lg`}
                    aria-label="Edit habit"
                  >
                    {h.icon}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-2">
                      {h.name}
                      {h.time && <span className={`text-[10px] ${theme.textMuted}`}>⏰ {h.time}</span>}
                    </div>
                    <div className={`text-[10px] ${theme.textMuted}`}>
                      {done}/{totalDays} • {Math.round((done / totalDays) * 100) || 0}%
                    </div>
                  </div>
                </div>

                {/* Week rows: each week is a row of 7 day checkboxes */}
                <div className="p-1.5 space-y-1">
                  {rows.map((row, ri) => (
                    <div key={ri} className="flex items-center gap-1">
                      <div className={`shrink-0 w-10 text-[9px] ${theme.textMuted} font-semibold`}>
                        W{ri + 1}
                      </div>
                      <div className="grid grid-cols-7 gap-1 flex-1">
                        {row.map((d, ci) => {
                          if (d === null) {
                            return <div key={ci} className="h-7" />;
                          }
                          const checked = !!state.checks[dayKey(state.year, state.month, d) + "-" + h.id];
                          const isToday = d === todayDate;
                          return (
                            <button
                              key={ci}
                              onClick={() => onToggle(d, h.id)}
                              title={`Day ${d}`}
                              className={`h-7 sm:h-8 rounded border-2 transition flex items-center justify-center text-[10px] font-bold ${
                                checked
                                  ? `${theme.checked} text-white border-transparent`
                                  : `${theme.card} ${theme.border}`
                              } ${isToday ? "ring-2 ring-amber-400" : ""}`}
                            >
                              {checked ? "✓" : d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className={`text-center py-6 text-sm ${theme.textMuted}`}>
              {t(state.lang, "noHabits")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FAB = ({ onClick, theme, label }: { onClick: () => void; theme: Theme; label: string }) => (
  <button
    onClick={onClick}
    className={`fixed bottom-5 right-5 z-40 ${theme.accent} ${theme.accentText} rounded-full px-5 py-3 font-semibold shadow-lg hover:opacity-90 active:scale-95 transition`}
  >
    <span className="flex items-center gap-2">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </span>
  </button>
);

const ConfirmDialog = ({ open, theme, lang, onConfirm, onCancel }: {
  open: boolean; theme: Theme; lang: Lang; onConfirm: () => void; onCancel: () => void;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`${theme.card} rounded-xl p-5 max-w-sm w-full border ${theme.border} shadow-xl`}>
        <p className="text-sm mb-4">{t(lang, "areYouSure")}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className={`px-4 py-2 rounded-lg text-sm ${theme.cardAlt} ${theme.border} border`}>
            {t(lang, "no")}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm ${theme.accent} ${theme.accentText}`}>
            {t(lang, "yes")}
          </button>
        </div>
      </div>
    </div>
  );
};

const IntroView = ({ lang: initialLang, theme, onContinue }: {
  lang: Lang; theme: Theme; onContinue: (lang: Lang, userName: string) => void;
}) => {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [name, setName] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
      <div className={`${theme.card} rounded-2xl p-6 sm:p-8 max-w-md w-full text-center border ${theme.border} shadow-xl`}>
        {/* Logo */}
        <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl ${theme.accent} flex items-center justify-center text-3xl`}>
          🕌
        </div>
        <div className={`text-[11px] tracking-[0.2em] ${theme.textMuted} mb-1 font-semibold`}>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">freedailyroutine</h1>
        <p className={`text-xs ${theme.textMuted} mb-5`}>muslim daily routine • {lang === "ru" ? "для мусульман" : "for muslims"}</p>

        {step === 1 && (
          <>
            <p className={`text-sm ${theme.textMuted} mb-6`}>
              {lang === "ru"
                ? "Отслеживай 5 намазов, Коран, зикр и держи дисциплину ради Аллаха. 🕌"
                : "Track your 5 prayers, Quran, Dhikr and keep discipline for the sake of Allah. 🕌"}
            </p>

            {/* Language chooser */}
            <div className="mb-5">
              <div className={`text-xs ${theme.textMuted} mb-2 uppercase tracking-wider font-semibold`}>
                {lang === "ru" ? "Выберите язык" : "Choose language"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLang("en")}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                    lang === "en" ? `${theme.accent} ${theme.accentText} border-transparent` : `${theme.cardAlt} ${theme.border}`
                  }`}
                >🇬🇧 English</button>
                <button
                  onClick={() => setLang("ru")}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                    lang === "ru" ? `${theme.accent} ${theme.accentText} border-transparent` : `${theme.cardAlt} ${theme.border}`
                  }`}
                >🇷🇺 Русский</button>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className={`w-full ${theme.accent} ${theme.accentText} py-3 rounded-xl font-semibold text-sm`}
            >
              {lang === "ru" ? "Далее →" : "Next →"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className={`text-sm ${theme.textMuted} mb-6`}>
              {lang === "ru" ? "Как вас зовут?" : "What's your name?"}
            </p>

            {/* Name input */}
            <div className="mb-5 text-left">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${theme.textMuted} mb-2`}>
                {lang === "ru" ? "Ваше имя" : "Your name"}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onContinue(lang, name.trim())}
                placeholder={lang === "ru" ? "напр. Алекс" : "e.g. Alex"}
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium focus:outline-none transition ${theme.input} ${theme.border} focus:ring-2 focus:ring-offset-1`}
              />
              <p className={`text-[11px] ${theme.textMuted} mt-1.5`}>
                {lang === "ru" ? "Можно пропустить — нажмите «Начать»" : "Optional — you can skip this"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 ${theme.cardAlt} ${theme.border}`}
              >
                ← {lang === "ru" ? "Назад" : "Back"}
              </button>
              <button
                onClick={() => onContinue(lang, name.trim())}
                className={`flex-1 ${theme.accent} ${theme.accentText} py-3 rounded-xl font-semibold text-sm`}
              >
                {lang === "ru" ? "Начать 🚀" : "Get started 🚀"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SettingsView = ({ state, setState, theme, onClose, onReset }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>;
  theme: Theme; onClose: () => void; onReset: () => void;
}) => {
  const monthName = t(state.lang, monthKeys[state.month] as TKey);
  const themeList: { id: ThemeId; key: TKey }[] = [
    { id: "light", key: "themeLight" },
    { id: "dark", key: "themeDark" },
    { id: "sepia", key: "themeSepia" },
    { id: "mint", key: "themeMint" },
    { id: "rose", key: "themeRose" },
  ];

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className={`${theme.header} ${theme.headerText} sticky top-0 z-30`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 text-lg font-bold">{t(state.lang, "settings")}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-3">

        {/* Profile / Name */}
        <Section theme={theme} title={t(state.lang, "profile")}>
          <label className={`block text-xs font-semibold uppercase tracking-wider ${theme.textMuted} mb-2`}>
            {t(state.lang, "yourName")}
          </label>
          <input
            type="text"
            value={state.userName}
            onChange={e => setState(s => ({ ...s, userName: e.target.value }))}
            placeholder={t(state.lang, "namePlaceholder")}
            className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm font-medium focus:outline-none transition ${theme.input} ${theme.border}`}
          />
          {state.userName && (
            <p className={`text-xs ${theme.textMuted} mt-1.5`}>
              👋 {t(state.lang, "hello")}, <span className="font-semibold">{state.userName}</span>!
            </p>
          )}
        </Section>

        <Section theme={theme} title={t(state.lang, "language")}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setState(s => ({ ...s, lang: "en" }))}
              className={`py-2 rounded-lg text-sm font-semibold border transition ${
                state.lang === "en" ? `${theme.accent} ${theme.accentText}` : `${theme.cardAlt} ${theme.border}`
              }`}
            >English</button>
            <button
              onClick={() => setState(s => ({ ...s, lang: "ru" }))}
              className={`py-2 rounded-lg text-sm font-semibold border transition ${
                state.lang === "ru" ? `${theme.accent} ${theme.accentText}` : `${theme.cardAlt} ${theme.border}`
              }`}
            >Русский</button>
          </div>
        </Section>

        <Section theme={theme} title={t(state.lang, "theme")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {themeList.map(tt => (
              <button
                key={tt.id}
                onClick={() => setState(s => ({ ...s, theme: tt.id }))}
                className={`py-2 rounded-lg text-sm font-semibold border transition ${
                  state.theme === tt.id ? `${theme.accent} ${theme.accentText}` : `${theme.cardAlt} ${theme.border}`
                }`}
              >
                {t(state.lang, tt.key)}
              </button>
            ))}
          </div>
        </Section>

        <Section theme={theme} title={`${t(state.lang, "year")} / ${t(state.lang, "month")}`}>
          <div className="flex items-center gap-2">
            <select
              value={state.year}
              onChange={e => setState(s => ({ ...s, year: parseInt(e.target.value) }))}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${theme.input}`}
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <select
              value={state.month}
              onChange={e => setState(s => ({ ...s, month: parseInt(e.target.value) }))}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${theme.input}`}
            >
              {monthKeys.map((mk, i) => (
                <option key={mk} value={i}>{t(state.lang, mk)}</option>
              ))}
            </select>
          </div>
          <div className={`mt-2 text-xs ${theme.textMuted}`}>
            {monthName} {state.year}
          </div>
        </Section>

        <Section theme={theme} title={t(state.lang, "reset")}>
          <button
            onClick={onReset}
            className={`w-full py-2 rounded-lg text-sm font-semibold border border-red-300 bg-red-50 text-red-700`}
          >
            {t(state.lang, "resetMonth")}
          </button>
        </Section>

        <div className={`text-center text-xs ${theme.textMuted} pt-2`}>
          {t(state.lang, "appName")} © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

const Section = ({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) => (
  <div className={`${theme.card} rounded-xl p-4 border ${theme.border}`}>
    <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} mb-3`}>{title}</h3>
    {children}
  </div>
);

const HabitFormView = ({ lang, theme, initial, onSave, onCancel, onDelete }: {
  lang: Lang; theme: Theme; initial: Habit | null;
  onSave: (h: Omit<Habit, "id" | "createdAt" | "order">) => void;
  onCancel: () => void; onDelete?: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "⭐");
  const [time, setTime] = useState(initial?.time ?? "");
  const [showIconPicker, setShowIconPicker] = useState(false);

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className={`${theme.header} ${theme.headerText} sticky top-0 z-30`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 text-lg font-bold">
            {initial ? t(lang, "edit") : t(lang, "addHabit")}
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-2 rounded-lg hover:bg-white/10 text-red-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-3">
        <div className={`${theme.card} rounded-xl p-4 border ${theme.border} space-y-3`}>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider ${theme.textMuted} mb-1`}>
              {t(lang, "habitName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t(lang, "habitName")}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.input}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider ${theme.textMuted} mb-1`}>
              {t(lang, "icon")}
            </label>
            <button
              onClick={() => setShowIconPicker(s => !s)}
              className={`w-16 h-16 rounded-xl border-2 ${theme.border} ${theme.cardAlt} flex items-center justify-center text-3xl`}
            >
              {icon}
            </button>
            {showIconPicker && (
              <div className={`mt-2 p-2 rounded-lg border ${theme.border} ${theme.cardAlt} grid grid-cols-8 gap-1`}>
                {habitIcons.map(i => (
                  <button
                    key={i}
                    onClick={() => { setIcon(i); setShowIconPicker(false); }}
                    className={`aspect-square rounded text-xl flex items-center justify-center ${
                      icon === i ? theme.accent + " " + theme.accentText : ""
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider ${theme.textMuted} mb-1`}>
              {t(lang, "time")}
            </label>
            <div className="flex gap-2">
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${theme.input}`}
              />
              {time && (
                <button
                  onClick={() => setTime("")}
                  className={`px-3 py-2 rounded-lg border text-xs ${theme.cardAlt} ${theme.border}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border ${theme.cardAlt} ${theme.border}`}
          >
            {t(lang, "cancel")}
          </button>
          <button
            onClick={() => name.trim() && onSave({ name: name.trim(), icon, time })}
            disabled={!name.trim()}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${theme.accent} ${theme.accentText} disabled:opacity-40`}
          >
            {t(lang, "save")}
          </button>
        </div>
      </div>
    </div>
  );
};
