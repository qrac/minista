import { Image } from "minista"

export const getStaticData = async () => {
  return {
    props: {
      components: {
        img: (el: HTMLImageElement) => <Image src={el.src} alt={el.alt} />,
      },
    },
  }
}
