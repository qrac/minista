import { clsx } from "clsx"
import {
  FiExternalLink,
  FiSun,
  FiMoon,
  FiMonitor,
  FiMenu,
} from "react-icons/fi"
import { Svg } from "minista/assets"

import ElementPulldown from "../../element/pulldown"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonHeader(props: Partial<Props>) {
  const { isSticky } = { ...initialProps, ...props }
  return (
    <header className={clsx("section is-header", isSticky && "is-sticky")}>
      <div className="inner is-py-sm is-pr-md is-pl-lg">
        <div className="box is-flex is-between is-middle is-gap-sm">
          <div className="box is-flex is-middle is-gap-sm">
            <a href="/">
              <Svg
                src="/src/assets/images/logo.svg"
                width={110}
                height={24}
                className="image"
              />
            </a>
            <NavVersions {...props} />
          </div>
          <div className="box is-flex is-middle is-gap-xs">
            <NavMain {...props} />
            <NavThemes />
            <NavButton />
          </div>
        </div>
      </div>
    </header>
  )
}

function NavVersions(props: Partial<Props>) {
  const { currentVersion, versionItems } = { ...initialProps, ...props }
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
      <div className="box is-bg-2 is-outline is-p-sm is-radius-xl">
        <ul>
          <li className="box is-flex">
            <div className="box is-flex is-middle is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full">
              <span className="text is-font-sans-en is-primary">{`Latest(v${currentVersion})`}</span>
            </div>
          </li>
          {versionItems.map((item, itemIndex) => (
            <li className="box is-flex" key={itemIndex}>
              <a
                href={item.url}
                className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
                target={item.externalLink ? "_blank" : undefined}
              >
                <span className="text is-font-sans-en">{item.name}</span>
                {item.externalLink && (
                  <FiExternalLink className="icon is-dark-4" />
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </ElementPulldown>
  )
}

function NavThemes() {
  return (
    <ElementPulldown
      id="pulldown-theme"
      buttonNode={
        <button type="button" className="button is-melt is-slim is-square">
          <FiSun
            title="Theme"
            className="icon is-lg"
            data-theme-content="light"
          />
          <FiMoon
            title="Theme"
            className="icon is-lg"
            data-theme-content="dark"
          />
        </button>
      }
      radius="xl"
    >
      <div className="box is-bg-2 is-outline is-p-sm is-radius-xl is-font-sans-en">
        <ul>
          <li className="box is-flex">
            <button
              type="button"
              className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
              data-theme-button="light"
            >
              <FiSun className="icon is-lg" />
              <span className="text is-font-sans-en">Lignt</span>
            </button>
          </li>
          <li className="box is-flex">
            <button
              type="button"
              className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
              data-theme-button="dark"
            >
              <FiMoon className="icon is-lg" />
              <span className="text is-font-sans-en">Dark</span>
            </button>
          </li>
          <li className="box is-flex">
            <button
              type="button"
              className="box is-flex is-middle is-link is-nowrap is-py-xs is-px-sm is-gap-xs is-radius-ml is-flex-full"
              data-theme-button="system"
            >
              <FiMonitor className="icon is-lg" />
              <span className="text is-font-sans-en">System</span>
            </button>
          </li>
        </ul>
      </div>
    </ElementPulldown>
  )
}

function NavMain(props: Partial<Props>) {
  const { mainItems } = { ...initialProps, ...props }
  return (
    <div className="box is-none desktop:is-block">
      <div className="box is-flex is-middle is-gap-xl is-px-md is-font-sans-en">
        <ul className="box is-flex is-gap-xl">
          {mainItems.map((item, itemIndex) => (
            <li key={itemIndex}>
              <a
                href={item.url}
                className="box is-flex is-middle is-gap-xxs"
                target={item.externalLink ? "_blank" : undefined}
              >
                <span className="text is-font-sans-en is-weight-500">
                  {item.name}
                </span>
                {item.externalLink && (
                  <FiExternalLink className="icon is-dark-4" />
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function NavButton() {
  return (
    <div className="box desktop:is-none">
      <div className="box is-flex is-middle is-gap-xxs">
        <button
          type="button"
          className="box is-flex is-p-xs"
          data-modal-open="menu"
        >
          <FiMenu title="Menu" className="icon is-lg" />
        </button>
      </div>
    </div>
  )
}
