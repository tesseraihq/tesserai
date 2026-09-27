import type { GatsbyConfig } from "gatsby"

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Saltmarsh Journal`,
    siteUrl: `https://saltmarsh.example`,
  },
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-theme-ui",
    {
      resolve: "gatsby-plugin-google-fonts-v2",
      options: {
        fonts: [
          { family: "Work Sans", weights: ["400", "500", "600"] },
          { family: "Playfair Display", weights: ["600", "700"] },
          { family: "Fira Code", weights: ["400"] },
        ],
      },
    },
  ],
}

export default config
