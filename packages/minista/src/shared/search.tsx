import { useState, useEffect } from "react"

type SearchData = {
  words: string[]
  hits: number[]
  pages: SearchPage[]
}

type SearchPage = {
  path: string
  title: number[]
  toc: [number, string][]
  content: number[]
}

type SearchResult = {
  path: string
  content: string
}

type SearchProps = {
  placeholder?: string
  minHitLength?: number
  maxHitPages?: number
  maxHitWords?: number
  searchFieldClassName?: string
  searchFieldInsertBeforeElement?: React.ReactElement
  searchFieldInsertAfterElement?: React.ReactElement
  searchListClassName?: string
  attributes?: React.HTMLAttributes<HTMLElement>
} & React.HTMLAttributes<HTMLElement>

type SearchFieldProps = {
  placeholder?: string
  minHitLength?: number
  maxHitPages?: number
  maxHitWords?: number
  insertBeforeElement?: React.ReactElement
  insertAfterElement?: React.ReactElement
  setSearchValues?: React.Dispatch<React.SetStateAction<string[]>>
  setSearchHitValues?: React.Dispatch<React.SetStateAction<string[]>>
  setSearchResults?: React.Dispatch<React.SetStateAction<SearchResult[]>>
  attributes?: React.HTMLAttributes<HTMLElement>
} & React.HTMLAttributes<HTMLElement>

type SearchListProps = {
  searchValues?: string[]
  searchHitValues?: string[]
  searchResults?: SearchResult[]
  attributes?: React.HTMLAttributes<HTMLElement>
} & React.HTMLAttributes<HTMLElement>

function compNum(a: number, b: number) {
  return a - b
}

export function Search(props: SearchProps) {
  const {
    placeholder = props.placeholder || "",
    minHitLength = props.minHitLength || 2,
    maxHitPages = props.maxHitPages || 5,
    maxHitWords = props.maxHitWords || 20,
    searchFieldInsertBeforeElement,
    searchFieldInsertAfterElement,
    searchFieldClassName,
    searchListClassName,
    ...attributes
  } = props
  const [searchValues, setSearchValues] = useState<string[]>([])
  const [searchHitValues, setSearchHitValues] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  return (
    <div {...attributes}>
      <SearchField
        className={searchFieldClassName}
        placeholder={placeholder}
        minHitLength={minHitLength}
        maxHitPages={maxHitPages}
        maxHitWords={maxHitWords}
        insertBeforeElement={searchFieldInsertBeforeElement}
        insertAfterElement={searchFieldInsertAfterElement}
        setSearchValues={setSearchValues}
        setSearchHitValues={setSearchHitValues}
        setSearchResults={setSearchResults}
      />
      <SearchList
        className={searchListClassName}
        searchValues={searchValues}
        searchHitValues={searchHitValues}
        searchResults={searchResults}
      />
    </div>
  )
}

