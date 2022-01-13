import { renderToStaticMarkup } from "react-dom/server"
import { Helmet } from "react-helmet"

const render = (element) => {
  const markup = renderToStaticMarkup(element)
  const helmet = Helmet.renderStatic()
  const staticHelmet = (data) => {
    return data.replace(/data-react-helmet="true"/g, "")
  }
  return `
    <!doctype html>
    <html lang="ja" ${helmet.htmlAttributes.toString()}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${staticHelmet(helmet.title.toString())}
        ${staticHelmet(helmet.meta.toString())}
        ${staticHelmet(helmet.link.toString())}
        ${staticHelmet(helmet.style.toString())}
        ${staticHelmet(helmet.script.toString())}
      </head>
      <body ${helmet.bodyAttributes.toString()}>
        ${markup}
      </body>
    </html>
  `
}

const Comment = ({ text }) => {
  return <div className="minista-comment">{text}</div>
}

export { render, Comment }
