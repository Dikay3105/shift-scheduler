import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import type { Permission } from "@/lib/auth-store";
import { ShieldAlert } from "lucide-react";

type Props = {
  children: React.ReactNode;
  permission?: Permission;
};

export default function RequireAuth({ children, permission }: Props) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
        <div className="max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Không có quyền truy cập</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tài khoản của bạn không có quyền xem trang này.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
