import React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";

import {
    Users,
    CalendarDays,
    UserCog,
    Image,
    ArrowRight,
    Package2
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";

export const Route = createFileRoute("/")({
    component: AdminDashboard,
});

function AdminDashboard() {
    const adminMenuItems = [
        {
            title: "Lịch Làm Việc",
            description: "Quản lý ca làm và phân lịch cho nhân viên",
            icon: CalendarDays,
            link: "/schedule",
            gradient: "from-blue-500 to-cyan-500",
        },
        // {
        //     title: "Nhân Viên",
        //     description: "Quản lý thông tin nhân viên",
        //     icon: Users,
        //     link: "/admin/employees",
        //     gradient: "from-emerald-500 to-green-500",
        // },
        {
            title: "Quản Lý Kho",
            description: "Quản lý nhập xuất tồn kho theo ngày",
            icon: Package2,
            link: "https://inventorymanagement.dikay3105.workers.dev/",
            gradient: "from-indigo-500 to-blue-500",
            external: true,
        },
        {
            title: "Thẻ Nhân Viên",
            description: "Thiết kế và quản lý thẻ nhân viên",
            icon: UserCog,
            link: "/employeeCard",
            gradient: "from-orange-500 to-amber-500",
        },
        {
            title: "Avatar & Hình ảnh",
            description: "Quản lý avatar và hình ảnh",
            icon: Image,
            link: "/avatar",
            gradient: "from-violet-500 to-purple-500",
        },
    ];

    return (
        <div className="min-h-screen bg-muted/30">
            <AdminHeader
                title="Admin Dashboard"
                description="Hệ thống quản trị nhân sự"
            />

            <main className="mx-auto max-w-7xl px-6 py-10">
                {/* Hero */}
                <div className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
                    <h2 className="mb-3 text-4xl font-bold">
                        Chào mừng quay trở lại 👋
                    </h2>

                    <p className="max-w-2xl text-slate-300">
                        Quản lý lịch làm việc, nhân viên và hệ thống nội bộ.
                    </p>
                </div>

                {/* Menu */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {adminMenuItems.map((item, index) => {
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
                            <a
                                key={index}
                                href={item.link}
                            >
                                {cardContent}
                            </a>
                        ) : (
                            <Link key={index} to={item.link}>
                                {cardContent}
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}