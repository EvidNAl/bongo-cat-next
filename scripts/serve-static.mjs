import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const rootDir = resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? "3000");
const host = process.argv[4] ?? "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function toSafePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const normalized = normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  return normalized.startsWith("/") || normalized.startsWith("\\") ? normalized.slice(1) : normalized;
}

function resolveFilePath(urlPath) {
  const safePath = toSafePath(urlPath);
  const directPath = resolve(rootDir, safePath);
  const indexPath = resolve(rootDir, safePath, "index.html");

  if (existsSync(directPath)) {
    const stats = statSync(directPath);
    if (stats.isDirectory()) {
      const nestedIndex = join(directPath, "index.html");
      if (existsSync(nestedIndex)) {
        return nestedIndex;
      }
    } else {
      return directPath;
    }
  }

  if (existsSync(indexPath)) {
    return indexPath;
  }

  return resolve(rootDir, "404.html");
}

const server = createServer((request, response) => {
  const filePath = resolveFilePath(request.url ?? "/");

  if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] ?? "application/octet-stream";
  const statusCode = filePath.endsWith("404.html") ? 404 : 200;

  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": contentType
  });

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`static preview listening on http://${host}:${port}`);
  console.log(`serving ${rootDir}`);
});
