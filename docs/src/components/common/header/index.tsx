import { clsx } from "clsx"
import {
  LuExternalLink,
  LuSun,
  LuMoon,
  LuMonitor,
  LuLanguages,
  LuMenu,
} from "react-icons/lu"
import { Svg } from "minista/assets"

import type { Locale, Locales } from "../../../../types"
import ElementPulldown from "../../element/pulldown"
import { localizeName, localizePath } from "../../utils/i18n"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonHeader(props: Partial<Props>) {
  const { layout, locale, locales } = {
    ...initialProps,
    ...props,
  }
  const isSticky = layout === "docs"
  return (
    <header className={clsx("section is-header", isSticky && "is-sticky")}>
      <div className="inner is-py-sm is-pr-md is-pl-lg">
        <div className="box is-flex is-between is-middle is-gap-sm">
          <div className="box is-flex is-middle is-gap-sm">
            <a href={localizePath("/", locale, locales)}>
              <Svg
                src="/src/assets/images/logo.svg"
                width={110}
                height={24}
                className="image"
              />
            </a>
            <NavVersion {...props} />
          </div>
          <div className="box is-flex is-middle is-gap-xs">
            <NavMain {...props} />
            <NavLocale {...props} />
            <NavTheme />
            <NavMenuButton />
          </div>
        </div>
      </div>
    </header>
  )
}

function NavVersion(props: Partial<Props>) {
  const { currentVersion, archiveItems } = { ...initialProps, ...props }
  return (
    <ElementPulldown
      id="pulldown-version"
      buttonNode={
        <button
          type="button"
          className="button is-plain is-round is-angle-right is-angle-down is-pr-xl is-xs"
        >
          <span className="text is-font-sans-en">v{currentVersion}</span>
        </button>
      }
      radius="xl"
    >
      <div className="box is-bg-light is-outline is-p-sm is-radius-xl">
        <ul>
          <li className="box is-flex">
            <div className="box is-flex is-middle is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full">
              <span className="text is-font-sans-en is-primary">{`Latest(v${currentVersion})`}</span>
            </div>
          </li>
          {archiveItems.map((item, itemIndex) => (
            <li className="box is-flex" key={itemIndex}>
              <a
                href={item.url}
                className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
                target={item.external ? "_blank" : undefined}
              >
                <span className="text is-font-sans-en">{item.name}</span>
                {item.external && <LuExternalLink className="icon is-dark-4" />}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </ElementPulldown>
  )
}

function NavMain(props: Partial<Props>) {
  const { locale, locales, mainItems } = { ...initialProps, ...props }
  return (
    <div className="box is-none desktop:is-block">
      <div className="box is-flex is-middle is-gap-xl is-px-md">
        <ul className="box is-flex is-gap-xl">
          {mainItems.map((item, itemIndex) => (
            <li key={itemIndex}>
              <a
                href={localizePath(item.url, locale, locales)}
                className="box is-flex is-middle is-gap-xxs"
                target={item.external ? "_blank" : undefined}
              >
                <span className="text is-weight-500">
                  {localizeName(item.name, locale)}
                </span>
                {item.external && <LuExternalLink className="icon is-dark-4" />}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function NavLocale(props: Partial<Props>) {
  const { url, locale, locales } = { ...initialProps, ...props }
  const localeEntries = Object.entries(locales) as [Locale, Locales[Locale]][]
  const current = localeEntries.find(([key]) => key === locale)
  const others = localeEntries.filter(([key]) => key !== locale)
  const items = current ? [current, ...others] : others
  return (
    <ElementPulldown
      id="pulldown-locale"
      buttonNode={
        <button type="button" className="button is-melt is-slim is-square">
          <LuLanguages title="Locale" className="icon is-lg" />
        </button>
      }
      radius="xl"
    >
      <div className="box is-bg-light is-outline is-p-sm is-radius-xl">
        <ul>
          {items.map(([key, item]) => (
            <li key={key} className="box is-flex">
              {key === locale ? (
                <span className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full">
                  <span className="text is-weight-700">
                    {localizeName(item.name, locale)}
                  </span>
                </span>
              ) : (
                <a
                  href={localizePath(url, key, locales)}
                  className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
                >
                  <span className="text">{localizeName(item.name, key)}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </ElementPulldown>
  )
}

function NavTheme() {
  return (
    <ElementPulldown
      id="pulldown-theme"
      buttonNode={
        <button type="button" className="button is-melt is-slim is-square">
          <LuSun
            title="Theme"
            className="icon is-lg"
            data-theme-content="light"
          />
          <LuMoon
            title="Theme"
            className="icon is-lg"
            data-theme-content="dark"
          />
        </button>
      }
      radius="xl"
    >
      <div className="box is-bg-light is-outline is-p-sm is-radius-xl is-font-sans-en">
        <ul>
          <li className="box is-flex">
            <button
              type="button"
              className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
              data-theme-button="light"
            >
              <LuSun className="icon is-lg" />
              <span className="text is-font-sans-en">Light</span>
            </button>
          </li>
          <li className="box is-flex">
            <button
              type="button"
              className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
              data-theme-button="dark"
            >
              <LuMoon className="icon is-lg" />
              <span className="text is-font-sans-en">Dark</span>
            </button>
          </li>
          <li className="box is-flex">
            <button
              type="button"
              className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
              data-theme-button="system"
            >
              <LuMonitor className="icon is-lg" />
              <span className="text is-font-sans-en">System</span>
            </button>
          </li>
        </ul>
      </div>
    </ElementPulldown>
  )
}

function NavMenuButton() {
  return (
    <div className="box desktop:is-none">
      <div className="box is-flex is-middle is-gap-xxs">
        <button
          type="button"
          className="box is-flex is-p-xs"
          data-modal-open="menu"
        >
          <LuMenu title="Menu" className="icon is-lg" />
        </button>
      </div>
    </div>
  )
}
