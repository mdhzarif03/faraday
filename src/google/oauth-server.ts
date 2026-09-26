import http from "node:http";
import { google } from "googleapis";
import { getGoogleAuthUrl, oauth2Client } from "./auth.js";
import { saveTokens } from "./token-store.js";

const PORT = 3000;

export function startOAuthServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/auth") {
      const authUrl = getGoogleAuthUrl();

      res.writeHead(302, {
        Location: authUrl,
      });

      res.end();
      return;
    }

    if (url.pathname === "/oauth2callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        res.writeHead(400, {
          "Content-Type": "text/plain",
        });

        res.end("Missing authorization code.");
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        await saveTokens();

        console.log("\nGoogle OAuth successful.");
        console.log("Tokens received.");

        const gmail = google.gmail({
          version: "v1",
          auth: oauth2Client,
        });

        const profile = await gmail.users.getProfile({
          userId: "me",
        });

        console.log(`Connected Gmail account: ${profile.data.emailAddress}`);

        res.writeHead(200, {
          "Content-Type": "text/html",
        });

        res.end(`
          <h1>Faraday connected successfully.</h1>
          <p>You can close this window and return to Discord.</p>
        `);
      } catch (error) {
        console.error("Google OAuth failed:", error);

        res.writeHead(500, {
          "Content-Type": "text/plain",
        });

        res.end("Google OAuth failed. Check the Faraday terminal.");
      }

      return;
    }

    res.writeHead(404, {
      "Content-Type": "text/plain",
    });

    res.end("Not found.");
  });

  server.listen(PORT, () => {
    console.log(`Google OAuth server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/auth to connect Google.`);
  });
}
