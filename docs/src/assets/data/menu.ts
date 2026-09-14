import project from "../../../project.json"

export default {
  main: {
    name: "Main",
    items: [
      {
        name: "Docs",
        url: "/ja/docs/",
        externalLink: false,
      },
      {
        name: "GitHub",
        url: "https://github.com/qrac/minista",
        externalLink: true,
      },
    ],
  },
  version: {
    name: "Versions",
    items: [
      {
        name: "v3.1.12",
        url: "https://minista-archive-v3.netlify.app/",
        externalLink: true,
      },
    ],
  },
  docs: {
    name: project.navigation.docs.name.ja,
    items: project.navigation.docs.groups.map((group) => ({
      name: group.name.ja,
      items: group.items.map((item) => ({
        name: typeof item.name === "string" ? item.name : item.name.ja,
        url: `${project.i18n.paths.ja.replace(/\/$/, "")}${item.url}`,
      })),
    })),
  },
}
