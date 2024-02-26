declare global {
  interface Window {
    theme: string;
  }
}

export function listenForThemeChange() {
  const modeContainer = document.getElementById("mode-container");
  if (!modeContainer) return;

  let containerDegrees = window.theme === "dark" ? -180 : 0;

  requestAnimationFrame(() => {
    modeContainer.style.transition = `transform 0.5s ease-out`;
  });

  modeContainer.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("button")) return;

    const newTheme = window.theme === "dark" ? "light" : "dark";

    document.body.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
    window.theme = newTheme;

    modeContainer.style.transform = `rotate(${(containerDegrees -= 180)}deg)`;
  });
}
