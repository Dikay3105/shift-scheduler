import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from "react";
import {
  Users, Key, Shield, Plus, Search, Pencil, Trash2,
  ChevronDown, ChevronUp, Eye, EyeOff, X, Check,
  Warehouse, RefreshCw, UserCog
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AdminHeader from "@/components/AdminHeader";


const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ── Types ────────────────────────────────────────────────────────
type Role = {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  defaultWarehousePermissions: string[];
};

type WarehouseAccess = {
  warehouseId: string;
  warehouseName?: string;
  permissions: string[];
};

type Employee = {
  _id: string;
  employeeCode: string;
  fullName: string;
  email?: string;
  username?: string;
  position?: string;
  department?: string;
  phone?: string;
  isActive: boolean;
  role?: Role | null;
  warehouseAccess: WarehouseAccess[];
};

// ── Permission labels ────────────────────────────────────────────
const WAREHOUSE_PERMISSION_LABELS: Record<string, string> = {
  wh_view: "Xem kho",
  wh_entry_read: "Đọc phiếu",
  wh_entry_create: "Tạo phiếu",
  wh_entry_update: "Sửa phiếu",
  wh_entry_delete: "Xoá phiếu",
  wh_entry_inline_edit: "Sửa inline",
  wh_product_create: "Thêm SP",
  wh_product_read: "Xem SP",
  wh_product_update: "Sửa SP",
  wh_product_delete: "Xoá SP",
};

const ALL_WH_PERMISSIONS = Object.keys(WAREHOUSE_PERMISSION_LABELS);

// ── API helpers ──────────────────────────────────────────────────
const api = {
  getEmployees: () => fetch(`${API_BASE}/employees`, { credentials: "include" }).then(r => r.json()),
  createEmployee: (data: any) => fetch(`${API_BASE}/employees`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }).then(r => r.json()),
  updateEmployee: (id: string, data: any) => fetch(`${API_BASE}/employees/${id}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }).then(r => r.json()),
  deleteEmployee: (id: string) => fetch(`${API_BASE}/employees/${id}`, {
    method: "DELETE", credentials: "include",
  }).then(r => r.json()),
  changePassword: (id: string, password: string) => fetch(`${API_BASE}/employees/${id}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
  }).then(r => r.json()),
  assignRole: (id: string, roleId: string | null) => fetch(`${API_BASE}/employees/${id}/role`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleId }),
  }).then(r => r.json()),
  setWarehouseAccess: (id: string, data: WarehouseAccess[]) => fetch(`${API_BASE}/employees/${id}/warehouse-access`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }).then(r => r.json()),
  getRoles: () => fetch(`${API_BASE}/roles`, { credentials: "include" }).then(r => r.json()),
};

export const Route = createFileRoute("/employee")({
  component: EmployeeTab,
});

