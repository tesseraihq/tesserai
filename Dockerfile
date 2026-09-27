# The MCP server as directories that run servers in a container start it (Glama). In a project,
# run it with npx instead: npx -y @tesserai/cli mcp
FROM node:24-slim
RUN npm install -g @tesserai/cli@0.2.2
WORKDIR /project
ENTRYPOINT ["tesserai", "mcp"]
