export default { source: ["tokens/**/*.tokens.json"], platforms: { css: { transformGroup: "css", buildPath: "src/styles/", files: [{ destination: "tokens.css", format: "css/variables" }] } } };
