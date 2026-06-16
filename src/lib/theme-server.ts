import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export const getThemeFromCookie = createServerFn().handler(() => {
    return (getCookie("app.theme") as "light" | "dark" | "system") || "system";
});