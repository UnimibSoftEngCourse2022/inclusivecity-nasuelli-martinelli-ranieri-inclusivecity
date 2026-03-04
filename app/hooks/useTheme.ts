import {useEffect, useState} from "react";

export function useTheme() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const root = document.documentElement;

        const updateTheme = () => {
            const saved = localStorage.getItem("theme");
            const systemDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;

            const isDark = saved === "dark" || (!saved && systemDark);

            if (isDark) {
                root.classList.add("dark");
                setTheme("dark");
            } else {
                root.classList.remove("dark");
                setTheme("light");
            }
        };

        updateTheme();

        const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = () => {
            if (!localStorage.getItem("theme")) {
                updateTheme();
            }
        };

        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return {theme, isDark: theme === "dark"};
}