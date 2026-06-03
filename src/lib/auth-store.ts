// Hệ thống auth + RBAC lưu localStorage.
// Có thể swap sang BE: chỉ cần thay các hàm trong AuthApi bên dưới.

export type Permission =
  | "dashboard.view"
  | "schedule.view"
  | "schedule.edit"
  | "employee.view"
  | "employee.edit"
  | "rule.view"
  | "rule.edit"
  | "card.view"
  | "avatar.view"
  | "ai.use"
  | "users.view"
  | "users.edit"
  | "roles.view"
  | "roles.edit";

export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: "dashboard.view", label: "Xem dashboard", group: "Chung" },
  { key: "schedule.view", label: "Xem lịch làm việc", group: "Lịch" },
  { key: "schedule.edit", label: "Chỉnh sửa lịch", group: "Lịch" },
  { key: "employee.view", label: "Xem nhân viên", group: "Nhân viên" },
  { key: "employee.edit", label: "Chỉnh sửa nhân viên", group: "Nhân viên" },
  { key: "rule.view", label: "Xem nội quy", group: "Nội quy" },
  { key: "rule.edit", label: "Chỉnh sửa nội quy", group: "Nội quy" },
  { key: "card.view", label: "Thẻ nhân viên", group: "Thẻ" },
  { key: "avatar.view", label: "Avatar & hình ảnh", group: "Media" },
  { key: "ai.use", label: "Tạo content AI", group: "AI" },
  { key: "users.view", label: "Xem tài khoản", group: "Hệ thống" },
  { key: "users.edit", label: "Quản lý tài khoản", group: "Hệ thống" },
  { key: "roles.view", label: "Xem vai trò", group: "Hệ thống" },
  { key: "roles.edit", label: "Quản lý vai trò", group: "Hệ thống" },
];

export type Role = {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  system?: boolean; // role hệ thống không cho xóa
};

export type UserAccount = {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  roleId: string;
  active: boolean;
  passwordHash: string; // không hiển thị, chỉ cho phép reset
  createdAt: string;
};

export type SessionUser = Omit<UserAccount, "passwordHash">;

const LS_USERS = "auth.users.v1";
const LS_ROLES = "auth.roles.v1";
const LS_SESSION = "auth.session.v1";

// "Hash" rất đơn giản (demo). Production nên dùng BE.
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return `h_${(h >>> 0).toString(36)}_${s.length}`;
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_ROLES: Role[] = [
  {
    id: "role_admin",
    name: "Quản trị viên",
    description: "Toàn quyền hệ thống",
    permissions: ALL_PERMISSIONS.map((p) => p.key),
    system: true,
  },
  {
    id: "role_manager",
    name: "Quản lý",
    description: "Quản lý vận hành, không quản trị hệ thống",
    permissions: [
      "dashboard.view",
      "schedule.view",
      "schedule.edit",
      "employee.view",
      "employee.edit",
      "rule.view",
      "card.view",
      "avatar.view",
      "ai.use",
    ],
  },
  {
    id: "role_staff",
    name: "Nhân viên",
    description: "Chỉ xem thông tin cơ bản",
    permissions: ["dashboard.view", "schedule.view", "rule.view"],
  },
];

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeed() {
  if (typeof window === "undefined") return;
  const roles = readJSON<Role[]>(LS_ROLES, []);
  if (roles.length === 0) writeJSON(LS_ROLES, DEFAULT_ROLES);
  const users = readJSON<UserAccount[]>(LS_USERS, []);
  if (users.length === 0) {
    const admin: UserAccount = {
      id: uid("usr"),
      username: "admin",
      fullName: "Quản trị viên",
      email: "admin@cinnamonforest.com",
      roleId: "role_admin",
      active: true,
      passwordHash: hash("admin123"),
      createdAt: new Date().toISOString(),
    };
    writeJSON(LS_USERS, [admin]);
  }
}

