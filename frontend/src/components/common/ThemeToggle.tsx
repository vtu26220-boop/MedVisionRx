import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/useTheme";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="theme-toggle"
    >
      {theme === "light" ? (
        <Moon size={19} />
      ) : (
        <Sun size={19} />
      )}
    </button>
  );
}

export default ThemeToggle;