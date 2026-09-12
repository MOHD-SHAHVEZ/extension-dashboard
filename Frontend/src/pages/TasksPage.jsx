// src/pages/TasksPage.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import AppLayout from "../layouts/AppLayout";
import { getTaskHistory, createTask, updateTask, deleteTask, deleteCompletedTasks } from "../services/api";
import { useToast } from "../context/ToastContext";

const PRIORITY_STYLES = {
  High: { bg: "bg-orange-100", text: "text-orange-700", icon: "🔥" },
  Medium: { bg: "bg-slate-200", text: "text-slate-600", icon: "⚡" },
  Low: { bg: "bg-slate-100", text: "text-slate-400", icon: "🌱" },
  Done: { bg: "bg-teal-100", text: "text-teal-700", icon: "✅" },
};

const TAGS = ["Interview Prep", "AI Research", "Projects", "Daily", "Learning", "Health"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseYearMonth(value) {
  const [y, m] = value.split("-").map(Number);
  return { year: y, month: m };
}

function formatDayLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function TasksPage() {
  const toast = useToast();
  const now = new Date();
  const [monthValue, setMonthValue] = useState(() => toYearMonth(now));
  const [weekday, setWeekday] = useState("all");
  const [history, setHistory] = useState({ tasks: [], days: [], total: 0, completed: 0, remaining: 0, from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [tag, setTag] = useState("Interview Prep");
  const [timeEst, setTimeEst] = useState("30m");
  const [taskDate, setTaskDate] = useState(() => now.toISOString().slice(0, 10));
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState("list");
  const [adding, setAdding] = useState(false);
  const titleInputRef = useRef(null);

  const { year, month } = parseYearMonth(monthValue);
  const tasks = history.tasks || [];

  const refresh = useCallback(async () => {
    const data = await getTaskHistory({
      year,
      month,
      day: weekday === "all" ? undefined : weekday,
    });
    setHistory({
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      days: Array.isArray(data?.days) ? data.days : [],
      total: data?.total || 0,
      completed: data?.completed || 0,
      remaining: data?.remaining || 0,
      from: data?.from || "",
      to: data?.to || "",
    });
  }, [year, month, weekday]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => {
        console.error(err);
        toast.push(err?.message || "Failed to load tasks", { type: "error" });
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const toggleTask = useCallback(async (id) => {
    const current = tasks.find(t => t.id === id);
    if (!current) return;
    const nextDone = !current.done;
    setHistory(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, done: nextDone } : t),
    }));
    try {
      await updateTask(id, { done: nextDone });
      await refresh();
    } catch (err) {
      console.error(err);
      await refresh();
      toast.push(err?.message || "Could not update task", { type: "error" });
    }
  }, [tasks, refresh, toast]);

  const removeTask = useCallback(async (id) => {
    const snapshot = history;
    setHistory(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
    try {
      await deleteTask(id);
      await refresh();
    } catch (err) {
      console.error(err);
      setHistory(snapshot);
      toast.push(err?.message || "Could not delete task", { type: "error" });
    }
  }, [history, refresh, toast]);

  const addTask = useCallback(async () => {
    const title = newText.trim();
    if (!title) {
      toast.push("Type a task title first", { type: "error" });
      titleInputRef.current?.focus();
      return;
    }
    if (adding) return;
    setAdding(true);
    try {
      await createTask({
        title,
        tag,
        time: timeEst,
        priority,
        done: false,
        taskDate,
      });
      setNewText("");
      toast.push("Task added", { type: "success" });
      await refresh();
      titleInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      toast.push(err?.message || "Could not add task", { type: "error" });
    } finally {
      setAdding(false);
    }
  }, [newText, priority, tag, timeEst, taskDate, refresh, toast, adding]);

  const clearCompleted = async () => {
    try {
      await deleteCompletedTasks({ from: history.from, to: history.to });
      await refresh();
    } catch (err) {
      console.error(err);
      toast.push(err?.message || "Could not clear completed tasks", { type: "error" });
    }
  };

  const shiftMonth = (delta) => {
    const next = new Date(year, month - 1 + delta, 1);
    setMonthValue(toYearMonth(next));
  };

  const goThisMonth = () => setMonthValue(toYearMonth(new Date()));

  const pct = history.total === 0 ? 0 : Math.round((history.completed / history.total) * 100);
  const allTags = ["All", ...new Set(tasks.map(t => t.tag).filter(Boolean))];
  const filteredTasks = activeFilter === "All" ? tasks : tasks.filter(t => t.tag === activeFilter);
  const pendingTasks = filteredTasks.filter(t => !t.done);
  const completedTasks = filteredTasks.filter(t => t.done);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const grouped = useMemo(() => {
    const map = new Map();
    filteredTasks.forEach((task) => {
      const key = task.effectiveDate || task.taskDate || task.syncDate || "undated";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    return Array.from(map.entries()).sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  }, [filteredTasks]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <span className="material-symbols-outlined text-white text-[20px] sm:text-[22px]">checklist</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">Tasks</h1>
              <p className="hidden sm:block text-[13px] text-slate-500">Look back at any day or month — completed and leftover tasks stay saved</p>
            </div>
          </div>
          <div className="flex items-center bg-slate-100 rounded-full p-0.5 shrink-0">
            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${viewMode === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              List
            </button>
            <button onClick={() => setViewMode("board")} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${viewMode === "board" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              Board
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-5 rounded-2xl bg-white shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <p className="flex-1 text-center text-[13px] font-semibold text-slate-800 truncate">{monthLabel}</p>
            <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button onClick={goThisMonth} className="h-8 px-2.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold shrink-0">
              Today
            </button>
            {completedTasks.length > 0 && (
              <button onClick={clearCompleted} className="hidden sm:inline-flex h-8 px-3 rounded-lg bg-red-50 text-red-500 text-[11px] font-semibold">
                Clear done
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button onClick={() => setWeekday("all")} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${weekday === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
              All
            </button>
            {WEEKDAYS.map((d) => (
              <button key={d} onClick={() => setWeekday(d)} className={`w-9 py-1 rounded-lg text-[11px] font-semibold ${weekday === d ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {d.slice(0, 1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">{history.completed}/{history.total || 0}</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
          className="p-3 sm:p-5 rounded-2xl bg-white shadow-sm flex flex-col gap-3"
        >
          <input
            ref={titleInputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a new task…"
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {["High", "Medium", "Low"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold ${
                  priority === p ? `${PRIORITY_STYLES[p].bg} ${PRIORITY_STYLES[p].text}` : "bg-slate-50 text-slate-400"
                }`}
              >
                {PRIORITY_STYLES[p].icon} {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold ${
                  tag === t ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              className="h-9 flex-1 min-w-0 px-2 rounded-lg bg-slate-50 text-slate-700 text-[12px] font-semibold outline-none"
            />
            <input
              value={timeEst}
              onChange={(e) => setTimeEst(e.target.value)}
              placeholder="30m"
              className="h-9 w-16 px-2 rounded-lg bg-slate-50 text-slate-700 text-[12px] font-semibold outline-none text-center"
            />
            <button
              type="submit"
              disabled={adding}
              className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold disabled:opacity-60 shrink-0"
            >
              {adding ? "…" : "Add"}
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {allTags.map(t => (
            <button key={t} onClick={() => setActiveFilter(t)} className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${activeFilter === t ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 shadow-sm"}`}>
              {t}{t === "All" ? ` (${tasks.length})` : ` (${tasks.filter(x => x.tag === t).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-[14px]">Loading history…</div>
        ) : viewMode === "list" ? (
          <div className="flex flex-col gap-4">
            {grouped.map(([dateKey, dayTasks]) => {
              const pending = dayTasks.filter(t => !t.done);
              const completed = dayTasks.filter(t => t.done);
              return (
                <div key={dateKey} className="flex flex-col gap-2">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-indigo-500">calendar_today</span>
                    {formatDayLabel(dateKey)} · {completed.length} done · {pending.length} left
                  </h3>
                  {pending.map(task => (
                    <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={removeTask} />
                  ))}
                  {completed.map(task => (
                    <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={removeTask} />
                  ))}
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-2">task</span>
                <p className="text-[14px]">No tasks in this {weekday === "all" ? "month" : weekday}. Add one above!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-bold text-slate-700 flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Not completed ({pendingTasks.length})
              </h3>
              <div className="bg-slate-50 rounded-2xl p-3 flex flex-col gap-2 min-h-[200px]">
                {pendingTasks.map(task => (
                  <BoardCard key={task.id} task={task} onToggle={toggleTask} onDelete={removeTask} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-bold text-slate-700 flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span> Completed ({completedTasks.length})
              </h3>
              <div className="bg-teal-50/50 rounded-2xl p-3 flex flex-col gap-2 min-h-[200px]">
                {completedTasks.map(task => (
                  <BoardCard key={task.id} task={task} onToggle={toggleTask} onDelete={removeTask} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function TaskRow({ task, onToggle, onDelete }) {
  const ps = PRIORITY_STYLES[task.done ? "Done" : task.priority] || PRIORITY_STYLES.Medium;
  
  return (
    <div className={`group flex items-start justify-between p-4 rounded-xl transition-all cursor-pointer ${task.done ? "bg-slate-50" : "bg-white hover:bg-slate-50 shadow-sm"}`}>
      <div className="flex items-start gap-4 min-w-0">
        <button onClick={() => onToggle(task.id)} className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${task.done ? "bg-teal-500 text-white" : "bg-slate-200 text-transparent hover:text-slate-400"}`}>
          <span className="material-symbols-outlined text-[16px]">check</span>
        </button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13px] truncate ${task.done ? "line-through text-slate-400" : "text-slate-800 font-medium"}`}>{task.title}</span>
            {task.aiSynced && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-semibold">
                <span className="material-symbols-outlined text-[12px]">auto_awesome</span> AI
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px]">{task.tag}</span>
            <span className="flex items-center gap-0.5 text-slate-400 text-[11px]">
              <span className="material-symbols-outlined text-[13px]">schedule</span> {task.time}
            </span>
            {task.weekday && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-semibold">{task.weekday}</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ps.bg} ${ps.text}`}>
              {ps.icon} {task.done ? "Done" : task.priority}
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task.id); }}
        className="text-slate-300 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  );
}

function BoardCard({ task, onToggle }) {
  const ps = PRIORITY_STYLES[task.done ? "Done" : task.priority] || PRIORITY_STYLES.Medium;
  
  return (
    <div className="group bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <span className={`text-[13px] font-medium ${task.done ? "line-through text-slate-400" : "text-slate-800"}`}>{task.title}</span>
        <button onClick={() => onToggle(task.id)} className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2 ${task.done ? "bg-teal-500 text-white" : "bg-slate-200 text-transparent hover:text-slate-400"}`}>
          <span className="material-symbols-outlined text-[14px]">check</span>
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">{task.tag}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ps.bg} ${ps.text}`}>{ps.icon}</span>
        <span className="text-slate-400 text-[10px]">{task.weekday || task.time}</span>
      </div>
    </div>
  );
}
