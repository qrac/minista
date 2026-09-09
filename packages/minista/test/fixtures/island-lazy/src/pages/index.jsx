import Counter from "../components/counter.jsx"
export default function Page() {
  return <main><h1>Conditional Island</h1><a href="#counters">Show counters</a><div style={{ height: "3000px" }} /><section id="counters"><Counter client:visible /><Counter client:visible /></section></main>
}
