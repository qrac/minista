import Counter from "../components/counter.jsx"
export function getStaticData() {
  return { props: { counts: [3, 7] } }
}
export default function Page({ counts }) {
  return <main><h1>Conditional Island</h1><a href="#counters">Show counters</a><div style={{ height: "3000px" }} /><section id="counters">{counts.map((initialCount) => <Counter key={initialCount} initialCount={initialCount} client:visible />)}</section></main>
}
