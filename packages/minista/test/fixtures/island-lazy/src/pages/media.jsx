import Counter from "../components/counter.jsx"
export default function Page() {
  return <main><h1>Media Island</h1><Counter client:media="(max-width: 600px)" /></main>
}
