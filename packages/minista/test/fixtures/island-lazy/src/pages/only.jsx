import Counter from "../components/counter.jsx"
export default function Page() {
  return <main><h1>Only Island</h1><Counter client:only /></main>
}
