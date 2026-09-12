import React, { useEffect, useMemo, useState } from "react";
import { applyAiTimetable, generateAiTimetable, getNotebooks } from "../services/api";

const CATEGORY_LABEL = {
  study: "Study",
  work: "Deep work",
  project: "Project",
  interview: "Interview",
  health: "Health",
};

export default function AiTimetableModal({ open, onClose, onApplied, toast }) {
  const [step, setStep] = useState(1);
  const [routine, setRoutine] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectHours, setSubjectHours] = useState([]);
  const [newSubject, setNewSubject] = useState("");
  const [preview, setPreview] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPreview(null);
    setNewSubject("");
    setSubjectHours([]);
    getNotebooks()
      .then((rows) => setSubjects(Array.isArray(rows) ? rows.map((n) => n.subjectName).filter(Boolean) : []))
      .catch(() => setSubjects([]));
  }, [open]);

  const dailyTotal = useMemo(
    () => subjectHours.reduce((sum, row) => sum + (Number(row.hoursPerWeek) > 0 ? Number(row.hoursPerWeek) : 0), 0),
    [subjectHours]
  );

  if (!open) return null;

  function setHours(index, hoursPerWeek) {
    const next = Math.max(0.5, Math.min(8, Number(hoursPerWeek) || 0.5));
    setSubjectHours((prev) => prev.map((row, i) => (i === index ? { ...row, hoursPerWeek: next } : row)));
  }

  function removeSubject(index) {
    setSubjectHours((prev) => prev.filter((_, i) => i !== index));
  }

  function addSubjectByName(name) {
    const value = (name || "").trim();
    if (!value) return;
    setSubjectHours((prev) => (
      prev.some((row) => row.name.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, { name: value, hoursPerWeek: 1.5 }]
    ));
  }

  function addTypedSubject() {
    const name = newSubject.trim();
    if (!name) return;
    if (subjectHours.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      toast.push("Ye subject already list mein hai", { type: "error" });
      return;
    }
    addSubjectByName(name);
    setNewSubject("");
  }

  async function handleGenerate() {
    const usableSubjects = subjectHours.filter((row) => row.name.trim() && Number(row.hoursPerWeek) > 0);
    if (usableSubjects.length === 0) {
      toast.push("Pehle subjects add karo", { type: "error" });
      return;
    }
    if (!routine.trim()) {
      toast.push("Daily routine likho — uthna, college, job, soona", { type: "error" });
      return;
    }
    setBusy(true);
    try {
      const plan = await generateAiTimetable({
        goals: routine.trim(),
        dailyHours: dailyTotal || 3,
        includeWeekends: /sat|sun|weekend/i.test(routine),
        subjectHours: usableSubjects,
      });
      setPreview(plan);
      setStep(3);
    } catch (err) {
      toast.push(err?.message || "AI timetable nahi ban paya", { type: "error", ttl: 6000 });
    } finally {
      setBusy(false);
    }
  }

  async function handleApply() {
    if (!preview?.slots?.length) return;
    setBusy(true);
    try {
      const saved = await applyAiTimetable({
        slots: preview.slots,
        replaceExisting,
      });
      toast.push("Daily timetable set. Aaj ke goals schedule se sync honge.", { type: "success" });
      onApplied(Array.isArray(saved) ? saved : preview.slots);
      onClose();
    } catch (err) {
      toast.push(err?.message || "Could not set timetable", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#fdfaf4] shadow-2xl border border-amber-100">
        <div className="px-4 sm:px-5 py-4 border-b border-amber-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-600 font-bold">Design timetable with AI</p>
            <h2 className="text-lg font-bold text-slate-900">Subjects + daily routine. AI plan bana dega.</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-4 sm:px-5 py-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
          <span className={step === 1 ? "text-indigo-600" : ""}>1. Subjects</span>
          <span>→</span>
          <span className={step === 2 ? "text-indigo-600" : ""}>2. Daily routine</span>
          <span>→</span>
          <span className={step === 3 ? "text-indigo-600" : ""}>3. Set schedule</span>
        </div>

        <div className="px-4 sm:px-5 pb-5">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[13px] text-slate-600">
                Apne subjects add karo aur batao roz kitna time dena hai.
              </p>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((name) => {
                    const added = subjectHours.some((row) => row.name.toLowerCase() === name.toLowerCase());
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => addSubjectByName(name)}
                        className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold ${
                          added
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                        }`}
                      >
                        {added ? "✓" : "+"} {name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                {subjectHours.length === 0 && (
                  <p className="text-[13px] text-slate-400 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center">
                    + se subject add karo.
                  </p>
                )}
                {subjectHours.map((row, index) => (
                  <div key={`${row.name}-${index}`} className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-3 py-2">
                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-800 truncate">{row.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setHours(index, Number(row.hoursPerWeek) - 0.5)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600">−</button>
                      <input
                        type="number"
                        min="0.5"
                        max="8"
                        step="0.5"
                        value={row.hoursPerWeek}
                        onChange={(e) => setHours(index, e.target.value)}
                        className="w-16 h-8 text-center rounded-lg border border-slate-200 text-[13px] font-semibold"
                      />
                      <button type="button" onClick={() => setHours(index, Number(row.hoursPerWeek) + 0.5)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600">+</button>
                      <span className="text-[11px] text-slate-500 w-12">hrs/day</span>
                    </div>
                    <button type="button" onClick={() => removeSubject(index)} className="text-slate-400 hover:text-rose-600">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTypedSubject();
                    }
                  }}
                  placeholder="Naya subject — Java, DSA…"
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-[13px]"
                />
                <button type="button" onClick={addTypedSubject} className="h-10 px-4 rounded-full bg-white border border-slate-200 text-[12px] font-semibold text-slate-700">
                  Add
                </button>
              </div>
              {dailyTotal > 0 && (
                <p className="text-[12px] text-slate-500">Roz padhai: <b className="text-indigo-700">{dailyTotal} hrs</b></p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (subjectHours.length === 0) {
                      toast.push("Pehle kam se kam ek subject add karo", { type: "error" });
                      return;
                    }
                    setStep(2);
                  }}
                  className="w-full sm:w-auto h-11 px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold"
                >
                  Next: daily routine
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[13px] text-slate-600">
                Apna poora din yahin likh do. College, job, gym, uthna-sona — jo bhi fixed hai.
              </p>
              <textarea
                value={routine}
                onChange={(e) => setRoutine(e.target.value)}
                rows={9}
                placeholder={"Example:\nSubah 7 baje uthata hoon\nCollege 9 se 4 tak\nShaam 6 se 7 gym\nRaat 11 baje so jata hoon\nSunday off hota hai"}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                <button type="button" onClick={() => setStep(1)} className="h-11 px-4 rounded-full text-[13px] font-semibold text-slate-600">
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGenerate}
                  className="h-11 px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold disabled:opacity-60"
                >
                  {busy ? "Designing…" : "Generate daily timetable"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && preview && (
            <div className="space-y-4">
              <p className="text-[13px] leading-6 text-slate-600 bg-white rounded-xl border border-amber-100 px-3 py-2.5">
                {preview.summary}
              </p>
              <div className="max-h-[38vh] overflow-y-auto space-y-2 pr-1">
                {(preview.slots || []).map((slot, i) => (
                  <div key={`${slot.day}-${slot.time}-${i}`} className="rounded-xl bg-white border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-800">{slot.title}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                        {slot.day} · {CATEGORY_LABEL[slot.category] || slot.category}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500">
                      {slot.time} – {slot.endTime}
                      {slot.desc ? ` · ${slot.desc}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-2 text-[13px] text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                />
                Replace my current timetable, then copy today’s slots into Daily Goals / Tasks
              </label>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                <button type="button" onClick={() => setStep(2)} className="h-11 px-4 rounded-full text-[13px] font-semibold text-slate-600">
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleApply}
                  className="h-11 px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold disabled:opacity-60"
                >
                  {busy ? "Setting…" : "Set to my schedule"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
