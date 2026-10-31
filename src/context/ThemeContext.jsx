import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Light / dark. index.html sets data-theme before first paint; this keeps it in sync.
const ThemeContext = createContext(null);

const readTheme = () => {
  const current = document.documentElement.dataset.theme;
  return current === "dark" ? "dark" : "light";
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("ccs-theme", theme);
    } catch {
      /* storage blocked: theme still applies for this visit */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
