import styles from "./style.module.css"

export default function Footer({ siteName }: { siteName: string }) {
  const year = new Date().getFullYear()
  return (
    <footer className={styles.footer}>
      <p className={styles.copyright}>
        © {year} {siteName}
      </p>
    </footer>
  )
}
