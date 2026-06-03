import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, User, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Background ornaments */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Brand pane */}
          <div className="hidden flex-col justify-between lg:flex">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="text-lg font-semibold tracking-tight">
                  Cinnamon Forest Admin
                </span>
              </div>
              <h1 className="mt-12 text-5xl font-bold leading-tight tracking-tight">
                Quản trị
                <br />
                <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
                  thông minh & an toàn.
                </span>
              </h1>
              <p className="mt-6 max-w-md text-slate-400">
                Đăng nhập để quản lý lịch làm việc, nhân sự, nội quy, thẻ và
                content AI cho hệ thống của bạn.
              </p>
            </div>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-3 text-xs text-slate-400">
              <Stat k="99.9%" v="Uptime" />
              <Stat k="RBAC" v="Phân quyền" />
              <Stat k="SSO ready" v="Mở rộng" />
            </div>
          </div>

          {/* Form pane */}
          <div className="flex items-center">
            <div className="w-full">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl sm:p-10">
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold">Chào mừng trở lại 👋</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Nhập thông tin tài khoản để vào dashboard.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <Field label="Tên đăng nhập">
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        autoFocus
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin"
                        className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-3 text-sm outline-none ring-indigo-400/40 placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2"
                      />
                    </div>
                  </Field>

                  <Field label="Mật khẩu">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type={show ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-10 text-sm outline-none ring-indigo-400/40 placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      >
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-slate-400">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                      />
                      Ghi nhớ tôi
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        alert("Vui lòng liên hệ quản trị viên để cấp lại mật khẩu.")
                      }
                      className="text-indigo-300 hover:text-indigo-200"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
                  </button>
                </form>

                <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
                  Tài khoản mặc định: <b className="text-slate-200">admin</b> / <b className="text-slate-200">admin123</b>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} Cinnamon Forest. Bảo mật bằng RBAC.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="text-base font-semibold text-slate-100">{k}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">{v}</div>
    </div>
  );
}
