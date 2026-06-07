import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeCtx = {
    mode: ThemeMode;
    resolved: "light" | "dark";
    setMode: (m: ThemeMode) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "app.theme";

function getSystem(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    // return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return "light";
}

function applyClass(resolved: "light" | "dark") {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(() => {
        if (typeof window === "undefined") return "system";
        return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
    });
    const [system, setSystem] = useState<"light" | "dark">(getSystem);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => setSystem(mq.matches ? "dark" : "light");
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const resolved = mode === "system" ? system : mode;

    useEffect(() => { applyClass(resolved); }, [resolved]);

    const setMode = useCallback((m: ThemeMode) => {
        setModeState(m);
        try { localStorage.setItem(STORAGE_KEY, m); } catch { }
    }, []);

    return <Ctx.Provider value={{ mode, resolved, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
}
