import Counter from "@/components/Counter"

export function getStaticData() {
  return { props: { initialCount: 3 } }
}

export default function Page({ initialCount }: { initialCount: number }) {
  return <Counter initialCount={initialCount} client:load />
}
