import { onMounted, reactive, ref } from "vue";
import { useEventListener } from "./useEventListener";

export function useTheme() {
  const theme = ref(
    localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "black"
        : "wireframe")
  );

  const themes = reactive([
    "wireframe",
    "black",
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "valentine",
    "halloween",
    "garden",
    "forest",
    "aqua",
    "lofi",
    "pastel",
    "fantasy",
    "luxury",
    "dracula",
    "cmyk",
    "autumn",
    "business",
    "acid",
    "lemonade",
    "night",
    "coffee",
    "winter",
    "dim",
    "nord",
    "sunset",
  ]);

  function setTheme(t = theme.value) {
    localStorage.setItem("theme", theme.value = t);
    document.documentElement.setAttribute("data-theme", t);
  }

  onMounted(() => {
    document.documentElement.setAttribute("data-theme", theme.value);
  });

  useEventListener({
    el: window,
    name: "storage",
    listener: ((e: StorageEvent) => {
      if (e.key === "theme") {
        const newTheme = e.newValue || "wireframe";
        theme.value = newTheme;
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    }) as any,
  })

  return {
    theme,
    themes,
    setTheme,
  }
}