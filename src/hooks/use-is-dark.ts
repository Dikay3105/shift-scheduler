import { useEffect, useState } from "react";

/**
 * Theo dõi class "dark" trên <html> (được ThemeProvider toggle) và trả về
 * true/false tương ứng. Dùng MutationObserver để component re-render ngay
 * khi người dùng đổi theme, kể cả khi component không re-render vì lý do khác.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));

    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
