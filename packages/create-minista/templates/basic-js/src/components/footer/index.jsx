import styles from "./style.module.css"

/** @param {{ siteName: string }} props */
export default function Footer({ siteName }) {
  const year = new Date().getFullYear()
  return (
    <footer className={styles.footer}>
      <p className={styles.copyright}>
        © {year} {siteName}
      </p>
    </footer>
  )
}
