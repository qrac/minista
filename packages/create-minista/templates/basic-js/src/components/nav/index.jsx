import styles from "./style.module.css"

/** @param {{ currentUrl: string, navItems: { label: string, url: string }[] }} props */
export default function Nav(props) {
  return (
    <nav>
      <ul className={styles.list}>
        {props.navItems.map((item) => (
          <li key={item.url}>
            <a
              className={styles.link}
              href={item.url}
              aria-current={props.currentUrl === item.url ? "page" : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
