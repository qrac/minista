import { Search } from "../../../"

//import "./block-search.css"

const BlockSearch = () => {
  return (
    <>
      <Search
        jsonPath="/assets/search.json"
        //maxHitPages={2}
        className="block-search"
        searchFieldClassName="block-search-field"
        searchListClassName="block-search-list"
      />
    </>
  )
}

export default BlockSearch
