import style from "../assets/style.module.css"

export default function () {
  return (
    <>
      <h1>CSS Modules</h1>
      <h2 className={style.test}>test scope style</h2>
    </>
  )
}
