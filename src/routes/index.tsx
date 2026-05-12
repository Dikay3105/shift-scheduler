import React from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
    Users,
    CalendarDays,
    UserCog,
    Image,
    BarChart3,
} from 'lucide-react';

export const Route = createFileRoute('/')({
    head: () => ({
        meta: [
            { title: 'Admin Dashboard' },
            {
                name: 'description',
                content: 'Hệ thống quản trị',
            },
        ],
    }),
    component: AdminDashboard,
});

function AdminDashboard() {
    const adminMenuItems = [
        {
            title: 'Lịch Làm Việc',
            description: 'Quản lý ca làm và phân lịch cho nhân viên',
            icon: CalendarDays,
            link: '/schedule',
            color: 'bg-blue-500',
        },
        {
            title: 'Nhân Viên',
            description: 'Quản lý thông tin nhân viên và thẻ nhân viên',
            icon: Users,
            link: '/admin/employees',
            color: 'bg-emerald-500',
        },
        {
            title: 'Thẻ Nhân Viên',
            description: 'Thiết kế và quản lý thẻ nhân viên',
            icon: UserCog,
            link: '/employeeCard',
            color: 'bg-amber-500',
        },
        {
            title: 'Avatar & Hình ảnh',
            description: 'Quản lý avatar và hình ảnh nhân viên',
            icon: Image,
            link: '/avatar',
            color: 'bg-purple-500',
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">
                                Admin Dashboard
                            </h1>

                            <p className="text-muted-foreground">
                                Hệ thống quản trị
                            </p>
                        </div>

                        <Link to="/">
                            <Button variant="outline">
                                <Users className="mr-2 h-4 w-4" />
                                Về trang chính
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-10">
                <div className="mb-8">
                    <h2 className="mb-2 text-2xl font-semibold">
                        Chào mừng quay trở lại!
                    </h2>

                    <p className="text-muted-foreground">
                        Chọn chức năng bạn muốn quản lý
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {adminMenuItems.map((item, index) => {
                        const IconComponent = item.icon;

                        return (
                            <Card
                                key={index}
                                className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                <CardHeader className="pb-4">
                                    <div className="flex items-center space-x-4">
                                        <div
                                            className={`rounded-xl p-3 transition-transform group-hover:scale-110 ${item.color}`}
                                        >
                                            <IconComponent className="h-7 w-7 text-white" />
                                        </div>

                                        <CardTitle className="text-xl">
                                            {item.title}
                                        </CardTitle>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <p className="mb-6 leading-relaxed text-muted-foreground">
                                        {item.description}
                                    </p>

                                    <Link to={item.link}>
                                        <Button className="w-full" size="lg">
                                            Truy cập ngay
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Info Box */}
                <div className="mt-12 rounded-2xl border bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Hệ thống đang trong giai đoạn phát triển. Các tính năng Schedule và
                        Quản lý Nhân viên đang được ưu tiên.
                    </p>
                </div>
            </main>
        </div>
    );
}