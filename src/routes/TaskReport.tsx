// BaoCaoTienDo.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import html2canvas from "html2canvas-pro";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Employee {
  _id: string;
  fullName: string;
  employeeCode: string;
  position: string;
}

interface TaskUpdate {
  _id?: string;
  date: string;
  note: string;
}

interface Task {
  _id?: string;
  name: string;
  description: string;
  assignedBy: string;
  assignee: string;
  assigneeId: string;
  workDate: string;
  deadline: string;
  priority: "thap" | "tb" | "cao";
  progress: number;
  type: "chinh" | "phu" | "phatsinh";
  status: "todo" | "doing" | "done" | "hold";
  updates: TaskUpdate[];
}

interface WorkReport {
  _id: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  managerId: string;
  managerName: string;
  tasks: Task[];
}

interface WeekOption {
  _id: string;
  weekStart: string;
  weekEnd: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const Route = createFileRoute("/TaskReport")({
  component: TaskReport,
});

const STATUS = {
  todo: { label: "Chưa bắt đầu", color: "#94959B" },
  doing: { label: "Đang làm", color: "#C77B2E" },
  done: { label: "Hoàn thành", color: "#2E7D5B" },
  hold: { label: "Tạm hoãn", color: "#6B7280" },
} as const;

const TYPE = {
  chinh: { label: "Task chính", bg: "#8B1A38", text: "#fff" },
  phu: { label: "Task phụ", bg: "#EFE2EE", text: "#7A3B6B" },
  phatsinh: { label: "Task phát sinh", bg: "#FFF4EA", text: "#A35A24" },
} as const;

const TYPE_ORDER: (keyof typeof TYPE)[] = ["chinh", "phu", "phatsinh"];

const PRIORITY = {
  thap: { label: "Thấp", bg: "#E8F5E9", text: "#2E7D32" },
  tb: { label: "Trung bình", bg: "#FFF3E0", text: "#E65100" },
  cao: { label: "Cao", bg: "#FCE4EC", text: "#B71C1C" },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }

function fmt(d?: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function getWeekKey(d = new Date()) {
  // Dùng local date để tránh lệch múi giờ
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = local.getDay(); // 0=CN
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(local);
  mon.setDate(local.getDate() + diffToMon);
  const thu = new Date(mon);
  thu.setDate(mon.getDate() + 3); // thứ 5 của tuần
  const ys = new Date(thu.getFullYear(), 0, 1);
  const wn = Math.ceil(((thu.getTime() - ys.getTime()) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${String(wn).padStart(2, "0")}`;
}

// Tính bounds từ weekKey (YYYY-Www) — không phụ thuộc vào Date()
function getWeekBounds(weekKeyOrDate?: string | Date) {
  let mon: Date;
  if (!weekKeyOrDate || weekKeyOrDate instanceof Date) {
    // fallback: tính từ date
    const d = weekKeyOrDate instanceof Date ? weekKeyOrDate : new Date();
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = local.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    mon = new Date(local);
    mon.setDate(local.getDate() + diffToMon);
  } else {
    // Parse "YYYY-Www"
    const [yearStr, weekStr] = weekKeyOrDate.split("-W");
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);
    // Thứ 2 của tuần ISO: Jan 4 luôn thuộc tuần 1
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7; // 1=Mon..7=Sun
    mon = new Date(jan4);
    mon.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7);
  }
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const f = (x: Date) => {
    const yy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };
  return { weekStart: f(mon), weekEnd: f(sun) };
}

function labelWeek(wk: string, ws: string, we: string) {
  return `${wk} · ${fmt(ws)} – ${fmt(we)}`;
}

function emptyTask(): Task {
  return {
    name: "", description: "", assignedBy: "Sếp", assignee: "", assigneeId: "",
    workDate: today(), deadline: "", priority: "tb", progress: 0,
    type: "chinh", status: "todo", updates: [],
  };
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ bg, text, children }: { bg: string; text: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: ".7rem", fontWeight: 600, padding: "3px 8px", borderRadius: 6,
      background: bg, color: text, whiteSpace: "nowrap", lineHeight: 1, display: "inline-block",
    }}>{children}</span>
  );
}

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({ pct }: { pct: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={10} />
      <circle cx={55} cy={55} r={r} fill="none" stroke="#fff" strokeWidth={10}
        strokeDasharray={`${circ}`} strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <text x={55} y={50} textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700" fontFamily="inherit">{pct}%</text>
      <text x={55} y={67} textAnchor="middle" fill="rgba(255,255,255,.75)" fontSize="9.5" fontFamily="inherit">Hoàn thành</text>
      <text x={55} y={78} textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="8.5" fontFamily="inherit">chung</text>
    </svg>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const doing = tasks.filter(t => t.status === "doing").length;
  const holdTodo = tasks.filter(t => t.status === "todo" || t.status === "hold").length;
  const overdue = tasks.filter(t => t.deadline && t.status !== "done" && t.deadline < today()).length;

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const stats = [
    { label: "Chưa làm / tạm hoãn", val: holdTodo, dot: "#94959B" },
    { label: "Đang thực hiện", val: doing, dot: "#C77B2E" },
    { label: "Đã hoàn thành", val: done, dot: "#2E7D5B" },
    { label: "Quá hạn", val: overdue, dot: "#B71C1C" },
  ];

  return (
    <div style={{
      background: "linear-gradient(150deg,#8B1A38,#5E1226)",
      borderRadius: 16, padding: "20px 24px",
      display: "flex", gap: 0, alignItems: "center", marginBottom: 18,
      boxShadow: "0 4px 20px rgba(94,18,38,.2)",
    }}>
      {/* Circular */}
      <div style={{ flex: "none", marginRight: 24 }}>
        <CircularProgress pct={pct} />
        <div style={{ textAlign: "center", color: "rgba(255,255,255,.7)", fontSize: ".72rem", marginTop: 4 }}>
          {done}/{total} công việc đã xong
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "14px 16px",
            flex: "1 1 110px", border: "1px solid rgba(255,255,255,.15)",
          }}>
            <div style={{ fontWeight: 700, fontSize: "1.7rem", color: "#fff", lineHeight: 1 }}>{s.val}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
              <span style={{ fontSize: ".72rem", color: "rgba(255,255,255,.75)", lineHeight: 1.3 }}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onUpdate }: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const st = STATUS[task.status];
  const latest = [...(task.updates || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
  const priority = PRIORITY[task.priority as keyof typeof PRIORITY] ?? PRIORITY["tb"];
  const progress = task.progress ?? 0;

  const progressColor = task.status === "done" ? "#2E7D5B"
    : task.status === "hold" ? "#6B7280"
      : progress >= 70 ? "#2E7D5B"
        : progress >= 30 ? "#C77B2E"
          : "#8B1A38";

  const isOverdue = task.deadline && task.status !== "done" && task.deadline < today();

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      padding: "14px 16px",
      boxShadow: "0 1px 3px rgba(94,18,38,.04), 0 2px 8px rgba(94,18,38,.06)",
      border: "1px solid #F0E0E5",
    }}>
      {/* Head row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{
          fontWeight: 600, fontSize: ".93rem", color: "#5E1226", lineHeight: 1.35,
        }}>{task.name}</div>
        <div style={{ display: "flex", gap: 4, flex: "none", flexWrap: "wrap", alignItems: "center" }}>
          <Pill bg={TYPE[task.type].bg} text={TYPE[task.type].text}>{TYPE[task.type].label}</Pill>
          <Pill bg={st.color} text="#fff">{st.label}</Pill>
          <Pill bg={priority.bg} text={priority.text}>{priority.label}</Pill>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div style={{ fontSize: ".82rem", color: "#6a4a52", marginTop: 6, lineHeight: 1.5 }}>
          {task.description}
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: "flex", gap: "3px 14px", flexWrap: "wrap", marginTop: 8, fontSize: ".78rem", color: "#90757C" }}>
        {task.assignee && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 3, verticalAlign: "middle" }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Người giao: <b style={{
              color: "#3A2228", display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}>{task.assignee}</b>
          </span>
        )}
        {task.assignedBy && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 3, verticalAlign: "middle" }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Người giao: <b style={{
              color: "#3A2228", display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}>{task.assignedBy}</b>
          </span>
        )}
        {task.deadline && (
          <span style={{
            color: isOverdue ? "#B71C1C" : "#90757C", display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 3, verticalAlign: "middle" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Hạn: <b style={{ color: isOverdue ? "#B71C1C" : "#3A2228" }}>{fmt(task.deadline)}</b>
            {isOverdue && <span style={{ marginLeft: 4, fontSize: ".68rem", background: "#FCE4EC", color: "#B71C1C", padding: "1px 5px", borderRadius: 8, fontWeight: 700 }}>Quá hạn</span>}
          </span>
        )}
      </div>

      {/* Progress bar — full width */}
      <div style={{ marginTop: 11 }}>
        <div style={{ height: 7, background: "#F5EAED", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: progressColor,
            borderRadius: 6,
            transition: "width .4s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 3 }}>
          <span style={{ fontSize: ".7rem", fontWeight: 700, color: progressColor }}>{progress}%</span>
        </div>
      </div>

      {/* Latest note */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {latest ? (
          <div style={{ fontSize: ".77rem", color: "#90757C", marginTop: 6 }}>
            Cập nhật: <b style={{ color: "#3A2228" }}>{latest.note}</b>
            <span style={{ marginLeft: 6, opacity: .7 }}>· {fmt(latest.date)}</span>
          </div>
        ) : (
          <div style={{ fontSize: ".75rem", color: "#C9B3B7", marginTop: 6, fontStyle: "italic" }}>
            Chưa có cập nhật tiến độ nào
          </div>
        )}
        {/* Actions */}
        <div className="no-print" style={{ display: "flex", gap: 6, marginTop: 11, justifyContent: "flex-end" }}>
          <IBtn onClick={onUpdate} primary>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: "middle" }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Cập nhật
          </IBtn>
          <IBtn onClick={onEdit}>Sửa</IBtn>
          <IBtn onClick={onDelete}>Xóa</IBtn>
        </div>
      </div>


      {/* History */}
      {(task.updates || []).length > 0 && (
        <>
          <button onClick={() => setShowHistory(v => !v)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: ".73rem",
            color: "#8B1A38", fontWeight: 600, padding: "4px 0", marginTop: 3,
          }}>
            Lịch sử ({task.updates.length}) {showHistory ? "▴" : "▾"}
          </button>
          {showHistory && (
            <div style={{ borderTop: "1px dashed #F0D8DE", marginTop: 5, paddingTop: 7 }}>
              {[...task.updates].sort((a, b) => b.date.localeCompare(a.date)).map((u, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, fontSize: ".78rem", padding: "4px 0",
                  borderBottom: i < task.updates.length - 1 ? "1px solid #faf0f2" : "none",
                }}>
                  <span style={{ color: "#B5703F", fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(u.date)}</span>
                  <span style={{ color: "#5a4248" }}>{u.note}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}


    </div>
  );
}

function IBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      border: primary ? "none" : "1px solid #E8D0D6",
      background: primary ? "#8B1A38" : "#fff",
      color: primary ? "#fff" : "#5E1226",
      borderRadius: 7, padding: "6px 12px", fontSize: ".77rem", fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center",
    }}>{children}</button>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({ task, managerName, onSave, onClose }: {
  task: Partial<Task>;
  managerName: string;
  onSave: (t: Task) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Task>({ ...emptyTask(), ...task });
  const set = (k: keyof Task, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Scrim onClose={onClose}>
      <Modal title={(task._id ? "Sửa" : "Thêm") + " công việc · " + managerName} onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Tên công việc *">
            <input autoFocus value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="VD: Cập nhật bảng giá Shopee" style={inputStyle} />
          </Field>
          <Field label="Mô tả">
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Chi tiết yêu cầu…"
              style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Người giao">
              <input value={form.assignedBy} onChange={e => set("assignedBy", e.target.value)}
                placeholder="Sếp" style={inputStyle} />
            </Field>
            <Field label="Người thực hiện">
              <input value={form.assignee} onChange={e => set("assignee", e.target.value)}
                placeholder="Tên nhân viên" style={inputStyle} />
            </Field>
          </div>
          <Field label="Ngày thực hiện">
            <input type="date" value={form.workDate} onChange={e => set("workDate", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Hạn chót (deadline)">
            <input type="date" value={form.deadline || ""} onChange={e => set("deadline", e.target.value)} style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Loại công việc">
              <select value={form.type} onChange={e => set("type", e.target.value as Task["type"])} style={inputStyle}>
                <option value="chinh">Task chính</option>
                <option value="phu">Task phụ</option>
                <option value="phatsinh">Task phát sinh</option>
              </select>
            </Field>
            <Field label="Mức độ ưu tiên">
              <select value={form.priority || "tb"} onChange={e => set("priority", e.target.value as Task["priority"])} style={inputStyle}>
                <option value="thap">Thấp</option>
                <option value="tb">Trung bình</option>
                <option value="cao">Cao</option>
              </select>
            </Field>
          </div>
        </div>
        <ModalFoot onCancel={onClose} onConfirm={() => {
          if (!form.name.trim()) { alert("Vui lòng nhập tên công việc."); return; }
          onSave(form);
        }} confirmLabel="Lưu công việc" />
      </Modal>
    </Scrim>
  );
}

// ─── Update Modal ─────────────────────────────────────────────────────────────
function UpdateModal({ task, onSave, onClose }: {
  task: Task;
  onSave: (status: Task["status"], note: string, date: string, progress: number) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [progress, setProgress] = useState(task.progress ?? 0);

  const handleStatusChange = (s: Task["status"]) => {
    setStatus(s);
    if (s === "done") setProgress(100);
    if (s === "todo") setProgress(0);
  };

  const progressColor = status === "done" ? "#2E7D5B"
    : progress >= 70 ? "#2E7D5B"
      : progress >= 30 ? "#C77B2E"
        : "#8B1A38";

  return (
    <Scrim onClose={onClose}>
      <Modal title="Cập nhật công việc" onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: ".84rem", color: "#5a4248", fontWeight: 600, lineHeight: 1.4 }}>{task.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Trạng thái">
              <select value={status} onChange={e => handleStatusChange(e.target.value as Task["status"])} style={inputStyle}>
                <option value="todo">Chưa bắt đầu</option>
                <option value="doing">Đang làm</option>
                <option value="done">Hoàn thành</option>
                <option value="hold">Tạm hoãn</option>
              </select>
            </Field>
            <Field label="Ngày">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label={`Tiến độ: ${progress}%`}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range" min={0} max={100} step={5} value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                style={{ flex: 1, accentColor: progressColor, cursor: "pointer" }}
              />
              <span style={{
                minWidth: 38, textAlign: "center", fontWeight: 700, fontSize: ".82rem",
                color: progressColor, background: "#FBF6F2", border: "1px solid #F0D8DE",
                borderRadius: 7, padding: "3px 6px",
              }}>{progress}%</span>
            </div>
            <div style={{ height: 5, background: "#F5EAED", borderRadius: 6, overflow: "hidden", marginTop: 6 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: progressColor, borderRadius: 6, transition: "width .3s" }} />
            </div>
          </Field>

          <Field label="Ghi chú *">
            <textarea autoFocus value={note} onChange={e => setNote(e.target.value)}
              placeholder="VD: Đã xong bảng giá, đang chờ sếp duyệt…"
              style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} />
          </Field>
        </div>
        <ModalFoot onCancel={onClose} onConfirm={() => {
          if (!note.trim()) { alert("Vui lòng nhập ghi chú."); return; }
          onSave(status, note, date, progress);
        }} confirmLabel="Ghi nhận" />
      </Modal>
    </Scrim>
  );
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────
function Scrim({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(58,34,40,.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "32px 16px", zIndex: 100, overflowY: "auto",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18, width: "100%", maxWidth: 480,
      boxShadow: "0 24px 60px rgba(58,18,30,.3)", animation: "pop .18s ease",
    }}>
      <div style={{
        background: "linear-gradient(150deg,#8B1A38,#5E1226)", color: "#fff",
        padding: "15px 20px", borderRadius: "18px 18px 0 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{title}</span>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,.18)", border: "none", color: "#fff",
          width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: "1.1rem", lineHeight: 1,
        }}>×</button>
      </div>
      <div style={{ padding: "16px 20px", maxHeight: "62vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function ModalFoot({ onCancel, onConfirm, confirmLabel }: { onCancel: () => void; onConfirm: () => void; confirmLabel: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16,
      paddingTop: 14, borderTop: "1px solid #F0D8DE",
    }}>
      <button onClick={onCancel} style={btnStyle}>Hủy</button>
      <button onClick={onConfirm} style={{ ...btnStyle, background: "#8B1A38", color: "#fff", border: "none" }}>
        {confirmLabel}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: ".74rem", fontWeight: 600, color: "#3A2228", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid #F0D8DE",
  fontFamily: "inherit", fontSize: ".87rem", color: "#3A2228", background: "#FBF6F2",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  border: "1px solid #F0D8DE", background: "#fff", color: "#3A2228",
  borderRadius: 9, padding: "8px 16px", fontSize: ".86rem", fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};

// ─── Print Button ─────────────────────────────────────────────────────────────
function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={topBtnStyle}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      In báo cáo
    </button>
  );
}

// ─── Print Report ─────────────────────────────────────────────────────────────
function PrintReport({ tasks, managerName, weekKey, weekStart, weekEnd }: {
  tasks: Task[];
  managerName: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
}) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const doing = tasks.filter(t => t.status === "doing").length;
  const todo = tasks.filter(t => t.status === "todo").length;
  const hold = tasks.filter(t => t.status === "hold").length;

  const printedAt = new Date().toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="print-only" style={{ display: "none" }}>
      <div style={{
        background: "linear-gradient(135deg,#8B1A38 0%,#5E1226 100%)",
        color: "#fff", padding: "24px 28px 20px",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: ".7rem", letterSpacing: "0.12em", textTransform: "uppercase", opacity: .7, marginBottom: 4 }}>
              Cinnamon Forest · Báo cáo tiến độ
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.2 }}>{managerName}</div>
            <div style={{ fontSize: ".82rem", opacity: .85, marginTop: 4 }}>
              {weekKey} · {fmt(weekStart)} – {fmt(weekEnd)}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: ".72rem", opacity: .7 }}>
            <div>In lúc {printedAt}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 18, flexWrap: "wrap" }}>
          {[
            { label: "Tổng", val: total },
            { label: "Chưa bắt đầu", val: todo },
            { label: "Đang làm", val: doing },
            { label: "Hoàn thành", val: done },
            { label: "Tạm hoãn", val: hold },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: ".65rem", opacity: .75, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {TYPE_ORDER.map(ty => {
        const items = tasks.filter(t => (t.type || "chinh") === ty);
        if (!items.length) return null;
        return (
          <div key={ty} style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "2px solid #F0D8DE", paddingBottom: 6, marginBottom: 10,
            }}>
              <span style={{
                background: TYPE[ty].bg, color: TYPE[ty].text,
                fontSize: ".68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              }}>{TYPE[ty].label}</span>
              <span style={{ fontSize: ".72rem", color: "#90757C" }}>{items.length} việc</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8rem" }}>
              <thead>
                <tr style={{ background: "#FCF0F3" }}>
                  <th style={thStyle}>STT</th>
                  <th style={thStyle}>Tên công việc</th>
                  <th style={thStyle}>Người thực hiện</th>
                  <th style={thStyle}>Ngày TH</th>
                  <th style={thStyle}>Giao bởi</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thStyle}>Cập nhật gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t, idx) => {
                  const latest = [...(t.updates || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
                  const st = STATUS[t.status];
                  return (
                    <tr key={t._id || idx} style={{ borderBottom: "1px solid #F5EAED" }}>
                      <td style={{ ...tdStyle, textAlign: "center", color: "#90757C" }}>{idx + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: "#5E1226", maxWidth: 180 }}>
                        <span>{t.name}</span>
                        {t.description && (
                          <div style={{ fontWeight: 400, color: "#90757C", fontSize: ".73rem", marginTop: 2, lineHeight: 1.4 }}>
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>{t.assignee || "—"}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{fmt(t.workDate)}</td>
                      <td style={tdStyle}>{t.assignedBy || "—"}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <span style={{
                          background: st.color, color: "#fff",
                          fontSize: ".65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                        }}>{st.label}</span>
                      </td>
                      <td style={{ ...tdStyle, color: "#5a4248", maxWidth: 160 }}>
                        {latest
                          ? <><b style={{ color: "#B5703F", marginRight: 4 }}>{fmt(latest.date)}</b>{latest.note}</>
                          : <span style={{ color: "#C9B3B7" }}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <div style={{
        marginTop: 24, paddingTop: 12, borderTop: "1px solid #F0D8DE",
        fontSize: ".68rem", color: "#C9B3B7", textAlign: "center",
      }}>
        Cinnamon Forest · Báo cáo tiến độ · {managerName} · {weekKey}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "7px 10px", textAlign: "left", fontWeight: 700,
  fontSize: ".72rem", color: "#5E1226", borderBottom: "1px solid #F0D8DE",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px", verticalAlign: "top", color: "#3A2228",
};

// ─── Top action button style ──────────────────────────────────────────────────
const topBtnStyle: React.CSSProperties = {
  background: "#fff", color: "#3A2228",
  border: "1px solid #E8D0D6", borderRadius: 8,
  padding: "8px 13px", fontFamily: "inherit", fontWeight: 500, fontSize: ".82rem",
  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TaskReport() {
  const [managers, setManagers] = useState<Employee[]>([]);
  const [activeManagerId, setActiveManagerId] = useState<string>("");
  const [report, setReport] = useState<WorkReport | null>(null);
  const [weekKey, setWeekKey] = useState(getWeekKey());
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Partial<Task> }>({ open: false, task: {} });
  const [updateModal, setUpdateModal] = useState<{ open: boolean; taskId: string }>({ open: false, taskId: "" });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [sortBy, setSortBy] = useState("deadline");

  const [savingImage, setSavingImage] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/employees`)
      .then(r => r.json())
      .then(d => {
        const mgrs = (d.data || []).filter((e: Employee) => e.position === "Quản lý");
        setManagers(mgrs);
        if (mgrs.length > 0) setActiveManagerId(mgrs[0]._id);
      })
      .catch(console.error);
  }, []);

  const loadWeeks = useCallback(() => {
    fetch(`${API_BASE}/work-reports/weeks`)
      .then(r => r.json())
      .then(d => {
        const list: WeekOption[] = d.data || [];
        const cur = getWeekKey();
        const bounds = getWeekBounds(cur);
        if (!list.find(w => w._id === cur)) {
          list.unshift({ _id: cur, weekStart: bounds.weekStart, weekEnd: bounds.weekEnd });
        }
        setWeeks(list);
      });
  }, []);

  useEffect(() => { loadWeeks(); }, [loadWeeks]);

  const loadReport = useCallback(() => {
    if (!activeManagerId) return;
    setLoading(true);
    fetch(`${API_BASE}/work-reports?weekKey=${weekKey}&managerId=${activeManagerId}`)
      .then(r => r.json())
      .then(d => { setReport((d.data || [])[0] || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeManagerId, weekKey]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleSaveImage = async () => {
    if (!captureRef.current || savingImage) return;
    setSavingImage(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#F7F2F4",
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          // Ẩn các nút action trong ảnh chụp
          doc.querySelectorAll(".no-print").forEach((el) => {
            (el as HTMLElement).style.display = "none";
          });
        },
      });
      const link = document.createElement("a");
      const mgr = managers.find(m => m._id === activeManagerId);
      link.download = `bao-cao-${mgr?.fullName?.replace(/\s+/g, "-") ?? "task"}-${weekKey}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Lỗi lưu ảnh:", err);
      alert("Không thể lưu ảnh. Vui lòng thử lại.");
    } finally {
      setSavingImage(false);
    }
  };

  const saveReport = async (tasks: Task[]) => {
    const mgr = managers.find(m => m._id === activeManagerId);
    if (!mgr) return;
    const { weekStart, weekEnd } = getWeekBounds(weekKey);
    const isObjectId = (id?: string) => /^[a-f\d]{24}$/i.test(id || "");

    const cleanTasks = tasks.map(t => ({
      ...(isObjectId(t._id) ? { _id: t._id } : {}),
      name: t.name, description: t.description, assignedBy: t.assignedBy,
      assignee: t.assignee, assigneeId: t.assigneeId, deadline: t.deadline,
      priority: t.priority, type: t.type, status: t.status, progress: t.progress ?? 0,
      updates: (t.updates || []).map(u => ({
        ...(isObjectId(u._id) ? { _id: u._id } : {}),
        date: u.date, note: u.note,
      })),
    }));

    const res = await fetch(`${API_BASE}/work-reports/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: mgr._id, managerName: mgr.fullName,
        weekKey, weekStart, weekEnd, tasks: cleanTasks,
      }),
    });
    const d = await res.json();
    if (d.success) { setReport(d.data); loadWeeks(); }
  };

  const currentTasks: Task[] = report?.tasks || [];

  // Unique assignees for filter
  const assignees = Array.from(new Set(currentTasks.map(t => t.assignee).filter(Boolean)));

  const displayed = currentTasks
    .filter(t => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterType && t.type !== filterType) return false;
      if (filterAssignee && t.assignee !== filterAssignee) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.name + " " + t.description + " " + t.assignee).toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "deadline") return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      if (sortBy === "priority") {
        const order = { cao: 0, tb: 1, thap: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      }
      if (sortBy === "progress") return b.progress - a.progress;
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  const handleSaveTask = async (form: Task) => {
    const newTasks = form._id
      ? currentTasks.map(t => t._id === form._id ? { ...t, ...form } : t)
      : [...currentTasks, { ...form, _id: uid() }];
    await saveReport(newTasks);
    setTaskModal({ open: false, task: {} });
  };

  const handleDeleteTask = async (taskId: string) => {
    const t = currentTasks.find(t => t._id === taskId);
    if (!t || !confirm(`Xóa "${t.name}"?`)) return;
    await saveReport(currentTasks.filter(t => t._id !== taskId));
  };

  const handleUpdate = async (status: Task["status"], note: string, date: string, progress: number) => {
    const newTasks = currentTasks.map(t => {
      if (t._id !== updateModal.taskId) return t;
      return { ...t, status, progress, updates: [...(t.updates || []), { _id: uid(), date, note }] };
    });
    await saveReport(newTasks);
    setUpdateModal({ open: false, taskId: "" });
  };

  const activeManager = managers.find(m => m._id === activeManagerId);
  const curWeek = weeks.find(w => w._id === weekKey);
  const curWeekBounds = getWeekBounds(weekKey);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #3A2228; -webkit-font-smoothing: antialiased; }
        @keyframes pop { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: none; opacity: 1; } }
        select:focus, input:focus, textarea:focus { border-color: #8B1A38 !important; outline: none; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #F0D8DE; border-radius: 4px; }

        @media print {
          @page { size: A4 landscape; margin: 12mm 14mm; }
          body {
            background: #fff !important;
            font-family: 'Be Vietnam Pro', Arial, sans-serif;
            font-size: 11px; color: #3A2228;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > * { display: none !important; }
          body > div { display: block !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          [style*="position: fixed"] { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F7F2F4" }}>

        {activeManager && curWeek && (
          <PrintReport
            tasks={currentTasks}
            managerName={activeManager.fullName}
            weekKey={weekKey}
            weekStart={curWeekBounds.weekStart}
            weekEnd={curWeekBounds.weekEnd}
          />
        )}

        {/* ── App Header ── */}
        <div className="no-print" style={{
          background: "#fff", borderBottom: "1px solid #EDD8DE",
          padding: "0 20px",
        }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, height: 56 }}>
            {/* Logo */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flex: "none",
              background: "linear-gradient(150deg,#8B1A38,#5E1226)",
              display: "grid", placeItems: "center",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: ".95rem", color: "#5E1226", lineHeight: 1.1 }}>Báo cáo tiến độ công việc</div>
              <div style={{ fontSize: ".68rem", color: "#90757C", marginTop: 1 }}>CINNAMON FOREST</div>
            </div>

            {/* Manager tabs in header */}
            {managers.length > 0 && (
              <div style={{ display: "flex", gap: 4 }}>
                {managers.map(m => {
                  const active = m._id === activeManagerId;
                  return (
                    <button key={m._id} onClick={() => setActiveManagerId(m._id)} style={{
                      border: active ? "none" : "1px solid #F0D8DE",
                      background: active ? "#8B1A38" : "transparent",
                      color: active ? "#fff" : "#5E1226",
                      borderRadius: 20, padding: "5px 14px", fontSize: ".8rem", fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>{m.fullName}</button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="no-print" style={{
          background: "#fff", borderBottom: "1px solid #EDD8DE",
          padding: "0 20px",
        }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, height: 48 }}>
            {/* Left: week selector + utility buttons */}
            <button onClick={handleSaveImage} disabled={savingImage || currentTasks.length === 0} style={{
              ...topBtnStyle,
              opacity: (savingImage || currentTasks.length === 0) ? 0.5 : 1,
              cursor: (savingImage || currentTasks.length === 0) ? "not-allowed" : "pointer",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              {savingImage ? "Đang lưu…" : "Lưu ảnh"}
            </button>
            {activeManager && curWeek && currentTasks.length > 0 && <PrintButton />}
            {/* <button style={topBtnStyle}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Xuất Excel
            </button> */}

            <div style={{ flex: 1 }} />

            {/* Week selector */}
            <select value={weekKey} onChange={e => setWeekKey(e.target.value)}
              style={{ ...inputStyle, width: "auto", fontSize: ".8rem", background: "#fff", padding: "6px 10px" }}>
              {weeks.map(w => (
                <option key={w._id} value={w._id}>{labelWeek(w._id, getWeekBounds(w._id).weekStart, getWeekBounds(w._id).weekEnd)}</option>
              ))}
            </select>

            {/* Add task */}
            <button onClick={() => setTaskModal({
              open: true,
              task: { assignee: activeManager?.fullName || "", assigneeId: activeManagerId },
            })} style={{
              background: "#8B1A38", color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 14px", fontFamily: "inherit", fontWeight: 700, fontSize: ".82rem",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Thêm công việc
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div ref={captureRef} style={{ maxWidth: 960, margin: "0 auto", padding: "20px 20px 60px" }}>

          {/* Stats */}
          {activeManager && <StatsBar tasks={currentTasks} />}

          {/* Filter toolbar */}
          {currentTasks.length > 0 && (
            <div className="no-print" style={{
              background: "#fff", borderRadius: 12, border: "1px solid #EDD8DE",
              padding: "10px 14px", marginBottom: 16,
              display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
            }}>
              {/* Search */}
              <div style={{ position: "relative", flex: "1 1 180px" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#90757C" strokeWidth="1.8" strokeLinecap="round"
                  style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên việc, người giao, người k…"
                  style={{ ...inputStyle, paddingLeft: 28, background: "#F7F2F4", border: "1px solid #EDD8DE" }} />
              </div>

              <FilterSelect value={filterType} onChange={setFilterType} label="Tất cả loại việc">
                <option value="">Tất cả loại việc</option>
                <option value="chinh">Task chính</option>
                <option value="phu">Task phụ</option>
                <option value="phatsinh">Phát sinh</option>
              </FilterSelect>

              <FilterSelect value={filterStatus} onChange={setFilterStatus} label="Tất cả trạng thái">
                <option value="">Tất cả trạng thái</option>
                <option value="todo">Chưa bắt đầu</option>
                <option value="doing">Đang làm</option>
                <option value="done">Hoàn thành</option>
                <option value="hold">Tạm hoãn</option>
              </FilterSelect>

              <FilterSelect value={filterAssignee} onChange={setFilterAssignee} label="Tất cả người làm">
                <option value="">Tất cả người làm</option>
                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
              </FilterSelect>

              <FilterSelect value={sortBy} onChange={setSortBy} label="Sắp xếp">
                <option value="deadline">Sắp theo hạn chót</option>
                <option value="priority">Sắp theo ưu tiên</option>
                <option value="progress">Sắp theo tiến độ</option>
                <option value="status">Sắp theo trạng thái</option>
              </FilterSelect>
            </div>
          )}

          {/* Task list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "#90757C" }}>Đang tải…</div>
          ) : currentTasks.length === 0 ? (
            <div style={{
              background: "#fff", border: "1px dashed #F0D8DE", borderRadius: 16,
              padding: "44px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>📋</div>
              <div style={{ fontWeight: 700, color: "#5E1226", marginBottom: 6 }}>
                {activeManager?.fullName} chưa có công việc tuần này
              </div>
              <div style={{ color: "#90757C", fontSize: ".86rem", marginBottom: 16 }}>Tuần {weekKey}</div>
              <button onClick={() => setTaskModal({
                open: true,
                task: { assignee: activeManager?.fullName || "", assigneeId: activeManagerId },
              })} style={{
                background: "#8B1A38", color: "#fff", border: "none", borderRadius: 10,
                padding: "9px 18px", fontFamily: "inherit", fontWeight: 700, fontSize: ".88rem", cursor: "pointer",
              }}>+ Thêm công việc</button>
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#90757C", fontSize: ".88rem" }}>
              Không tìm thấy công việc phù hợp.
            </div>
          ) : (
            <div>
              {TYPE_ORDER.map(ty => {
                const items = displayed.filter(t => (t.type || "chinh") === ty);
                if (!items.length) return null;
                return (
                  <div key={ty} style={{ marginBottom: 20 }}>
                    {/* Type header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                      <Pill bg={TYPE[ty].bg} text={TYPE[ty].text}>{TYPE[ty].label}</Pill>
                      <span style={{ fontSize: ".75rem", color: "#90757C", fontWeight: 600 }}>{items.length} việc</span>
                      <div style={{ flex: 1, height: 1, background: "#EDD8DE" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map(t => (
                        <TaskCard key={t._id} task={t}
                          onEdit={() => setTaskModal({ open: true, task: t })}
                          onDelete={() => handleDeleteTask(t._id!)}
                          onUpdate={() => setUpdateModal({ open: true, taskId: t._id! })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          managerName={activeManager?.fullName || ""}
          onSave={handleSaveTask}
          onClose={() => setTaskModal({ open: false, task: {} })}
        />
      )}
      {updateModal.open && (() => {
        const t = currentTasks.find(t => t._id === updateModal.taskId);
        if (!t) return null;
        return <UpdateModal task={t} onSave={handleUpdate} onClose={() => setUpdateModal({ open: false, taskId: "" })} />;
      })()}
    </>
  );
}

// ─── FilterSelect helper ──────────────────────────────────────────────────────
function FilterSelect({ value, onChange, children }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      padding: "8px 10px", borderRadius: 8, border: "1px solid #EDD8DE",
      fontFamily: "inherit", fontSize: ".8rem", color: "#3A2228", background: "#F7F2F4",
      cursor: "pointer",
    }}>
      {children}
    </select>
  );
}