import.meta.glob(
  [
    "/src/pages/_global.{tsx,jsx}",
    "/src/_global.{tsx,jsx}",
    "/src/global.{tsx,jsx}",
    "/src/root.{tsx,jsx}",
  ],
  {
    eager: true,
  }
)
import.meta.glob(
  ["/src/pages/**/*.{tsx,jsx,mdx,md}", "!/src/pages/_global.{tsx,jsx}"],
  {
    eager: true,
  }
)
