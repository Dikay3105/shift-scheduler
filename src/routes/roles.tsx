import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, X, Lock } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import RequireAuth from "@/components/RequireAuth";
import { AuthApi, ALL_PERMISSIONS, type Permission, type Role } from "@/lib/auth-store";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/roles")({
  component: () => (
    <RequireAuth permission="roles.view">
      <RolesPage />
    </RequireAuth>
  ),
});

function RolesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("roles.edit");
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = () => setRoles(AuthApi.listRoles());
  useEffect(reload, []);

  const handleDelete = (r: Role) => {
    if (r.system) return alert("Không thể xóa vai trò hệ thống.");
    if (!confirm(`Xóa vai trò "${r.name}"?`)) return;
    const ok = AuthApi.deleteRole(r.id);
    if (!ok) alert("Không thể xóa: còn tài khoản đang dùng vai trò này.");
    reload();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title="Vai trò & Phân quyền" description="Tạo role và gán quyền cho role" backTo="/" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Có <b>{roles.length}</b> vai trò • <b>{ALL_PERMISSIONS.length}</b> quyền hệ thống
          </p>
          {canEdit && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Tạo vai trò
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{r.name}</h3>
                      {r.description && (
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                {r.system && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    <Lock className="h-3 w-3" /> Hệ thống
                  </span>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Quyền ({r.permissions.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.slice(0, 6).map((p) => (
                    <span
                      key={p}
                      className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {ALL_PERMISSIONS.find((x) => x.key === p)?.label ?? p}
                    </span>
                  ))}
                  {r.permissions.length > 6 && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      +{r.permissions.length - 6}
                    </span>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="mt-5 flex justify-end gap-1.5">
                  <button
                    onClick={() => setEditing(r)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={r.system}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {(creating || editing) && (
        <RoleFormModal
          role={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function RoleFormModal({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!role;
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Permission[]>(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, typeof ALL_PERMISSIONS>();
    for (const p of ALL_PERMISSIONS) {
      if (!m.has(p.group)) m.set(p.group, []);
      m.get(p.group)!.push(p);
    }
    return Array.from(m.entries());
  }, []);

  const toggle = (p: Permission) =>
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const toggleGroup = (groupPerms: Permission[]) => {
    const allOn = groupPerms.every((p) => perms.includes(p));
    setPerms((cur) =>
      allOn ? cur.filter((p) => !groupPerms.includes(p)) : Array.from(new Set([...cur, ...groupPerms]))
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Vui lòng nhập tên vai trò");
    if (isEdit) {
      AuthApi.updateRole(role!.id, {
        name: name.trim(),
        description: description.trim(),
        permissions: perms,
      });
    } else {
      AuthApi.createRole({ name: name.trim(), description: description.trim(), permissions: perms });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{isEdit ? "Sửa vai trò" : "Tạo vai trò mới"}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex max-h-[80vh] flex-col">
          <div className="space-y-3 overflow-y-auto p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tên vai trò</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mô tả</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Quyền ({perms.length}/{ALL_PERMISSIONS.length})
              </label>
              <div className="space-y-3">
                {groups.map(([group, items]) => {
                  const groupKeys = items.map((i) => i.key);
                  const allOn = groupKeys.every((p) => perms.includes(p));
                  const someOn = groupKeys.some((p) => perms.includes(p));
                  return (
                    <div key={group} className="rounded-xl border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">{group}</span>
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKeys)}
                          className={`rounded-md px-2 py-0.5 text-[11px] ${
                            allOn
                              ? "bg-primary text-primary-foreground"
                              : someOn
                              ? "bg-amber-100 text-amber-700"
                              : "bg-background border"
                          }`}
                        >
                          {allOn ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {items.map((p) => (
                          <label
                            key={p.key}
                            className="flex cursor-pointer items-center gap-2 rounded-lg bg-background px-2.5 py-1.5 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={perms.includes(p.key)}
                              onChange={() => toggle(p.key)}
                              className="h-4 w-4 rounded"
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t bg-muted/30 px-5 py-3">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-background">
              Hủy
            </button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              {isEdit ? "Lưu thay đổi" : "Tạo vai trò"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
