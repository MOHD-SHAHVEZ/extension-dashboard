import React, { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import AppLayout from "../layouts/AppLayout";
import { getSchedule, createScheduleSlot, deleteScheduleSlot } from "../services/api";
import { useToast } from "../context/ToastContext";
import AiTimetableModal from "../components/AiTimetableModal";

/* ═══ DEFAULT SCHEDULE DATA ═══ */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDefaultSlots() {
  return [
    { id: "1", time: "06:00 AM", endTime: "07:00 AM", title: "Morning Routine", desc: "Exercise & breakfast", category: "health", day: "all" },
    { id: "2", time: "07:30 AM", endTime: "08:30 AM", title: "DSA Practice", desc: "LeetCode mediums", category: "study", day: "all" },
    { id: "3", time: "09:00 AM", endTime: "10:30 AM", title: "System Design", desc: "Distributed systems", category: "work", day: "Mon" },
    { id: "4", time: "09:00 AM", endTime: "10:30 AM", title: "Backend APIs", desc: "Spring Boot", category: "work", day: "Tue" },
    { id: "5", time: "09:00 AM", endTime: "10:30 AM", title: "Frontend Dev", desc: "React components", category: "work", day: "Wed" },
    { id: "6", time: "09:00 AM", endTime: "10:30 AM", title: "Database Layer", desc: "PostgreSQL queries", category: "work", day: "Thu" },
    { id: "7", time: "09:00 AM", endTime: "10:30 AM", title: "DevOps", desc: "Docker & CI/CD", category: "work", day: "Fri" },
    { id: "8", time: "11:00 AM", endTime: "12:30 PM", title: "AI Extension", desc: "Chrome extension", category: "project", day: "all" },
    { id: "9", time: "01:30 PM", endTime: "03:00 PM", title: "Portfolio", desc: "README updates", category: "project", day: "all" },
    { id: "10", time: "03:00 PM", endTime: "04:00 PM", title: "Tech Interview", desc: "Mock interviews", category: "interview", day: "Mon" },
    { id: "11", time: "03:00 PM", endTime: "04:00 PM", title: "Behavioral Prep", desc: "STAR method", category: "interview", day: "Wed" },
    { id: "12", time: "03:00 PM", endTime: "04:00 PM", title: "Research Reading", desc: "Papers & blogs", category: "study", day: "Fri" },
    { id: "13", time: "05:00 PM", endTime: "06:00 PM", title: "Evening Walk", desc: "Decompress", category: "health", day: "all" },
  ];
}

const CATEGORIES = {
  health: { color: "bg-emerald-500", lightBg: "bg-emerald-100", text: "text-emerald-800", label: "Health & Wellness", rgb: [209, 250, 229], textRgb: [6, 95, 70] },
  study: { color: "bg-indigo-500", lightBg: "bg-indigo-100", text: "text-indigo-800", label: "Study & Learning", rgb: [224, 231, 255], textRgb: [55, 48, 163] },
  work: { color: "bg-blue-500", lightBg: "bg-blue-100", text: "text-blue-800", label: "Deep Work", rgb: [219, 234, 254], textRgb: [30, 64, 175] },
  project: { color: "bg-violet-500", lightBg: "bg-violet-100", text: "text-violet-800", label: "Project Building", rgb: [237, 233, 254], textRgb: [91, 33, 182] },
  interview: { color: "bg-orange-500", lightBg: "bg-orange-100", text: "text-orange-800", label: "Interview Prep", rgb: [255, 237, 213], textRgb: [154, 52, 18] },
};

const STORAGE_KEY = "schedule_slots";

function cacheSlots(slots) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slots)); } catch { /* ignore */ }
}

