import { Image } from "minista"

export const getStaticData = async () => {
  return {
    props: {
      components: {
        img: (el: React.HTMLProps<HTMLElement>) => (
          <Image src={el.src} alt={el.alt} />
        ),
      },
    },
  }
}
