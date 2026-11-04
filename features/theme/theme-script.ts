/**
 * Aplica a classe `dark` no `<html>` conforme o tema salvo pelo
 * `ThemeProvider` (`via-fidei-theme`) ou, sem tema salvo, a preferência do
 * sistema.
 *
 * A função vira o script inline do `<head>` (`THEME_INIT_SCRIPT`), que roda
 * antes da hidratação e evita o "flash" do tema claro. Por isso ela precisa
 * ser autossuficiente: nada de imports nem constantes de fora do corpo.
 */
export function applyStoredTheme(): void {
  try {
    const theme = localStorage.getItem("via-fidei-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark" || (!theme && prefersDark),
    );
  } catch {
    // localStorage bloqueado (modo privado, cookies desligados): mantém o claro.
  }
}

/** Conteúdo do `<script>` inline de tema do `app/layout.tsx`. */
export const THEME_INIT_SCRIPT = `(${applyStoredTheme.toString()})();`;