/* ═══ SLOT CARD (DAILY VIEW) ═══ */
function DailySlotCard({ slot, onDelete }) {
  const cat = CATEGORIES[slot.category] || CATEGORIES.work;
  return (
    <div className="group relative flex items-start gap-4 p-4 rounded-xl bg-white hover:shadow-md transition-all border border-slate-100">
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div className={`w-3 h-3 rounded-full ${cat.color} shadow-sm`}></div>
        <div className="w-0.5 h-full bg-slate-200 mt-1"></div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold ${cat.text}`}>{slot.time} – {slot.endTime}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.lightBg} ${cat.text}`}>{cat.label}</span>
        </div>
        <h3 className="text-[14px] font-semibold text-slate-800 mt-1 truncate">{slot.title}</h3>
        <p className="text-[12px] text-slate-500 mt-0.5 truncate">{slot.desc}</p>
        {slot.day !== "all" && <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">{slot.day} only</span>}
      </div>
      <button onClick={() => onDelete(slot.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}

/* ═══ WEEKLY VIEW (KANBAN GRID) ═══ */
function WeeklyView({ slots }) {
  const getSlotsForDay = (day) => {
    return slots.filter(s => s.day === day || s.day === "all").sort((a, b) => a.time.localeCompare(b.time));
  };

  return (
    <>
    <div className="lg:hidden space-y-4">
      {DAYS.map((day) => (
        <section key={day} className="rounded-2xl bg-white border border-slate-100 p-3">
          <h3 className="text-[13px] font-bold text-slate-700 mb-2">{day}</h3>
          <div className="space-y-2">
            {getSlotsForDay(day).length === 0 && (
              <p className="text-[12px] text-slate-400 py-3 text-center">No slots</p>
            )}
            {getSlotsForDay(day).map((slot) => {
              const cat = CATEGORIES[slot.category] || CATEGORIES.work;
              return (
                <div key={`${day}-${slot.id}`} className={`p-3 rounded-xl ${cat.lightBg}`}>
                  <p className={`text-[11px] font-bold ${cat.text}`}>{slot.time} – {slot.endTime}</p>
                  <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{slot.title}</p>
                  {slot.desc && <p className="text-[12px] text-slate-500 mt-0.5">{slot.desc}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
    <div className="hidden lg:block w-full overflow-x-auto pb-10">
      <div className="grid grid-cols-7 gap-3 min-w-[900px] px-2">
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex flex-col gap-2">
            <div className="text-center py-2 bg-slate-100 rounded-lg">
              <h3 className="text-[13px] font-bold text-slate-700">{day}</h3>
            </div>
            <div className="flex flex-col gap-2">
              {getSlotsForDay(day).map(slot => {
                const cat = CATEGORIES[slot.category] || CATEGORIES.work;
                // Smart positioning to prevent edge clipping
                const posClass = dayIndex === 0 ? "left-0" : dayIndex === 6 ? "right-0" : "left-1/2 -translate-x-1/2";
                
                return (
                  <div key={`${day}-${slot.id}`} className={`group relative p-2 rounded-lg border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 hover:brightness-[0.97] hover:z-50 transition-all cursor-default ${cat.lightBg}`}>
                    <div className={`text-[10px] font-bold ${cat.text} mb-0.5 truncate`}>{slot.time}</div>
                    <h4 className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">{slot.title}</h4>
                    
                    {/* Hover Card */}
                    <div className={`absolute z-[100] ${posClass} top-full mt-2 w-60 rounded-2xl ${cat.lightBg} shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] border border-white/50 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 origin-top pointer-events-none overflow-hidden`}>
                      <div className={`h-1.5 w-full ${cat.color}`}></div>
                      <div className="p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`material-symbols-outlined text-[16px] ${cat.text}`}>schedule</span>
                          <span className={`text-[11px] font-bold ${cat.text} tracking-wide`}>{slot.time} – {slot.endTime}</span>
                        </div>
                        <div className={`h-px w-full ${cat.color} opacity-20 my-0.5`}></div>
                        <h4 className={`text-[14px] font-bold ${cat.text} leading-snug whitespace-normal`}>{slot.title}</h4>
                        {slot.desc && <p className={`text-[12px] ${cat.text} opacity-80 leading-relaxed whitespace-normal`}>{slot.desc}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

/* ═══ MONTHLY VIEW (CALENDAR GRID) ═══ */
function MonthlyView({ slots, onDayClick }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  
  // Adjust so Monday is 0 index
  const startDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 

  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null); // Empty slots
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }
  for (let i = calendarDays.length; i < totalCells; i++) {
    calendarDays.push(null); // Trailing empty slots
  }

  // Helper to figure out what day of week it is (0=Mon, 6=Sun)
  const getDayStr = (dateNum) => {
    const d = new Date(currentYear, currentMonth, dateNum).getDay();
    const adj = d === 0 ? 6 : d - 1;
    return DAYS[adj];
  };

  return (
    <div id="monthly-calendar-capture" className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
      {/* Month Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl flex items-center justify-between border-b border-indigo-700/50 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-10 -mb-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        
        <h2 className="text-[18px] font-bold text-white relative z-10 drop-shadow-md">
          {new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-2 relative z-10">
          <span className="hidden sm:inline px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-[12px] font-semibold border border-white/20 shadow-sm">Current Month</span>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-indigo-50/60">
        {DAYS.map(day => (
          <div key={day} className="py-2 sm:py-3 text-center text-[10px] sm:text-[12px] font-bold text-indigo-700 uppercase tracking-wider border-r border-indigo-100 last:border-r-0">
            <span className="sm:hidden">{day.slice(0, 1)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((dateNum, idx) => {
          const isBottomLeft = idx === totalCells - 7;
          const isBottomRight = idx === totalCells - 1;
          const radiusClass = isBottomLeft ? "rounded-bl-2xl" : isBottomRight ? "rounded-br-2xl" : "";

          if (!dateNum) {
            return <div key={`empty-${idx}`} className={`h-12 sm:h-20 lg:h-36 bg-slate-50/80 border-r border-b border-slate-200 ${idx % 7 === 6 ? 'border-r-0' : ''} ${radiusClass} relative`}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wMykiLz48L3N2Zz4=')] opacity-50"></div>
            </div>;
          }

          const dayStr = getDayStr(dateNum);
          const todaysSlots = slots.filter(s => s.day === dayStr || s.day === "all");
          const isToday = dateNum === today.getDate();
          
          // Smart positioning
          const colIdx = idx % 7;
          const posClass = colIdx === 0 ? "left-0" : colIdx === 6 ? "right-0" : "left-1/2 -translate-x-1/2";

          return (
            <div key={`day-${dateNum}`} onClick={() => onDayClick({ dateNum, dayStr, slots: todaysSlots, currentMonth, currentYear })} className={`group/daycell relative h-12 sm:h-20 lg:h-36 p-1 sm:p-2 border-r border-b border-slate-200 ${idx % 7 === 6 ? 'border-r-0' : ''} hover:bg-white hover:z-50 sm:hover:scale-[1.03] hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] hover:rounded-xl transition-all duration-300 flex flex-col gap-1.5 cursor-pointer ${isToday ? "bg-indigo-50/50" : "bg-gradient-to-br from-white to-slate-50/50"} ${radiusClass}`}>
              <div className="flex items-center justify-between px-1.5">
                <span className={`text-[13px] font-bold transition-colors ${isToday ? "w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 group-hover/daycell:text-indigo-600"}`}>
                  {dateNum}
                </span>
              </div>
              <div className="hidden sm:flex flex-1 flex-col gap-1 px-0.5 relative">
                {todaysSlots.slice(0, 3).map((slot, i) => {
                  const cat = CATEGORIES[slot.category] || CATEGORIES.work;
                  return (
                    <div key={i} className={`group relative text-[10px] font-semibold truncate px-1.5 py-1 rounded-md cursor-pointer ${cat.lightBg} ${cat.text} hover:scale-110 hover:shadow-md hover:ring-2 hover:ring-indigo-400 hover:z-50 transition-all border border-transparent hover:border-indigo-200`}>
                      {slot.title}
                      
                      {/* Hover Card */}
                      <div className={`absolute z-[100] ${posClass} bottom-full mb-2 w-60 rounded-2xl ${cat.lightBg} shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] border border-white/50 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 origin-bottom pointer-events-none overflow-hidden text-left flex flex-col`}>
                        <div className="p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`material-symbols-outlined text-[16px] ${cat.text}`}>schedule</span>
                            <span className={`text-[11px] font-bold ${cat.text} tracking-wide`}>{slot.time} – {slot.endTime}</span>
                          </div>
                          <div className={`h-px w-full ${cat.color} opacity-20 my-0.5`}></div>
                          <h4 className={`text-[14px] font-bold ${cat.text} leading-snug whitespace-normal`}>{slot.title}</h4>
                          {slot.desc && <p className={`text-[12px] ${cat.text} opacity-80 leading-relaxed whitespace-normal`}>{slot.desc}</p>}
                        </div>
                        <div className={`h-1.5 w-full ${cat.color} mt-auto`}></div>
                      </div>
                    </div>
                  );
                })}
                {todaysSlots.length > 3 && (
                  <div className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100/80 font-semibold mt-1 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all w-fit shadow-sm">+{todaysSlots.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE COMPONENT ═══ */
export default function SchedulePage() {
  const toast = useToast();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily"); // daily, weekly, monthly
  const [activeDay, setActiveDay] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "", time: "09:00 AM", endTime: "10:00 AM", category: "work", day: "all" });
  const [selectedDaySlots, setSelectedDaySlots] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getSchedule()
      .then((list) => {
        if (cancelled) return;
        const next = Array.isArray(list) ? list : [];
        setSlots(next);
        cacheSlots(next);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        toast.push(err?.message || "Failed to load schedule", { type: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const deleteSlot = async (id) => {
    const snapshot = slots;
    setSlots(prev => prev.filter(s => s.id !== id));
    try {
      await deleteScheduleSlot(id);
    } catch (err) {
      console.error(err);
      setSlots(snapshot);
      toast.push("Could not delete slot", { type: "error" });
    }
  };
  
  const addSlot = async () => {
    if (!form.title.trim()) return;
    try {
      const saved = await createScheduleSlot(form);
      setSlots(prev => [...prev, saved].sort((a, b) => String(a.time).localeCompare(String(b.time))));
      setForm({ title: "", desc: "", time: "09:00 AM", endTime: "10:00 AM", category: "work", day: "all" });
      setShowAdd(false);
    } catch (err) {
      console.error(err);
      toast.push("Could not save slot", { type: "error" });
    }
  };

  const downloadPDF = async () => {
    try {
      if (viewMode === "monthly") {
        const doc = new jsPDF('l', 'mm', 'a4'); 
        const pdfWidth = doc.internal.pageSize.getWidth();
        
        doc.setFillColor(79, 70, 229); 
        doc.rect(0, 0, pdfWidth, 25, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("Master Monthly Calendar", 14, 16);
        
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        
        doc.setFontSize(10);
        doc.setTextColor(224, 231, 255); 
        doc.text(`Generated on: ${monthName}`, 14, 22);

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
        const startDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 
        const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
        const calendarDays = [];
        for (let i = 0; i < startDay; i++) calendarDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
        for (let i = calendarDays.length; i < totalCells; i++) calendarDays.push(null);

        const getDayStr = (dateNum) => {
          const d = new Date(currentYear, currentMonth, dateNum).getDay();
          const adj = d === 0 ? 6 : d - 1;
          return DAYS[adj];
        };

        const weeksData = [];
        let currentWeek = {};
        
        calendarDays.forEach((dateNum, idx) => {
          const colIdx = idx % 7;
          const dayName = DAYS[colIdx];
          
          if (dateNum === null) {
            currentWeek[dayName] = "";
          } else {
            const dayStr = getDayStr(dateNum);
            const todaysSlots = slots.filter(s => s.day === dayStr || s.day === "all").sort((a, b) => a.time.localeCompare(b.time));
            
            currentWeek[dayName] = { content: `${dateNum}`, slots: todaysSlots, dateNum: dateNum };
          }
          
          if (colIdx === 6 || idx === calendarDays.length - 1) {
            weeksData.push(currentWeek);
            currentWeek = {};
          }
        });

        autoTable(doc, {
          startY: 32,
          columns: DAYS.map(d => ({ header: d.toUpperCase(), dataKey: d })),
          body: weeksData,
          theme: 'grid',
          headStyles: { 
            fillColor: [248, 250, 252], 
            textColor: [37, 99, 235], 
            fontStyle: 'bold', 
            fontSize: 10, 
            halign: 'center',
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: [226, 232, 240] 
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 3, 
            textColor: [51, 65, 85], 
            overflow: 'linebreak',
            lineWidth: 0.1,
            lineColor: [226, 232, 240],
            valign: 'top',
            minCellHeight: 25
          },
          didParseCell: function(data) {
             if (data.section === 'body') {
                if (!data.cell.raw || data.cell.raw === "") {
                  data.cell.styles.fillColor = [248, 250, 252]; 
                } else {
                  data.cell.styles.fillColor = [255, 255, 255]; 
                  const slots = data.cell.raw.slots;
                  if (slots && slots.length > 0) {
                     const doc = data.doc;
                     doc.setFontSize(6.5);
                     doc.setFont(undefined, 'bold');
                     
                     let totalHeight = 8; // 8px for top + date text
                     slots.forEach(slot => {
                        let lines = doc.splitTextToSize(slot.title, 32); // Approximate cell inner width
                        let pillH = (lines.length * 2.8) + 2; // 2.8mm per line + 2mm padding
                        totalHeight += pillH + 1.5; // 1.5mm gap
                     });
                     totalHeight += 2; // bottom padding
                     
                     if (totalHeight > 25) {
                        data.cell.styles.minCellHeight = totalHeight;
                     }
                  }
                }
             }
          },
          didDrawCell: function(data) {
             if (data.section === 'body' && data.cell.raw && data.cell.raw.slots) {
                const doc = data.doc;
                const cellData = data.cell.raw;
                const slots = cellData.slots;
                
                let cursorY = data.cell.y + 8; // Start drawing below the date text
                const pillX = data.cell.x + 2;
                const pillW = data.cell.width - 4;
                
                slots.forEach(slot => {
                   const cat = CATEGORIES[slot.category] || CATEGORIES.work;
                   
                   doc.setFontSize(6.5);
                   doc.setFont(undefined, 'bold');
                   
                   // Dynamically wrap text
                   let maxTextW = pillW - 2;
                   let lines = doc.splitTextToSize(slot.title, maxTextW);
                   let pillH = (lines.length * 2.8) + 2; // Calculate height based on lines
                   
                   // Draw pill background
                   doc.setFillColor(cat.rgb[0], cat.rgb[1], cat.rgb[2]);
                   doc.roundedRect(pillX, cursorY, pillW, pillH, 1, 1, 'F');
                   
                   // Draw text inside pill line by line
                   doc.setTextColor(cat.textRgb[0], cat.textRgb[1], cat.textRgb[2]);
                   let textY = cursorY + 3.2;
                   lines.forEach(line => {
                      doc.text(line, pillX + 1.5, textY);
                      textY += 2.8;
                   });
                   
                   cursorY += pillH + 1.5; // Gap for next pill
                });
             }
          }
        });

        doc.save(`Monthly-Calendar-${monthName.replace(" ", "-")}.pdf`);
        return;
      }

      const doc = new jsPDF();
      
      // Colorful Top Banner
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.rect(0, 0, 210, 30, 'F');
      
      const FULL_DAYS = { "Mon": "MONDAY", "Tue": "TUESDAY", "Wed": "WEDNESDAY", "Thu": "THURSDAY", "Fri": "FRIDAY", "Sat": "SATURDAY", "Sun": "SUNDAY" };

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      const title = viewMode === "daily" && activeDay !== "all" 
        ? `${FULL_DAYS[activeDay]} Schedule` 
        : (viewMode === "daily" ? "Daily Master Schedule" : "Master Weekly Schedule");
      doc.text(title, 14, 16);
      
      doc.setFontSize(10);
      doc.setTextColor(224, 231, 255); // indigo-100
      doc.text(`Generated on: ${new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 24);

      const tableData = [];
      const targetDays = (viewMode === "daily" && activeDay !== "all") ? [activeDay] : DAYS;
      
      targetDays.forEach(day => {
        const daySlots = slots.filter(s => s.day === day || s.day === "all").sort((a, b) => a.time.localeCompare(b.time));
        
        if (daySlots.length > 0) {
          // Group Header for the Day
          tableData.push({
            isDayHeader: true,
            day: day.toUpperCase(),
            time: "", title: "", category: "", desc: "", categoryId: ""
          });
          
          daySlots.forEach(slot => {
            const cat = CATEGORIES[slot.category] || CATEGORIES.work;
            tableData.push({
              isDayHeader: false,
              time: `${slot.time} - ${slot.endTime}`,
              title: slot.title,
              category: cat.label,
              desc: slot.desc || "-",
              categoryId: slot.category
            });
          });
        } else if (viewMode === "daily") {
           tableData.push({
            isDayHeader: true,
            day: day.toUpperCase(),
            time: "", title: "", category: "", desc: "", categoryId: ""
          });
          tableData.push({
              isDayHeader: false,
              time: `-`,
              title: "No tasks scheduled",
              category: "Work",
              desc: "-",
              categoryId: "work"
          });
        }
      });

      autoTable(doc, {
        startY: 38,
        columns: [
          { header: "TIME", dataKey: "time" },
          { header: "TASK", dataKey: "title" },
          { header: "CATEGORY", dataKey: "category" },
          { header: "DESCRIPTION", dataKey: "desc" },
        ],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [37, 99, 235], // blue-600
          fontStyle: 'bold', 
          fontSize: 10, 
          cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
          lineWidth: 0.1,
          lineColor: [226, 232, 240] // slate-200
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 6, 
          textColor: [51, 65, 85], 
          overflow: 'linebreak',
          lineWidth: 0.1,
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          time: { cellWidth: 42, fontStyle: 'bold', textColor: [71, 85, 105] },
          title: { cellWidth: 46, fontStyle: 'bold', textColor: [15, 23, 42] },
          category: { cellWidth: 44 },
          desc: { cellWidth: 'auto' }
        },
        didParseCell: function (data) {
          const rowData = data.row.raw;
          if (data.section === 'body') {
            if (rowData.isDayHeader) {
              if (data.column.dataKey === 'time') {
                const dayKey = rowData.day === "MON" ? "Mon" : rowData.day === "TUE" ? "Tue" : rowData.day === "WED" ? "Wed" : rowData.day === "THU" ? "Thu" : rowData.day === "FRI" ? "Fri" : rowData.day === "SAT" ? "Sat" : "Sun";
                const fullDay = FULL_DAYS[dayKey];
                data.cell.text = [`${dayKey.toUpperCase()} — ${fullDay} SCHEDULE`];
                data.cell.colSpan = 4;
                data.cell.styles.fillColor = [252, 252, 253]; 
                data.cell.styles.textColor = [37, 99, 235]; 
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 11;
                data.cell.styles.halign = 'center';
                data.cell.styles.cellPadding = 5;
              }
            } else {
              if (data.column.dataKey === 'category') {
                // Make text invisible so autoTable doesn't draw it (we draw it in didDrawCell)
                data.cell.styles.textColor = [255, 255, 255]; 
                data.cell.styles.fillColor = [255, 255, 255]; 
              }
            }
          }
        },
        didDrawCell: function (data) {
          const rowData = data.row.raw;
          if (data.section === 'body' && !rowData.isDayHeader && data.column.dataKey === 'category') {
            const doc = data.doc;
            const cat = CATEGORIES[rowData.categoryId] || CATEGORIES.work;
            
            const text = cat.label; 
            doc.setFontSize(data.cell.styles.fontSize);
            doc.setFont(data.cell.styles.font, 'bold');
            const textWidth = doc.getTextWidth(text);
            
            const pillX = data.cell.x + 4; 
            const pillW = textWidth + 8; // 4 padding left and right
            const pillH = 6; 
            const pillY = data.cell.y + (data.cell.height - pillH) / 2;
            
            doc.setFillColor(cat.rgb[0], cat.rgb[1], cat.rgb[2]);
            doc.roundedRect(pillX, pillY, pillW, pillH, 2.5, 2.5, 'F');
            
            doc.setTextColor(cat.textRgb[0], cat.textRgb[1], cat.textRgb[2]);
            // Center text vertically in pill
            const textY = pillY + pillH / 2 + 1.2; 
            doc.text(text, pillX + 4, textY);
          }
        }
      });

      const filename = viewMode === "daily" && activeDay !== "all" 
        ? `Daily-Schedule-${activeDay}.pdf`
        : viewMode === "daily" 
          ? "Daily-Master-Schedule.pdf" 
          : "Weekly-Master-Schedule.pdf";
      
      doc.save(filename);
    } catch (err) {
      console.error("PDF Generation Error: ", err);
      alert("Error generating PDF: " + err.message);
    }
  };


  const filteredSlots = activeDay === "all" ? slots : slots.filter(s => s.day === activeDay || s.day === "all");
  const todayDateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <AppLayout>
      <div className={`flex flex-col gap-6 mx-auto ${viewMode === "monthly" || viewMode === "weekly" ? "max-w-6xl" : "max-w-4xl"}`}>
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="material-symbols-outlined text-white text-[22px]">event</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Schedule</h1>
              <p className="text-[13px] text-slate-500">{todayDateStr}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 bg-slate-100 p-1 rounded-full shadow-inner w-full md:w-auto">
            <button onClick={() => setViewMode("daily")} className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${viewMode === "daily" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <span className="material-symbols-outlined text-[16px]">view_agenda</span> Daily
            </button>
            <button onClick={() => setViewMode("weekly")} className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${viewMode === "weekly" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <span className="material-symbols-outlined text-[16px]">view_week</span> Weekly
            </button>
            <button onClick={() => setViewMode("monthly")} className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${viewMode === "monthly" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <span className="material-symbols-outlined text-[16px]">calendar_month</span> Monthly
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setAiOpen(true)}
              className="h-10 px-4 rounded-full bg-white text-indigo-700 text-[13px] font-semibold flex items-center justify-center gap-2 border border-indigo-200 hover:bg-indigo-50 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="hidden sm:inline">Design with AI</span>
            </button>
            <button onClick={downloadPDF} className="h-10 px-4 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button onClick={() => setShowAdd(!showAdd)} className="h-10 px-3 sm:px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all flex-1 md:flex-none">
              <span className="material-symbols-outlined text-[20px]">{showAdd ? "close" : "add"}</span>
              <span>{showAdd ? "Cancel" : "Add Slot"}</span>
            </button>
          </div>
        </div>

        {/* Add Slot Form */}
        {showAdd && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white shadow-lg border border-slate-100 flex flex-col gap-4 animate-in">
            <h3 className="text-[16px] font-semibold text-slate-800">New Time Slot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm" />
              <input value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} placeholder="Description" className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm" />
              <input value={form.time} onChange={e => setForm({...form, time: e.target.value})} placeholder="Start (e.g., 09:00 AM)" className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm" />
              <input value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} placeholder="End (e.g., 10:00 AM)" className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm" />
              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-slate-500">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, category: key })}
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 ${
                        form.category === key ? `${val.lightBg} ${val.text} ring-1 ring-current` : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${val.color}`} />
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-slate-500">Repeat</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, day: "all" })}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold ${
                      form.day === "all" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    Every day
                  </button>
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, day: d })}
                      className={`h-8 w-10 rounded-lg text-[11px] font-semibold ${
                        form.day === d ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={addSlot} className="h-10 px-6 rounded-full bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 transition-all w-full sm:w-auto sm:self-end">
              Save Slot
            </button>
          </div>
        )}

        {/* View Renders */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-[14px]">Loading schedule…</div>
        ) : viewMode === "daily" && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button onClick={() => setActiveDay("all")} className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${activeDay === "all" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 shadow-sm"}`}>All Days</button>
              {DAYS.map(day => (
                <button key={day} onClick={() => setActiveDay(day)} className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${activeDay === day ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 shadow-sm"}`}>{day}</button>
              ))}
            </div>
            
            {/* Category Legend */}
            <div className="flex flex-wrap gap-3 py-2">
              {Object.entries(CATEGORIES).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${val.color}`}></div>
                  <span className="text-[11px] text-slate-500 font-medium">{val.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSlots.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-400 text-[14px]">
                  <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-2">event_busy</span>
                  No schedule slots for this day. Use Design with AI to build one.
                </div>
              ) : (
                filteredSlots.map(slot => <DailySlotCard key={slot.id} slot={slot} onDelete={deleteSlot} />)
              )}
            </div>
          </div>
        )}

        {viewMode === "weekly" && !loading && (
          <div className="animate-in fade-in duration-300">
            <WeeklyView slots={slots} />
          </div>
        )}

        {viewMode === "monthly" && !loading && (
          <div className="animate-in fade-in duration-300">
            <MonthlyView slots={slots} onDayClick={setSelectedDaySlots} />
          </div>
        )}
      </div>

      {/* Day Slots Modal */}
      <AiTimetableModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        toast={toast}
        onApplied={() => {
          getSchedule().then((list) => {
            const rows = Array.isArray(list) ? list : [];
            setSlots(rows);
            cacheSlots(rows);
          });
        }}
      />

      {selectedDaySlots && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedDaySlots(null)}></div>
          <div className="relative bg-[#f4f6fb] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[18px]">
                  {selectedDaySlots.dateNum}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-800 leading-tight">
                    {new Date(selectedDaySlots.currentYear, selectedDaySlots.currentMonth).toLocaleString('default', { month: 'long' })} {selectedDaySlots.currentYear}
                  </h3>
                  <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">{selectedDaySlots.dayStr}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDaySlots(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-3">
              {selectedDaySlots.slots.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-[48px] text-slate-300 mb-2">event_busy</span>
                  <p className="text-slate-500 text-[14px]">No events for this day.</p>
                </div>
              ) : (
                selectedDaySlots.slots.map(slot => (
                  <DailySlotCard key={slot.id} slot={slot} onDelete={(id) => { deleteSlot(id); setSelectedDaySlots(prev => ({ ...prev, slots: prev.slots.filter(s => s.id !== id) })); }} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
