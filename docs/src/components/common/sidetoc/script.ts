function copyToc() {
  const docTocEl = document.querySelector(
    "#table-of-contents + ul"
  ) as HTMLElement
  const boxEl = document.querySelector("[data-sidetoc]") as HTMLElement

  if (!docTocEl || !boxEl) return

  const clone = docTocEl.cloneNode(true)
  boxEl.appendChild(clone)
  boxEl.style.opacity = "1"
}

function setActiveLink(id: string, links: HTMLElement[]) {
  links.forEach((link) => {
    if (link.getAttribute("href") === "#" + id) {
      link.classList.add("is-active")
    } else {
      link.classList.remove("is-active")
    }
  })
}

function highlightToc() {
  const headings = [
    ...document.querySelectorAll(
      "[data-sidetoc-target] > :is(h2, h3):not(#table-of-contents)"
    ),
  ] as HTMLElement[]

  const links = [
    ...document.querySelectorAll("[data-sidetoc] a"),
    ...document.querySelectorAll(
      "[data-sidetoc-target] > :is(h2, h3):not(#table-of-contents) > a"
    ),
  ] as HTMLElement[]

  if (headings.length === 0 || links.length === 0) {
    return
  }

  const ids = headings.map((heading) => heading.id)

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.replace("#", "")
      id && setActiveLink(id, links)
    })
  })

  const options = {
    root: null,
    rootMargin: "0px 0px -50% 0px",
    threshold: 1,
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const id = entries[0].target.getAttribute("id")
      id && setActiveLink(id, links)
    } else if (!entries[0].isIntersecting) {
      const isBottom = Math.sign(entries[0].boundingClientRect.top) !== -1

      if (isBottom) {
        const id = entries[0].target.getAttribute("id")

        if (id) {
          const index = ids.indexOf(id)
          index > 0 && setActiveLink(ids[index - 1], links)
        }
      }
    }
  }, options)

  headings.forEach((heading) => observer.observe(heading))
}

export function jsSidetoc() {
  const observer = new ResizeObserver((entries) => {
    for (let entry of entries) {
      if (entry.contentRect.width >= 992) {
        copyToc()
        highlightToc()
        observer.disconnect()
        break
      }
    }
  })
  observer.observe(document.body)
}
