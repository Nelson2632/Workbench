// Test the built assets under the same CSP as the desktop bundle.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('workbench-v8/dist')
const config = JSON.parse(await readFile('workbench-v8/src-tauri/tauri.conf.json', 'utf8'))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = path.resolve(root, '.' + pathname)
    if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403); response.end(); return }
    const target = path.extname(file) ? file : path.join(root, 'index.html')
    response.setHeader('Content-Security-Policy', config.app.security.csp)
    response.setHeader('Content-Type', types[path.extname(target)] ?? 'application/octet-stream')
    response.end(await readFile(target))
  } catch { response.writeHead(404); response.end('Not found') }
}).listen(1421, '127.0.0.1')
