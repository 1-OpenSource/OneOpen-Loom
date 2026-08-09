import { Server } from "@hocuspocus/server";

const port = Number(process.env.COLLAB_PORT || 1234);
const apiBase = (process.env.MAGICBOARD_API_URL || "http://localhost:8002").replace(/\/$/, "");

const server = Server.configure({
  port,
  async onAuthenticate({ token, documentName }) {
    if (!token) {
      throw new Error("Missing auth token");
    }
    if (!documentName.startsWith("page-")) {
      throw new Error("Invalid document");
    }
    const pageId = documentName.slice("page-".length);
    const response = await fetch(`${apiBase}/api/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error("Unauthorized for page");
    }
    const page = await response.json();
    return {
      user: {
        pageId: page.id,
        title: page.title
      }
    };
  }
});

server.listen().then(() => {
  console.log(`Magicboard collab listening on ws://localhost:${port}`);
});
