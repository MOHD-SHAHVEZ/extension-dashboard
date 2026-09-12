// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { getDashboard, createTask, updateTask, deleteTask, summarizeUrl } from "../services/api";
import { useToast } from "../context/ToastContext";

/* ══════════════════════════════════════════
   PRIORITY BADGE COMPONENT
   ══════════════════════════════════════════ */
function PriorityBadge({ priority }) {
  const styles = {
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-slate-200 text-slate-600",
    Low: "bg-slate-100 text-slate-400",
    Done: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[priority] || styles.Medium}`}>
      {priority}
    </span>
  );
}

/* ══════════════════════════════════════════
   SCHEDULE SLOT COMPONENT
   ══════════════════════════════════════════ */
function ScheduleSlot({ slot }) {
  const configs = {
    done: {
      nodeClass: "bg-teal-100 text-teal-700",
      nodeIcon: "check",
      cardClass: "bg-slate-50",
      timeClass: "text-teal-600 font-semibold",
      badge: <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] uppercase font-bold">Done</span>,
    },
    active: {
      nodeClass: "bg-indigo-600 text-white shadow-[0_0_0_4px_rgba(79,70,229,0.2)] animate-pulse",
      nodeIcon: "play_arrow",
      cardClass: "bg-indigo-50 border-l-4 border-indigo-600 shadow-sm",
      timeClass: "text-indigo-600 font-bold",
      badge: (
        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> Live Now
        </span>
      ),
    },
    upcoming: {
      nodeClass: "bg-slate-200 text-slate-500",
      nodeIcon: null,
      cardClass: "bg-white hover:bg-slate-50 shadow-sm",
      timeClass: "text-slate-400",
      badge: <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">Upcoming</span>,
    },
    focus: {
      nodeClass: "bg-orange-500 text-white shadow-sm",
      nodeIcon: "flag",
      cardClass: "bg-orange-50 shadow-sm",
      timeClass: "text-orange-600 font-bold",
      badge: <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] uppercase font-bold tracking-wider">🎯 High Focus</span>,
    },
    rest: {
      nodeClass: "bg-slate-200 text-slate-500",
      nodeIcon: "fitness_center",
      cardClass: "bg-white hover:bg-slate-50 shadow-sm",
      timeClass: "text-slate-400",
      badge: <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">Rest & Reset</span>,
    },
  };

  const c = configs[slot.status] || configs.upcoming;

  return (
    <div className="relative flex items-start gap-4 group">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 mt-1 ${c.nodeClass}`}>
        {c.nodeIcon ? (
          <span className="material-symbols-outlined text-[14px]">{c.nodeIcon}</span>
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        )}
      </div>
      <div className={`flex-1 p-4 rounded-xl transition-all ${c.cardClass}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] ${c.timeClass}`}>{slot.time}</span>
          {c.badge}
        </div>
        <h3 className="text-[15px] font-semibold text-slate-800 mt-1">{slot.title}</h3>
        <p className="text-[12px] text-slate-500 mt-0.5">{slot.desc}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SUMMARY CARD COMPONENT
   ══════════════════════════════════════════ */
