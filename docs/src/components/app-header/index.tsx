import { version } from "../../../package.json"
import { header as menuItems } from "../../assets/data/menu.json"
import logo from "../../assets/svgs/logo.svg"

export default function () {
  const resolvedVersion = version.replace(new RegExp("-alpha" + ".*"), "")
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-main">
          <a href="/">
            <img
              className="app-header-logo"
              src={logo}
              alt="minista"
              width={156}
              height={34}
            />
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
