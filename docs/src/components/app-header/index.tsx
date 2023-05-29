import { version } from "../../../package.json"
import { header as menuItems } from "../../assets/data/menu.json"
import { ReactComponent as Logo } from "../../assets/svgs/logo.svg"

export default function () {
  const resolvedVersion = version.replace(new RegExp("-alpha" + ".*"), "")
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-main">
          <a href="/">
            <Logo className="app-header-logo" />
          </a>
          <span className="app-header-badge">v{resolvedVersion}</span>
        </div>
        <nav className="app-header-nav">
          <ul>
            {menuItems.map((item, index) => (
              <li key={index}>
                <a href={item.url}>{item.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