export function SearchField(props: SearchFieldProps) {
  const {
    placeholder = props.placeholder || "",
    minHitLength = props.minHitLength || 2,
    maxHitPages = props.maxHitPages || 5,
    maxHitWords = props.maxHitWords || 20,
    insertBeforeElement,
    insertAfterElement,
    setSearchValues,
    setSearchHitValues,
    setSearchResults,
    ...attributes
  } = props
  const [callSearchData, setCallSearchData] = useState<boolean>(false)
  const [searchData, setSearchData] = useState<SearchData>({
    words: [],
    hits: [],
    pages: [],
  })
  const [searchHits, setSearchHits] = useState<string[]>([])
  const [searchPages, setSearchPages] = useState<SearchPage[]>([])

  const searchHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!callSearchData) {
      setCallSearchData(true)
    }
    if (!searchData || !searchHits || !searchPages) {
      return
    }

    const inputValues = event.target.value.split(" ")
    const mergedInputValues = [...new Set(inputValues)].sort()
    const hitValues = mergedInputValues.map((value) => {
      if (value.length >= minHitLength) {
        return searchHits.filter((hit) => {
          return new RegExp(value, "i").test(hit)
        })
      } else {
        return []
      }
    })
    const mergedHitValues = [...new Set(hitValues.flat())].sort()
    const hitIndexes = mergedHitValues.map((value) => {
      return searchData.words.indexOf(value)
    })
    const hitPages: SearchPage[] = searchPages.flatMap((page) => {
      const titleIndexs = page.title.filter((i) => hitIndexes.indexOf(i) !== -1)
      const contentIndexs = page.content.filter(
        (i) => hitIndexes.indexOf(i) !== -1
      )
      if (titleIndexs.length || contentIndexs.length) {
        return {
          path: page.path,
          title: titleIndexs,
          toc: page.toc,
          content: contentIndexs,
        }
      } else {
        return []
      }
    })
    const sortedHitPages = [...new Set(hitPages)]
      .sort((a, b) => {
        if (a.title.length !== b.title.length) {
          return (a.title.length - b.title.length) * -1
        }
        if (a.content.length !== b.content.length) {
          return (a.content.length - b.content.length) * -1
        }
        return 0
      })
      .slice(0, maxHitPages)
    const resultHitPages: SearchResult[] = sortedHitPages.map((page) => {
      const targetPage = searchData.pages.find(
        (dataPage) => dataPage.path === page.path
      ) as SearchPage
      if (page.title.length) {
        const targetContent = targetPage.title
          .map((num) => searchData.words[num])
          .join(" ")
        return {
          path: targetPage.path,
          content: targetContent,
        }
      } else {
        const targetWord = page.content[0]
        const targetIndex = targetPage.content.indexOf(targetWord)

        const targetIndexes = targetPage.content.slice(
          targetIndex,
          targetIndex + maxHitWords
        )
        const targetWords = targetIndexes
          .map((num) => searchData.words[num])
          .join("")
        const targetContent = "..." + targetWords + "..."

        function getTargetId(targetIndex: number, toc: [number, string][]) {
          if (!toc.length) {
            return ""
          }
          const targetToc = page.toc
            .filter((item) => targetIndex >= item[0])
            .slice(-1)[0]
          const targetId = targetToc ? "#" + targetToc[1] : ""
          return targetId
        }
        const targetId = getTargetId(targetIndex, page.toc)

        return {
          path: targetPage.path + targetId,
          content: targetContent,
        }
      }
    })

    if (setSearchValues) {
      const filterdInputValues = mergedInputValues.filter(
        (value) => value && !value.includes(" ")
      )
      setSearchValues(filterdInputValues)
    }
    if (setSearchHitValues) {
      setSearchHitValues(mergedHitValues)
    }
    if (setSearchResults) {
      setSearchResults(resultHitPages)
    }
    //console.log("inputValues", inputValues)
    //console.log("hitValues", hitValues)
    //console.log("mergedHitValues", mergedHitValues)
    //console.log("hitIndexes", hitIndexes)
    //console.log("hitPages", hitPages)
    //console.log("sortedHitPages", sortedHitPages)
    //console.log("resultHitPages", resultHitPages)
    return
  }

  useEffect(() => {
    if (callSearchData) {
      const getSearchData = async () => {
        //prettier-ignore
        const response = await fetch("/@minista-temp/__minista_plugin_search.json")
        const data = await response.json()
        setSearchData(data)

        if (data.words && data.hits) {
          const hitWords: string[] = []
          await Promise.all(
            data.hits.map(async (hit: string) => {
              return hitWords.push(data.words[hit])
            })
          )
          setSearchHits(hitWords)
        }

        if (data.words && data.pages) {
          const optimizePages: SearchPage[] = []
          await Promise.all(
            data.pages.map(async (page: SearchPage) => {
              return optimizePages.push({
                path: page.path,
                title: [...new Set(page.title)].sort(compNum),
                toc: page.toc,
                content: [...new Set(page.content)].sort(compNum),
              })
            })
          )
          setSearchPages(optimizePages)
        }
      }
      getSearchData()
      //console.log("callSearchData", true)
    }
  }, [callSearchData])

  /*useEffect(() => {
    console.log("searchData", searchData)
  }, [searchData])*/
  return (
    <div {...attributes}>
      {insertBeforeElement}
      <input type="search" placeholder={placeholder} onChange={searchHandler} />
      {insertAfterElement}
    </div>
  )
}

export function SearchList(props: SearchListProps) {
  const { searchValues, searchHitValues, searchResults, ...attributes } = props

  const checkValues = searchValues && searchValues.length
  const checkHitValues = searchHitValues && searchHitValues.length
  const checkResults = searchResults && searchResults.length

  if (checkValues && checkHitValues && checkResults) {
    const regValues = new RegExp(`(${searchValues.join("|")})`, "ig")
    const regHitValues = new RegExp(`(${searchHitValues.join("|")})`, "ig")
    //console.log("searchValues", searchValues)
    //console.log("regValues", regValues)
    //console.log("regHitValues", regHitValues)

    return (
      <ul {...attributes}>
        {searchResults.map((item, index) => {
          const words = item.content.split(regHitValues)
          const filteredWords = words.filter((word) => word && word.length > 0)
          const renderdWords = filteredWords.map((word, wordIndex) => {
            if (word.match(regHitValues)) {
              const glyphs = word.split(regValues)
              const renderdGlyphs = glyphs.map((glyph, glyphIndex) => {
                if (glyph.match(regValues)) {
                  return <mark key={glyphIndex}>{glyph}</mark>
                } else {
                  return <span key={glyphIndex}>{glyph}</span>
                }
              })
              return <span key={wordIndex}>{renderdGlyphs}</span>
            } else {
              return <span key={wordIndex}>{word}</span>
            }
          })
          const content = renderdWords
          //console.log("words", words)
          //console.log("filteredWords", filteredWords)
          //console.log("renderdWords", renderdWords)

          return (
            <li key={index}>
              <a href={item.path}>
                <div>
                  <p>
                    <strong>{content}</strong>
                  </p>
                  <p>
                    <small>{item.path}</small>
                  </p>
                </div>
              </a>
            </li>
          )
        })}
      </ul>
    )
  } else if (checkResults) {
    return (
      <ul {...attributes}>
        {searchResults.map((item, index) => {
          return (
            <li key={index}>
              <a href={item.path}>
                <div>
                  <p>
                    <strong>{item.content}</strong>
                  </p>
                  <p>
                    <small>{item.path}</small>
                  </p>
                </div>
              </a>
            </li>
          )
        })}
      </ul>
    )
  } else {
    return <></>
  }
}