// ════════════════════════════════════════════════════════════════
export default function EmployeeTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [modal, setModal] = useState<
    null | "create" | "edit" | "password" | "permission"
  >(null);
  const [selected, setSelected] = useState<Employee | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, roleRes] = await Promise.all([api.getEmployees(), api.getRoles()]);
      setEmployees(empRes.data || []);
      setRoles(roleRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = employees.filter(e =>
    !search ||
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (type: typeof modal, emp?: Employee) => {
    setSelected(emp || null);
    setModal(type);
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  return (
    <div className="space-y-4">
         <AdminHeader
                title="Quản lý nhân viên"
                description="Thông tin, tài khoản và quyền nhân viên"
            />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="w-64 rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <button
          onClick={() => openModal("create")}
          className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition"
        >
          <Plus className="h-4 w-4" /> Thêm nhân viên
        </button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Không có nhân viên nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Nhân viên</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Kho được truy cập</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(emp => (
                    <tr key={emp._id} className="hover:bg-muted/20 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium">{emp.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.employeeCode} · {emp.email || emp.username || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {emp.role ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            <Shield className="h-3 w-3" />
                            {emp.role.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa gán</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {emp.warehouseAccess?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {emp.warehouseAccess.map(w => (
                              <span key={w.warehouseId} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                <Warehouse className="h-3 w-3" />
                                {w.warehouseName || w.warehouseId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Không có</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex h-2 w-2 rounded-full ${emp.isActive ? "bg-green-500" : "bg-red-400"}`} />
                        <span className="ml-2 text-xs">{emp.isActive ? "Hoạt động" : "Vô hiệu"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn icon={<Pencil className="h-3.5 w-3.5" />} label="Sửa" onClick={() => openModal("edit", emp)} />
                          <ActionBtn icon={<Key className="h-3.5 w-3.5" />} label="Đổi mật khẩu" onClick={() => openModal("password", emp)} />
                          <ActionBtn icon={<UserCog className="h-3.5 w-3.5" />} label="Phân quyền" onClick={() => openModal("permission", emp)} />
                          <ActionBtn icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} label="Xoá" onClick={async () => {
                            if (!confirm(`Vô hiệu hoá ${emp.fullName}?`)) return;
                            await api.deleteEmployee(emp._id);
                            fetchAll();
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {modal === "create" && (
        <CreateModal onClose={closeModal} onSave={fetchAll} />
      )}
      {modal === "edit" && selected && (
        <EditModal employee={selected} onClose={closeModal} onSave={fetchAll} />
      )}
      {modal === "password" && selected && (
        <PasswordModal employee={selected} onClose={closeModal} />
      )}
      {modal === "permission" && selected && (
        <PermissionModal employee={selected} roles={roles} onClose={closeModal} onSave={fetchAll} />
      )}
    </div>
  );
}

// ── Small action button ──────────────────────────────────────────
function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
    >
      {icon}
    </button>
  );
}

// ── Modal wrapper ────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// ── Create Employee Modal ────────────────────────────────────────
function CreateModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ fullName: "", employeeCode: "", email: "", username: "", password: "", position: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.fullName || !form.employeeCode) return setErr("Vui lòng điền tên và mã nhân viên");
    setSaving(true);
    try {
      const res = await api.createEmployee(form);
      if (!res.success) return setErr(res.message || "Lỗi tạo nhân viên");
      onSave(); onClose();
    } catch { setErr("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Thêm nhân viên" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Họ tên *">
            <input className={inputCls} value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Mã NV *">
            <input className={inputCls} value={form.employeeCode} onChange={e => set("employeeCode", e.target.value)} placeholder="NV001" />
          </Field>
        </div>
        <Field label="Email">
          <input className={inputCls} value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@company.com" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username">
            <input className={inputCls} value={form.username} onChange={e => set("username", e.target.value)} placeholder="nguyenvana" />
          </Field>
          <Field label="Mật khẩu">
            <input className={inputCls} type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chức vụ">
            <input className={inputCls} value={form.position} onChange={e => set("position", e.target.value)} placeholder="Nhân viên" />
          </Field>
          <Field label="SĐT">
            <input className={inputCls} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="09xxxxxxxx" />
          </Field>
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition">Huỷ</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition disabled:opacity-50">
            {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Tạo
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit Employee Modal ──────────────────────────────────────────
function EditModal({ employee, onClose, onSave }: { employee: Employee; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    fullName: employee.fullName,
    email: employee.email || "",
    username: employee.username || "",
    position: employee.position || "",
    phone: employee.phone || "",
    isActive: employee.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.updateEmployee(employee._id, form);
      if (!res.success) return setErr(res.message || "Lỗi cập nhật");
      onSave(); onClose();
    } catch { setErr("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Sửa: ${employee.fullName}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Họ tên">
          <input className={inputCls} value={form.fullName} onChange={e => set("fullName", e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={inputCls} value={form.email} onChange={e => set("email", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username">
            <input className={inputCls} value={form.username} onChange={e => set("username", e.target.value)} />
          </Field>
          <Field label="SĐT">
            <input className={inputCls} value={form.phone} onChange={e => set("phone", e.target.value)} />
          </Field>
        </div>
        <Field label="Chức vụ">
          <input className={inputCls} value={form.position} onChange={e => set("position", e.target.value)} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} className="rounded" />
          Tài khoản đang hoạt động
        </label>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition">Huỷ</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition disabled:opacity-50">
            {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Lưu
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Password Modal ───────────────────────────────────────────────
function PasswordModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (pw.length < 6) return setErr("Mật khẩu tối thiểu 6 ký tự");
    if (pw !== confirm) return setErr("Mật khẩu không khớp");
    setSaving(true);
    try {
      const res = await api.changePassword(employee._id, pw);
      if (!res.success) return setErr(res.message || "Lỗi đổi mật khẩu");
      setDone(true);
    } catch { setErr("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Đổi mật khẩu: ${employee.fullName}`} onClose={onClose}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-medium">Đổi mật khẩu thành công!</p>
          <button onClick={onClose} className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-80 transition">Đóng</button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Mật khẩu mới">
            <div className="relative">
              <input className={inputCls + " pr-10"} type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
              <button onClick={() => setShow(s => !s)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Xác nhận mật khẩu">
            <input className={inputCls} type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" />
          </Field>
          <p className="text-xs text-muted-foreground">
            Mật khẩu sẽ được hash — admin không thể đọc lại.
          </p>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition">Huỷ</button>
            <button onClick={submit} disabled={saving} className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition disabled:opacity-50">
              {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Đổi mật khẩu
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Permission Modal ─────────────────────────────────────────────
function PermissionModal({ employee, roles, onClose, onSave }: {
  employee: Employee;
  roles: Role[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [roleId, setRoleId] = useState(
    typeof employee.role === "object" ? employee.role?._id || "" : ""
  );
  const [warehouseAccess, setWarehouseAccess] = useState<WarehouseAccess[]>(
    employee.warehouseAccess || []
  );
  const [newWhId, setNewWhId] = useState("");
  const [newWhName, setNewWhName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [expandedWh, setExpandedWh] = useState<string | null>(null);

  const addWarehouse = () => {
    if (!newWhId.trim()) return;
    if (warehouseAccess.find(w => w.warehouseId === newWhId)) return;
    setWarehouseAccess(prev => [...prev, { warehouseId: newWhId.trim(), warehouseName: newWhName.trim() || newWhId.trim(), permissions: [] }]);
    setNewWhId(""); setNewWhName("");
  };

  const removeWarehouse = (id: string) =>
    setWarehouseAccess(prev => prev.filter(w => w.warehouseId !== id));

  const toggleWhPermission = (whId: string, perm: string) => {
    setWarehouseAccess(prev => prev.map(w => {
      if (w.warehouseId !== whId) return w;
      const has = w.permissions.includes(perm);
      return { ...w, permissions: has ? w.permissions.filter(p => p !== perm) : [...w.permissions, perm] };
    }));
  };

  const setAllWhPermissions = (whId: string, all: boolean) => {
    setWarehouseAccess(prev => prev.map(w =>
      w.warehouseId !== whId ? w : { ...w, permissions: all ? [...ALL_WH_PERMISSIONS] : [] }
    ));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const [r1, r2] = await Promise.all([
        api.assignRole(employee._id, roleId || null),
        api.setWarehouseAccess(employee._id, warehouseAccess),
      ]);
      if (!r1.success || !r2.success) return setErr("Lỗi lưu phân quyền");
      onSave(); onClose();
    } catch { setErr("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Phân quyền: {employee.fullName}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted transition"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* Role */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Shield className="h-3.5 w-3.5" /> Role hệ thống
            </label>
            <select
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Không gán role —</option>
              {roles.map(r => (
                <option key={r._id} value={r._id}>{r.name}{r.description ? ` · ${r.description}` : ""}</option>
              ))}
            </select>
            {roleId && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Quyền mặc định kho từ role này sẽ áp dụng nếu kho không override.
              </div>
            )}
          </div>

          {/* Warehouse access */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Warehouse className="h-3.5 w-3.5" /> Kho được truy cập
            </label>

            {/* Add warehouse */}
            <div className="flex gap-2">
              <input
                className={inputCls + " flex-1"}
                value={newWhId}
                onChange={e => setNewWhId(e.target.value)}
                placeholder="Warehouse ID (từ Supabase)"
              />
              <input
                className={inputCls + " w-32"}
                value={newWhName}
                onChange={e => setNewWhName(e.target.value)}
                placeholder="Tên kho"
              />
              <button
                onClick={addWarehouse}
                className="rounded-md bg-foreground px-3 py-2 text-sm text-background hover:opacity-80 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Warehouse list */}
            <div className="space-y-2">
              {warehouseAccess.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">Chưa gán kho nào</p>
              )}
              {warehouseAccess.map(w => {
                const expanded = expandedWh === w.warehouseId;
                const allChecked = ALL_WH_PERMISSIONS.every(p => w.permissions.includes(p));
                return (
                  <div key={w.warehouseId} className="rounded-lg border">
                    {/* Warehouse header */}
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setExpandedWh(expanded ? null : w.warehouseId)}>
                          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        <span className="text-sm font-medium">{w.warehouseName}</span>
                        <span className="text-xs text-muted-foreground">{w.permissions.length}/{ALL_WH_PERMISSIONS.length} quyền</span>
                      </div>
                      <button onClick={() => removeWarehouse(w.warehouseId)} className="rounded p-1 text-red-400 hover:bg-red-50 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Permissions grid */}
                    {expanded && (
                      <div className="border-t px-3 py-3 space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={e => setAllWhPermissions(w.warehouseId, e.target.checked)}
                          />
                          Tất cả quyền
                        </label>
                        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                          {ALL_WH_PERMISSIONS.map(perm => (
                            <label key={perm} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={w.permissions.includes(perm)}
                                onChange={() => toggleWhPermission(w.warehouseId, perm)}
                              />
                              {WAREHOUSE_PERMISSION_LABELS[perm]}
                            </label>
                          ))}
                        </div>
                        {w.permissions.length === 0 && (
                          <p className="text-xs text-amber-600">
                            Không có quyền override → dùng default từ role
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition">Huỷ</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition disabled:opacity-50">
            {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Lưu phân quyền
          </button>
        </div>
      </div>
    </div>
  );
}