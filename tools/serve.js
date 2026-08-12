#!/usr/bin/env node

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.argv[2]) || 8000

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    const file = path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url)

    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end('Forbidden')
      return
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end(`Not found: ${url}`)
      return
    }

    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, () => {
    console.log(`serving ${ROOT} on http://localhost:${PORT}/  (ctrl-c to stop)`)
  })