export const AuthApi = {
  bootstrap() {
    ensureSeed();
  },
  // Roles
  listRoles(): Role[] {
    ensureSeed();
    return readJSON<Role[]>(LS_ROLES, []);
  },
  createRole(data: Omit<Role, "id">): Role {
    const roles = AuthApi.listRoles();
    const r: Role = { ...data, id: uid("role") };
    roles.push(r);
    writeJSON(LS_ROLES, roles);
    return r;
  },
  updateRole(id: string, patch: Partial<Omit<Role, "id">>): Role | null {
    const roles = AuthApi.listRoles();
    const idx = roles.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    roles[idx] = { ...roles[idx], ...patch };
    writeJSON(LS_ROLES, roles);
    return roles[idx];
  },
  deleteRole(id: string): boolean {
    const roles = AuthApi.listRoles();
    const target = roles.find((r) => r.id === id);
    if (!target || target.system) return false;
    const users = AuthApi.listUsers();
    if (users.some((u) => u.roleId === id)) return false;
    writeJSON(LS_ROLES, roles.filter((r) => r.id !== id));
    return true;
  },

  // Users
  listUsers(): UserAccount[] {
    ensureSeed();
    return readJSON<UserAccount[]>(LS_USERS, []);
  },
  createUser(input: {
    username: string;
    fullName: string;
    email?: string;
    roleId: string;
    active: boolean;
    password: string;
  }): UserAccount {
    const users = AuthApi.listUsers();
    if (users.some((u) => u.username.toLowerCase() === input.username.toLowerCase()))
      throw new Error("Tên đăng nhập đã tồn tại");
    const u: UserAccount = {
      id: uid("usr"),
      username: input.username,
      fullName: input.fullName,
      email: input.email,
      roleId: input.roleId,
      active: input.active,
      passwordHash: hash(input.password),
      createdAt: new Date().toISOString(),
    };
    users.push(u);
    writeJSON(LS_USERS, users);
    return u;
  },
  updateUser(
    id: string,
    patch: Partial<{
      username: string;
      fullName: string;
      email: string;
      roleId: string;
      active: boolean;
      password: string;
    }>
  ): UserAccount | null {
    const users = AuthApi.listUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const cur = users[idx];
    const next: UserAccount = {
      ...cur,
      username: patch.username ?? cur.username,
      fullName: patch.fullName ?? cur.fullName,
      email: patch.email ?? cur.email,
      roleId: patch.roleId ?? cur.roleId,
      active: patch.active ?? cur.active,
      passwordHash: patch.password ? hash(patch.password) : cur.passwordHash,
    };
    users[idx] = next;
    writeJSON(LS_USERS, users);
    return next;
  },
  deleteUser(id: string): boolean {
    const users = AuthApi.listUsers();
    const target = users.find((u) => u.id === id);
    if (!target) return false;
    // không cho xóa admin cuối cùng
    if (target.roleId === "role_admin") {
      const adminCount = users.filter((u) => u.roleId === "role_admin").length;
      if (adminCount <= 1) return false;
    }
    writeJSON(LS_USERS, users.filter((u) => u.id !== id));
    return true;
  },

  // Session
  login(username: string, password: string): SessionUser {
    const users = AuthApi.listUsers();
    const u = users.find(
      (x) => x.username.toLowerCase() === username.toLowerCase()
    );
    if (!u) throw new Error("Tài khoản không tồn tại");
    if (!u.active) throw new Error("Tài khoản đã bị khóa");
    if (u.passwordHash !== hash(password)) throw new Error("Sai mật khẩu");
    const { passwordHash: _ph, ...session } = u;
    writeJSON(LS_SESSION, session);
    return session;
  },
  logout() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LS_SESSION);
  },
  getSession(): SessionUser | null {
    return readJSON<SessionUser | null>(LS_SESSION, null);
  },
  getPermissions(user: SessionUser | null): Permission[] {
    if (!user) return [];
    const role = AuthApi.listRoles().find((r) => r.id === user.roleId);
    return role?.permissions ?? [];
  },
};
