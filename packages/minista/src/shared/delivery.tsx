import dayjs from "dayjs"
import utc from "dayjs/plugin/utc.js"
import timezone from "dayjs/plugin/timezone.js"

import { Head } from "./head.js"

type ContainerProps = {
  children?: React.ReactNode
}

type StylesProps = {
  defaultDark?: boolean
  darkMode?: boolean
  innerMaxWidth?: string
  defaultLightStyle?: string
  defaultDarkStyle?: string
  schemeDarkStyle?: string
  variableStyle?: string
  resetStyle?: string
  componentStyle?: string
}

type HeaderProps = {
  title?: string
  dateName?: string
  date?: string
  buttons?: Button[]
}

type Button = {
  title?: string
  path?: string
  color?: string
}

type MainProps = {
  children?: React.ReactNode
}

type NavProps = {
  title?: string
  children?: React.ReactNode
}

type ListProps = {
  items?: Item[]
}

type Item = {
  title?: string
  path?: string
  items?: Item[]
}

export function Delivery({
  title = "Project",
  bodyClass = "minista-delivery",
  dateFormat = "YYYY.MM.DD - HH:mm",
  styles,
  header,
  items,
}: {
  title?: string
  bodyClass?: string
  dateFormat?: string
  styles?: StylesProps
  header?: HeaderProps
  items?: Item[]
}) {
  dayjs.extend(timezone)
  dayjs.extend(utc)
  dayjs.tz.setDefault("Asia/Tokyo")
  const now = dayjs().tz().format(dateFormat)
  return (
    <>
      <Head
        bodyAttributes={{
          class: bodyClass && bodyClass,
        }}
      >
        {title && <title>{title}</title>}
      </Head>
      <DeliveryStyles {...styles} />
      <DeliveryContainer>
        <DeliveryHeader title={title} date={now} {...header} />
        <DeliveryMain>
          <DeliveryNav>
            {items ? (
              <DeliveryList items={items} />
            ) : (
              <div data-minista-transform-target="delivery-list" />
            )}
          </DeliveryNav>
        </DeliveryMain>
      </DeliveryContainer>
    </>
  )
}

export function DeliveryContainer({ children }: ContainerProps) {
  return <div className="minista-delivery-container">{children}</div>
}

export function DeliveryStyles({
  defaultDark = false,
  darkMode = false,
  innerMaxWidth = "800px",
  defaultLightStyle = inlineDefaultLightStyle,
  defaultDarkStyle = inlineDefaultDarkStyle,
  schemeDarkStyle = inlineSchemeDarkStyle,
  variableStyle = inlineVariableStyle,
  resetStyle = inlineResetStyle,
  componentStyle = inlineComponentStyle,
}: StylesProps) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: defaultDark ? defaultDarkStyle : defaultLightStyle,
        }}
      />
      {darkMode && (
        <style dangerouslySetInnerHTML={{ __html: schemeDarkStyle }} />
      )}
      <style dangerouslySetInnerHTML={{ __html: variableStyle }} />
      <style dangerouslySetInnerHTML={{ __html: resetStyle }} />
      <style>{`.minista-delivery {--theme-site-width: ${innerMaxWidth}}`}</style>
      <style dangerouslySetInnerHTML={{ __html: componentStyle }} />
    </>
  )
}

