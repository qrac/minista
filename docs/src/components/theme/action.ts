function switchAttr(theme: string, lightModeQuery: MediaQueryList) {
  switch (theme) {
    case "light":
      document.documentElement.setAttribute("data-theme", "light")
      break
    case "dark":
      document.documentElement.setAttribute("data-theme", "dark")
      break
    default:
      if (lightModeQuery.matches) {
        document.documentElement.setAttribute("data-theme", "light")
      } else {
        document.documentElement.setAttribute("data-theme", "dark")
      }
      break
  }
}

function switchMode(
  lightModeQuery: MediaQueryList,
  darkModeQuery: MediaQueryList
) {
  if (localStorage.getItem("theme") === "system") {
    if (lightModeQuery.matches) {
      document.documentElement.setAttribute("data-theme", "light")
    }
    if (darkModeQuery.matches) {
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }
}

function switchActive(els: HTMLButtonElement[], theme: string) {
  els.forEach((el) => {
    if (el.dataset.themeButton === theme) {
      el.classList.add("is-active")
    } else {
      el.classList.remove("is-active")
    }
  })
}

export function actionThemeSwitch() {
  const savedTheme = localStorage.getItem("theme") || "system"

  const lightModeQuery = window.matchMedia("(prefers-color-scheme: light)")
  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)")

  const buttonEls = [
    ...document.querySelectorAll("[data-theme-button]"),
  ] as HTMLButtonElement[]

  switchActive(buttonEls, savedTheme)

  buttonEls.forEach((el) => {
    el.addEventListener("click", () => {
      const theme = el.dataset.themeButton

      if (theme) {
        switchAttr(theme, lightModeQuery)
        switchActive(buttonEls, theme)
        localStorage.setItem("theme", theme)
      }
      el.blur()
    })
  })

  lightModeQuery.addEventListener("change", () =>
    switchMode(lightModeQuery, darkModeQuery)
  )
  darkModeQuery.addEventListener("change", () =>
    switchMode(lightModeQuery, darkModeQuery)
  )
}
