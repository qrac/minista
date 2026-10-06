import type pjt from "./project.json"

export type Pjt = typeof pjt
export type Locale = keyof Pjt["i18n"]["locales"]
export type Locales = Pjt["i18n"]["locales"]
export type NavigationMain = Pjt["navigation"]["main"]
export type NavigationDocs = Pjt["navigation"]["docs"]
export type NavigationArchives = Pjt["navigation"]["versions"]["archives"]
