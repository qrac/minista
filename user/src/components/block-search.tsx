import { Search } from "../../../"

//import "./block-search.css"
import SvgrSearch from "../assets/svgs/search.svg"

const BlockSearch = () => {
  return (
    <>
      <Search
        jsonPath="/assets/search.json"
        //maxHitPages={2}
        className="block-search"
        placeholder="Search..."
        searchFieldInsertBeforeElement={<SvgrSearch className="search-icon" />}
        searchFieldClassName="block-search-field"
        searchListClassName="block-search-list"
      />
    </>
  )
}

export default BlockSearch