export function DeliveryHeader({
  title = "Project",
  dateName = "Last Update",
  date,
  buttons,
}: HeaderProps) {
  const hasButtons = buttons && buttons.length > 0
  return (
    <header className="minista-delivery-header">
      <div className="minista-delivery-header-inner">
        <div className="minista-delivery-header-grid">
          <div className="minista-delivery-header-column">
            <h1 className="minista-delivery-header-heading">{title}</h1>
            {date && (
              <p className="minista-delivery-header-date">
                {dateName + ": " + date}
              </p>
            )}
          </div>
          <div className="minista-delivery-header-column">
            {hasButtons ? (
              buttons.map((item, index) => (
                <a
                  className="minista-delivery-button"
                  href={item.path}
                  style={item.color ? { backgroundColor: item.color } : {}}
                  key={index}
                >
                  {item.title}
                </a>
              ))
            ) : (
              <div data-minista-transform-target="delivery-buttons" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export function DeliveryMain({ children }: MainProps) {
  return (
    <main className="minista-delivery-main">
      <div className="minista-delivery-main-inner">{children}</div>
    </main>
  )
}

export function DeliveryNav({ title, children }: NavProps) {
  return (
    <nav className="minista-delivery-nav">
      {title && <h2 className="minista-delivery-nav-title">{title}</h2>}
      {children}
    </nav>
  )
}

export function DeliveryList({ items }: ListProps) {
  return (
    <ul className="minista-delivery-list">
      {items?.map((item, index) => (
        <li className="minista-delivery-item" key={index}>
          <div className="minista-delivery-item-content">
            <a
              className="minista-delivery-item-content-link"
              href={item.path}
            ></a>
            <div className="minista-delivery-item-content-inner">
              <p className="minista-delivery-item-content-name">{item.title}</p>
              <p className="minista-delivery-item-content-slug">{item.path}</p>
            </div>
            <div className="minista-delivery-item-content-background"></div>
          </div>
          {item.items && DeliveryList({ items: item.items })}
        </li>
      ))}
    </ul>
  )
}

const inlineDefaultLightStyle = /* css */ `
  .minista-delivery {
    --theme-tx-1: #3e4041;
    --theme-tx-2: #4e5253;
    --theme-tx-3: #8cb4c5;
    --theme-bg-1: #eff4f7;
    --theme-bg-2: #e2e7ea;
    --theme-bg-3: #ffffff;
    --theme-bg-4: #f8fafb;
    --theme-bd-1: #eceff1;
    --theme-bd-2: #c0c7cb;
    --theme-lk-1: #00a4af;
    --theme-lk-tx: #ffffff;
  }
`

const inlineDefaultDarkStyle = /* css */ `
  .minista-delivery {
    --theme-tx-1: #e8e8e8;
    --theme-tx-2: #aaaaaa;
    --theme-tx-3: #515151;
    --theme-bg-1: #191919;
    --theme-bg-2: #292929;
    --theme-bg-3: #222222;
    --theme-bg-4: #292929;
    --theme-bd-1: #3a3a3a;
    --theme-bd-2: #515151;
    --theme-lk-1: #0a736a;
    --theme-lk-tx: #e8e8e8;
  }
`

const inlineSchemeDarkStyle = /* css */ `
  @media (prefers-color-scheme: dark) {
    .minista-delivery {
      --theme-tx-1: #e8e8e8;
      --theme-tx-2: #aaaaaa;
      --theme-tx-3: #515151;
      --theme-bg-1: #191919;
      --theme-bg-2: #292929;
      --theme-bg-3: #222222;
      --theme-bg-4: #292929;
      --theme-bd-1: #3a3a3a;
      --theme-bd-2: #515151;
      --theme-lk-1: #0a736a;
      --theme-lk-tx: #e8e8e8;
    }
  }
`

const inlineVariableStyle = /* css */ `
  .minista-delivery {
    --theme-font-sans: "Hiragino Sans", "Hiragino Kaku Gothic ProN",
      "Noto Sans Japanese", Meiryo, "Yu Gothic Medium", sans-serif,
      "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    --theme-font-sans-en: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    --theme-font-mono: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
      Meiryo, monospace, serif;
  }
`

const inlineResetStyle = /* css */ `
  *,
  ::before,
  ::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: inherit;
  }
  html {
    word-break: break-word;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: none;
    -webkit-tap-highlight-color: transparent;
  }
`

const inlineComponentStyle = /* css */ `
  .minista-delivery {
    background: var(--theme-bg-1);
    color: var(--theme-tx-2);
    font-size: 1rem;
    font-family: var(--theme-font-sans);
    line-height: 1.5;
    word-break: break-word;
  }
  .minista-delivery-container {
    min-height: 100vh;
    padding-top: max(2vw, 20px);
    padding-right: max(4vw, 16px);
    padding-left: max(4vw, 16px);
    padding-bottom: 40vh;
  }
  .minista-delivery-header {
    padding-bottom: 20px;
  }
  .minista-delivery-header-inner {
    max-width: var(--theme-site-width);
    margin-right: auto;
    margin-left: auto;
  }
  .minista-delivery-header-grid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }
  .minista-delivery-header-column {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
  }
  .minista-delivery-header-heading {
    color: var(--theme-tx-1);
    font-size: 1.5rem;
    font-weight: 800;
    font-family: var(--theme-font-sans-en);
    line-height: 1.125;
  }
  .minista-delivery-header-date {
    display: inline-flex;
    padding: 4px 8px;
    background-color: var(--theme-bg-2);
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 400;
    font-family: var(--theme-font-sans-en);
    line-height: 1;
  }
  .minista-delivery-button {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    background-color: var(--theme-lk-1);
    border-radius: 6px;
    color: var(--theme-lk-tx);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--theme-font-sans-en);
    line-height: 1.25;
    text-decoration: none;
    white-space: nowrap;
  }
  .minista-delivery-button:hover {
    filter: brightness(0.9);
  }
  .minista-delivery-main-inner {
    max-width: var(--theme-site-width);
    margin-right: auto;
    margin-left: auto;
  }
  .minista-delivery-nav {
    background-color: var(--theme-bg-3);
    border-radius: 6px;
    overflow: hidden;
  }
  .minista-delivery-nav + .minista-delivery-nav {
    margin-top: 20px;
  }
  .minista-delivery-nav-title {
    padding: 22px 32px;
    font-size: 1.125rem;
    line-height: 1;
    border-bottom: 2px solid var(--theme-bd-1);
  }
  .minista-delivery-nav
    > .minista-delivery-list
    > .minista-delivery-item:first-child {
    border-top: none;
  }
  .minista-delivery-list {
    padding-left: 32px;
    list-style: none;
  }
  .minista-delivery-item {
    border-top: 1px solid var(--theme-bd-1);
  }
  .minista-delivery-item-content {
    position: relative;
  }
  .minista-delivery-item-content-link {
    position: absolute;
    top: 0;
    right: 0;
    width: 100vw;
    height: 100%;
    z-index: 3;
  }
  .minista-delivery-item-content-background {
    position: absolute;
    top: 0;
    right: 0;
    width: 100vw;
    height: 100%;
    z-index: 1;
  }
  .minista-delivery-item-content-link:hover
    ~ .minista-delivery-item-content-background {
    background-color: var(--theme-bg-4);
  }
  .minista-delivery-item-content-link:after {
    content: "";
    position: absolute;
    top: 50%;
    right: 24px;
    width: 6px;
    height: 6px;
    border-top: 2px solid var(--theme-bd-2);
    border-right: 2px solid var(--theme-bd-2);
    transform: translateY(-50%) rotate(45deg);
    z-index: 1;
  }
  .minista-delivery-item-content-inner {
    position: relative;
    display: flex;
    align-items: center;
    padding: 24px 36px 24px 0;
    z-index: 2;
  }
  .minista-delivery-item-content-name {
    font-size: 0.875rem;
    font-weight: 600;
  }
  .minista-delivery-item-content-slug {
    margin-left: 8px;
    color: var(--theme-tx-3);
    font-size: 0.75rem;
    font-weight: 600;
  }
`
