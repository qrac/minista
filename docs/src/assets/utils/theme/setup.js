function setupTheme() {
  const savedTheme = localStorage.getItem("theme") || "system"

  switch (savedTheme) {
    case "light":
      document.documentElement.setAttribute("data-theme", "light")
      break
    case "dark":
      document.documentElement.setAttribute("data-theme", "dark")
      break
    default:
      if (window.matchMedia("(prefers-color-scheme: light)").matches) {
        document.documentElement.setAttribute("data-theme", "light")
      } else {
        document.documentElement.setAttribute("data-theme", "dark")
      }
      break
  }
}

setupTheme()