function SummaryCard({ summary }) {
  const navigate = useNavigate();
  const tagColors = {
    "System Design": "bg-indigo-100 text-indigo-700",
    "AI Research": "bg-orange-100 text-orange-700",
    "Chrome Dev": "bg-teal-100 text-teal-700",
    "Interview Prep": "bg-orange-100 text-orange-700",
    "YouTube": "bg-red-100 text-red-700",
    "Web": "bg-slate-100 text-slate-600",
  };
  const randomTag = (Array.isArray(summary.tags) && summary.tags[0]) || "Web";

  const createdDate = summary.createdAt
    ? new Date(summary.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Recent";

  return (
    <article
      className="group relative p-5 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer overflow-hidden"
      onClick={() => summary.id && navigate(`/summaries/${summary.id}`)}
    >
      {/* Subtle top gradient accent on hover */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${tagColors[randomTag] || "bg-slate-100 text-slate-600"}`}>
            {summary.status === "PROCESSING" && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
            {summary.status === "FAILED" && <span className="material-symbols-outlined text-[14px]">error</span>}
            {!["PROCESSING", "FAILED"].includes(summary.status) && <span className="material-symbols-outlined text-[14px]">sell</span>}
            <span>{summary.status === "PROCESSING" ? "Processing" : summary.status === "FAILED" ? "Failed" : randomTag}</span>
          </div>
          <span className="text-[12px] text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {createdDate}
          </span>
        </div>

        <div>
          <h3 className="text-[16px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-1">
            {summary.title || "Untitled Summary"}
          </h3>
          <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed">
            {summary.excerpt || summary.content?.slice(0, 150) || (summary.status === "PROCESSING" ? "AI is currently reading and extracting insights from this page…" : "No preview available for this content.")}
          </p>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
          <span>Read Document</span>
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
        </div>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ══════════════════════════════════════════ */
export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskTag, setTaskTag] = useState("Interview Prep");
  const [aiUrl, setAiUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [focusTitle, setFocusTitle] = useState("Today's goals");
  const [nextLabel, setNextLabel] = useState("Next: set a schedule slot");
  const [fullName, setFullName] = useState("");
  const toast = useToast();
  const navigate = useNavigate();

  const email = localStorage.getItem("email") || "Guest";
  const username = email.split("@")[0] || "Guest";

  const refreshDashboard = useCallback(async () => {
    const data = await getDashboard();
    setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    setScheduleSlots(Array.isArray(data?.schedule) ? data.schedule : []);
    setSummaries(Array.isArray(data?.summaries) ? data.summaries : []);
    if (data?.focusTitle) setFocusTitle(data.focusTitle);
    if (data?.nextLabel) setNextLabel(data.nextLabel);
    if (data?.firstName || data?.lastName) {
      setFullName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
    } else {
      setFullName("");
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await refreshDashboard();
      } catch (err) {
        console.error("getDashboard error", err);
        toast.push(err?.message || "Failed to load dashboard", { type: "error" });
      } finally {
        setLoadingSummaries(false);
      }
    }
    load();
  }, [refreshDashboard]);

  const toggleTask = useCallback(async (id) => {
    const current = tasks.find(t => t.id === id);
    if (!current) return;
    const nextDone = !current.done;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: nextDone } : t));
    try {
      await updateTask(id, { done: nextDone });
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: current.done } : t));
      toast.push(err?.message || "Could not update task", { type: "error" });
    }
  }, [tasks, toast]);

  const removeTask = useCallback(async (id) => {
    const snapshot = tasks;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTask(id);
    } catch (err) {
      console.error(err);
      setTasks(snapshot);
      toast.push(err?.message || "Could not delete task", { type: "error" });
    }
  }, [tasks, toast]);

  const addTask = useCallback(async () => {
    if (!newTaskText.trim()) return;
    try {
      const saved = await createTask({
        title: newTaskText.trim(),
        tag: taskTag,
        time: "30m",
        priority: taskPriority,
        done: false,
      });
      setTasks(prev => [saved, ...prev]);
      setNewTaskText("");
      toast.push("Task added!", { type: "success" });
    } catch (err) {
      console.error(err);
      toast.push(err?.message || "Could not add task", { type: "error" });
    }
  }, [newTaskText, taskPriority, taskTag, toast]);

  const handleAiSummarize = useCallback(async () => {
    if (!aiUrl.trim()) return;
    setAiLoading(true);
    try {
      const result = await summarizeUrl(aiUrl.trim());
      if (result?.status === "FAILED") {
        toast.push(result.errorMessage || "Summarization failed", { type: "error" });
      } else {
        toast.push("AI Summary created!", { type: "success" });
      }
      setAiUrl("");
      await refreshDashboard();
    } catch (err) {
      console.error(err);
      toast.push(err?.message || "Failed to create summary", { type: "error" });
    } finally {
      setAiLoading(false);
    }
  }, [aiUrl, refreshDashboard, toast]);

  // Computed
  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const allTags = ["All", ...new Set(tasks.map(t => t.tag))];
  const filteredTasks = activeFilter === "All" ? tasks : tasks.filter(t => t.tag === activeFilter);

  // Recent summaries (latest 3)
  const recentSummaries = summaries.slice(0, 3);

  return (
    <AppLayout>
      <div className="flex flex-col w-full gap-6">

        {/* ═══ HERO BANNER ═══ */}
        <section className="relative overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.03)] p-4 sm:p-6 lg:p-8">
          {/* Subtle Background Elements */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-slate-50/80 blur-3xl pointer-events-none"></div>
          <div className="absolute right-48 -bottom-24 w-60 h-60 rounded-full bg-slate-50/60 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[11px] font-medium w-fit border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>Active Workspace</span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-semibold text-slate-900 tracking-tight leading-snug">
                Welcome back, <span className="capitalize">{fullName || username}</span>
              </h1>

              <p className="text-[14px] text-slate-500 leading-relaxed max-w-xl">
                Here is an overview of your productivity, daily tasks, and schedule.
              </p>

              {/* Live Pulse Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-[11px] font-semibold shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-teal-500">check_circle</span>
                  <span>{doneCount} of {totalCount} Goals Done ({pct}%)</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-[11px] font-semibold shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-indigo-500">target</span>
                  <span>Focus: <strong className="text-indigo-600">{focusTitle}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-semibold shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">alarm</span>
                  <span>{nextLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ AI SUMMARIZER BAR ═══ */}
        <section className="rounded-2xl bg-white p-4 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 shrink-0 text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[20px] text-indigo-600">auto_awesome</span>
            <span className="text-slate-800">AI Synced Ingestion</span>
          </div>
          <div className="relative flex-1 flex items-center">
            <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[20px]">link</span>
            <input
              id="ai-url-input"
              type="url"
              value={aiUrl}
              onChange={(e) => setAiUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAiSummarize()}
              placeholder="Paste article, research paper, or YouTube URL to auto-extract action items..."
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
            />
          </div>
          <button
            onClick={handleAiSummarize}
            disabled={aiLoading}
            className="h-12 px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 w-full md:w-auto shrink-0 hover:bg-indigo-700 active:scale-95 shadow-sm transition-all disabled:opacity-60"
          >
            {aiLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Parsing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Summarize with AI</span>
              </>
            )}
          </button>
        </section>

        {/* ═══ MAIN TWO-COLUMN WORKSPACE ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: TO-DO & LEARNING QUEUE */}
          <div className="lg:col-span-7 flex flex-col gap-5 bg-white p-4 sm:p-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.03)]">
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-[24px]">task_alt</span>
                  <h2 className="text-[20px] font-semibold text-slate-800 tracking-tight">My To-Do & Learning Queue</h2>
                </div>
                <span className="px-3 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold">
                  Sprint Cadence: Week 42
                </span>
              </div>

              {/* Progress Tracker */}
              <div className="p-4 rounded-xl bg-slate-50 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-500">Daily Execution Velocity</span>
                  <span className="text-slate-800 font-semibold">{doneCount} of {totalCount} Completed ({pct}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(tag)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap ${activeFilter === tag
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                  >
                    {tag}{tag === "All" ? ` (${totalCount})` : ` (${tasks.filter(t => t.tag === tag).length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Task List */}
            <div className="flex flex-col gap-2">
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  className={`group flex items-start justify-between p-4 rounded-xl transition-all cursor-pointer ${task.done ? "bg-slate-50" : "bg-white hover:bg-slate-50 shadow-sm"
                    }`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${task.done
                          ? "bg-teal-500 text-white"
                          : "bg-slate-200 text-transparent hover:text-slate-400"
                        }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[13px] truncate ${task.done ? "line-through text-slate-400" : "text-slate-800 font-medium"}`}>
                          {task.title}
                        </span>
                        {task.aiSynced && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-semibold">
                            <span className="material-symbols-outlined text-[12px]">auto_awesome</span> AI Synced
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px]">{task.tag}</span>
                        <span className="flex items-center gap-0.5 text-slate-400 text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">schedule</span> {task.time}
                        </span>
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeTask(task.id); }}
                    className="text-slate-300 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[13px]">No tasks in this category.</div>
              )}
            </div>

            {/* New Task Input */}
            <div className="pt-4 mt-2 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-white border-2 border-indigo-100 shadow-sm hover:border-indigo-300 hover:shadow-md focus-within:border-indigo-500 focus-within:shadow-[0_4px_20px_-5px_rgba(79,70,229,0.15)] focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-300 flex flex-col gap-3 group relative">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-colors duration-300 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </div>
                  <input
                    id="new-task-input"
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="What needs to be done? Type here and press Enter..."
                    className="w-full bg-transparent text-[14px] font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-50 mt-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="h-8 px-3 rounded-lg bg-slate-50 text-slate-700 text-[12px] font-medium focus:outline-none hover:bg-slate-100 cursor-pointer border border-transparent transition-all outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="High">🔥 High Priority</option>
                      <option value="Medium">⚡ Medium</option>
                      <option value="Low">🌱 Low</option>
                    </select>
                    <select
                      value={taskTag}
                      onChange={(e) => setTaskTag(e.target.value)}
                      className="h-8 px-3 rounded-lg bg-slate-50 text-slate-700 text-[12px] font-medium focus:outline-none hover:bg-slate-100 cursor-pointer border border-transparent transition-all outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="Interview Prep">Interview Prep</option>
                      <option value="AI Research">AI Research</option>
                      <option value="Projects">Projects</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </div>
                  <button
                    onClick={addTask}
                    disabled={!newTaskText.trim()}
                    className="h-9 px-5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>Add Task</span>
                    <span className="material-symbols-outlined text-[16px]">keyboard_return</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DAILY SCHEDULE */}
          <div className="lg:col-span-5 flex flex-col gap-5 bg-white p-4 sm:p-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.03)]">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-[24px]">schedule</span>
                  <h2 className="text-[20px] font-semibold text-slate-800 tracking-tight">Daily Schedule</h2>
                </div>
                <button
                  onClick={() => navigate("/schedule")}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-semibold transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  <span>Customize</span>
                </button>
              </div>

              {/* Date Nav */}
              <div className="flex items-center justify-between p-2 rounded-full bg-slate-50 mt-1">
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white transition-all">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600">calendar_month</span>
                  <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
                </div>
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white transition-all">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative flex flex-col gap-4 pl-4">
              {/* Track line */}
              <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-slate-200 pointer-events-none"></div>

              {scheduleSlots.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[13px]">
                  No slots for today. Add some on the Schedule page.
                </div>
              ) : scheduleSlots.map((slot) => (
                <ScheduleSlot key={slot.id || slot.title} slot={slot} />
              ))}
            </div>

            {/* Callout */}
            <div className="p-4 rounded-xl bg-slate-50 flex items-center gap-3 text-slate-500">
              <span className="material-symbols-outlined text-indigo-500 text-[20px] shrink-0">drag_indicator</span>
              <span className="text-[12px]">
                Drag & drop to rearrange or edit slots according to your natural energy rhythm.
              </span>
            </div>
          </div>
        </div>

        {/* ═══ RECENT AI SUMMARIES ═══ */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <span className="material-symbols-outlined text-[18px]">auto_stories</span>
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-slate-800 tracking-tight">Recent AI Summaries & Knowledge Drops</h2>
                <p className="text-[12px] text-slate-500">Automatically extracted key takeaways from external papers & docs</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/summaries")}
              className="flex items-center gap-1 text-[13px] font-medium text-indigo-600 hover:underline"
            >
              <span>Browse All {summaries.length} Saved Summaries</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {loadingSummaries ? (
              [1, 2, 3].map(i => (
                <div key={i} className="p-5 rounded-2xl bg-white shadow-sm animate-pulse">
                  <div className="h-4 w-24 bg-slate-200 rounded-full mb-3"></div>
                  <div className="h-5 w-full bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 w-3/4 bg-slate-100 rounded"></div>
                </div>
              ))
            ) : recentSummaries.length > 0 ? (
              recentSummaries.map(s => <SummaryCard key={s.id} summary={s} />)
            ) : (
              <div className="col-span-3 text-center py-10 text-slate-400 text-[13px] bg-white rounded-2xl">
                No AI summaries yet. Paste a URL above to generate one.
              </div>
            )}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
