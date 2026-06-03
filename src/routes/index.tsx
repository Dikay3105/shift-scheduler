import React from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";

import {
    CalendarDays,
    UserCog,
    Image,
    ArrowRight,
    Package2,
    ShieldCheck,
    Sparkles,
    Users as UsersIcon,
    KeyRound,
    LogOut,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/use-auth";
import { AuthApi, type Permission } from "@/lib/auth-store";

export const Route = createFileRoute("/")({
    component: () => (
        <RequireAuth>
            <AdminDashboard />
        </RequireAuth>
    ),
});

function AdminDashboard() {
<<<<<<< HEAD
    const adminMenuItems = [
         {
            title: "Quản lý nhân viên",
            description: "Quản lý nhân viên và phân quyền",
            icon: Users,
            link: "/employee",
            gradient: "from-blue-500 to-cyan-500",
        },
=======
    const { user, logout, hasPermission } = useAuth();
    const navigate = useNavigate();
    const roleName =
        AuthApi.listRoles().find((r) => r.id === user?.roleId)?.name ?? "—";

    const adminMenuItems: {
        title: string;
        description: string;
        icon: any;
        link: string;
        gradient: string;
        external?: boolean;
        permission?: Permission;
    }[] = [
>>>>>>> 5585679a5ba53c8002d20d09ae19e0674f15e11d
        {
            title: "Lịch Làm Việc",
            description: "Quản lý ca làm và phân lịch cho nhân viên",
            icon: CalendarDays,
            link: "/schedule",
            gradient: "from-blue-500 to-cyan-500",
            permission: "schedule.view",
        },
        {
            title: "Nội quy và Quy định",
            description: "Xem và cập nhật nội quy công ty, quy định làm việc",
            icon: ShieldCheck,
            link: "/rule",
            gradient: "from-emerald-500 to-green-500",
            permission: "rule.view",
        },
        {
            title: "Quản Lý Kho",
            description: "Quản lý nhập xuất tồn kho theo ngày",
            icon: Package2,
            link: "https://inventory.cinnamonforest.com/",
            gradient: "from-indigo-500 to-blue-500",
            external: true,
        },
        {
            title: "Thẻ Nhân Viên",
            description: "Thiết kế và quản lý thẻ nhân viên",
            icon: UserCog,
            link: "/employeeCard",
            gradient: "from-orange-500 to-amber-500",
            permission: "card.view",
        },
        {
            title: "Avatar & Hình ảnh",
            description: "Quản lý avatar và hình ảnh",
            icon: Image,
            link: "/avatar",
            gradient: "from-violet-500 to-purple-500",
            permission: "avatar.view",
        },
        {
            title: "Tạo Content AI",
            description: "Sinh bài đăng Facebook từ sản phẩm với AI",
            icon: Sparkles,
            link: "/aiContent",
            gradient: "from-pink-500 to-rose-500",
            permission: "ai.use",
        },
        {
            title: "Quản lý tài khoản",
            description: "CRUD tài khoản người dùng và phân vai trò",
            icon: UsersIcon,
            link: "/users",
            gradient: "from-sky-500 to-indigo-500",
            permission: "users.view",
        },
        {
            title: "Vai trò & Phân quyền",
            description: "Tạo role và gán quyền chi tiết cho từng role",
            icon: KeyRound,
            link: "/roles",
            gradient: "from-slate-700 to-slate-900",
            permission: "roles.view",
        },
    ];

    const visible = adminMenuItems.filter(
        (i) => !i.permission || hasPermission(i.permission)
    );

    const initials = (user?.fullName ?? user?.username ?? "?")
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <div className="min-h-screen bg-muted/30">
            <AdminHeader
                title="Admin Dashboard"
                description="Hệ thống quản trị nhân sự"
            />

            <main className="mx-auto max-w-7xl px-6 py-10">
                {/* Hero */}
                <div className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                        <div>
                            <h2 className="mb-3 text-4xl font-bold">
                                Chào, {user?.fullName ?? user?.username} 👋
                            </h2>
                            <p className="max-w-2xl text-slate-300">
                                Quản lý lịch làm việc, nhân viên và hệ thống nội bộ.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {roleName}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-base font-semibold">
                                {initials}
                            </div>
                            <button
                                onClick={() => {
                                    logout();
                                    navigate({ to: "/login" });
                                }}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm hover:bg-white/10"
                            >
                                <LogOut className="h-4 w-4" /> Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>

                {/* Menu */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {visible.map((item, index) => {
                        const IconComponent = item.icon;

                        const cardContent = (
                            <Card className="group h-full overflow-hidden border-0 bg-background shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                                <CardContent className="p-0">
                                    <div
                                        className={`h-2 bg-gradient-to-r ${item.gradient}`}
                                    />

                                    <div className="p-6">
                                        <div
                                            className={`mb-6 inline-flex rounded-2xl bg-gradient-to-r p-4 text-white shadow-lg ${item.gradient}`}
                                        >
                                            <IconComponent className="h-7 w-7" />
                                        </div>

                                        <h4 className="mb-2 text-xl font-semibold">
                                            {item.title}
                                        </h4>

                                        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                                            {item.description}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Truy cập
                                            </span>

                                            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );

                        return item.external ? (
                            <button
                                key={index}
                                type="button"
                                className="h-full text-left"
                                onClick={() => {
                                    window.open(item.link, "inventory_admin");
                                }}
                            >
                                {cardContent}
                            </button>
                        ) : (
                            <Link key={index} to={item.link}>
                                {cardContent}
                            </Link>
                        );
                    })}
                </div>

                {visible.length === 0 && (
                    <div className="rounded-2xl border bg-background p-10 text-center text-muted-foreground">
                        Tài khoản của bạn chưa được cấp quyền truy cập module nào. Vui lòng liên hệ quản trị viên.
                    </div>
                )}
            </main>
        </div>
    );
}
