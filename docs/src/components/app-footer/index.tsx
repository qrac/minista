import { copyright } from "../../assets/data/site.json"

export default function () {
  const startYear = copyright.startYear
  const nowYear = new Date().getFullYear()
  const rangeYear =
    startYear === nowYear ? String(nowYear) : `${startYear} - ${nowYear}`
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <p className="app-footer-copyright">
          {"©️ "}
          {copyright.url ? (
            <a href={copyright.url}>{copyright.name}</a>
          ) : (
            <span>{copyright.name}</span>
          )}
          {` ${rangeYear}`}
        </p>
      </div>
    </footer>
  )
}
