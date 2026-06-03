import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, Search, UserPlus, ShieldCheck, X } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import RequireAuth from "@/components/RequireAuth";
import { AuthApi, type Role, type UserAccount } from "@/lib/auth-store";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/users")({
  component: () => (
    <RequireAuth permission="users.view">
      <UsersPage />
    </RequireAuth>
  ),
});

function UsersPage() {
  const { user: me, hasPermission } = useAuth();
  const canEdit = hasPermission("users.edit");
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [pwReset, setPwReset] = useState<UserAccount | null>(null);

  const reload = () => {
    setUsers(AuthApi.listUsers());
    setRoles(AuthApi.listRoles());
  };
  useEffect(reload, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "—";

  const handleDelete = (u: UserAccount) => {
    if (u.id === me?.id) return alert("Không thể xóa chính bạn.");
    if (!confirm(`Xóa tài khoản "${u.username}"?`)) return;
    const ok = AuthApi.deleteUser(u.id);
    if (!ok) alert("Không thể xóa (admin cuối cùng hoặc lỗi).");
    reload();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title="Quản lý tài khoản" description="CRUD tài khoản và phân vai trò" backTo="/" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, username, email..."
              className="h-10 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {canEdit && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
            >
              <UserPlus className="h-4 w-4" />
              Thêm tài khoản
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tài khoản</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      <ShieldCheck className="h-3 w-3" />
                      {roleName(u.roleId)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        Đã khóa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {canEdit && (
                        <>
                          <IconBtn title="Đổi mật khẩu" onClick={() => setPwReset(u)}>
                            <KeyRound className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn title="Sửa" onClick={() => setEditing(u)}>
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            title="Xóa"
                            onClick={() => handleDelete(u)}
                            danger
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Không tìm thấy tài khoản nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {(creating || editing) && (
        <UserFormModal
          user={editing}
          roles={roles}
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

      {pwReset && (
        <PasswordResetModal
          user={pwReset}
          onClose={() => setPwReset(null)}
          onSaved={() => {
            setPwReset(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted ${
        danger ? "hover:border-red-300 hover:text-red-600" : "hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function UserFormModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: UserAccount | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? "");
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!username.trim() || !fullName.trim()) throw new Error("Vui lòng nhập đủ thông tin");
      if (!isEdit && password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự");
      if (isEdit) {
        AuthApi.updateUser(user!.id, {
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          roleId,
          active,
        });
      } else {
        AuthApi.createUser({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          roleId,
          active,
          password,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    }
  };

  return (
    <Modal title={isEdit ? "Sửa tài khoản" : "Thêm tài khoản"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Tên đăng nhập" value={username} onChange={setUsername} />
        <Input label="Họ và tên" value={fullName} onChange={setFullName} />
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Vai trò</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {!isEdit && (
          <Input label="Mật khẩu" type="password" value={password} onChange={setPassword} />
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Đang hoạt động
        </label>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
            Hủy
          </button>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            {isEdit ? "Lưu thay đổi" : "Tạo tài khoản"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordResetModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) return setError("Mật khẩu tối thiểu 6 ký tự");
    if (pw !== pw2) return setError("Xác nhận mật khẩu không khớp");
    AuthApi.updateUser(user.id, { password: pw });
    onSaved();
  };

  return (
    <Modal title={`Đổi mật khẩu • ${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Mật khẩu mới" type="password" value={pw} onChange={setPw} />
        <Input label="Xác nhận mật khẩu" type="password" value={pw2} onChange={setPw2} />
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
            Hủy
          </button>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Cập nhật mật khẩu
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
