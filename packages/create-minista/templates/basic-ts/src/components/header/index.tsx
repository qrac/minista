import Nav from "../nav"

import styles from "./style.module.css"

export default function Header(props: {
  siteName: string
  currentUrl: string
  navItems: { label: string; url: string }[]
}) {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.siteName}>
        {props.siteName}
      </a>
      <Nav currentUrl={props.currentUrl} navItems={props.navItems} />
    </header>
  )
}
