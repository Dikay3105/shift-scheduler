import { Link } from "@tanstack/react-router";
import {
    ArrowLeft,
    Bell,
    Search,
} from "lucide-react";

type AdminHeaderProps = {
    title: string;
    description?: string;
    backTo?: string;
};

export default function AdminHeader({
    title,
    description,
    backTo,
}: AdminHeaderProps) {
    return (
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                    {backTo && (
                        <Link to={backTo}>
                            <button className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background transition hover:bg-muted">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        </Link>
                    )}

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {title}
                        </h1>

                        {description && (
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background transition hover:bg-muted">
                        <Search className="h-4 w-4" />
                    </button>

                    <button className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background transition hover:bg-muted">
                        <Bell className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </header>
    );
}