/**
 * figma-relay.mjs
 *
 * Tiny HTTP relay server that bridges Osyle (browser tab) → Figma plugin.
 * Replaces the localStorage approach, which fails because Figma Desktop's
 * Electron webview uses a separate storage partition from Chrome.
 *
 * Run alongside your Vite dev server:
 *   node figma-relay.mjs
 *
 * Endpoints:
 *   POST /figma-payload        — Osyle posts the export payload here
 *   GET  /figma-payload/:token — Figma plugin polls this to retrieve it
 *   POST /figma-ack/:token     — Figma plugin posts ACK when payload received
 *   GET  /figma-ack/:token     — Osyle polls this to confirm delivery
 *   GET  /figma-ping           — health check
 *
 * No dependencies beyond Node.js built-ins.
 */

import { createServer } from 'http'

const PORT = 8765
const payloads = new Map() // token → { payload, createdAt }
const acks = new Map() // token → timestamp
const TTL_MS = 10 * 60 * 1000 // 10 minutes

function evictExpired() {
  const now = Date.now()
  for (const [token, entry] of payloads) {
    if (now - entry.createdAt > TTL_MS) {
      payloads.delete(token)
      acks.delete(token)
    }
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function json(res, status, data) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname

  // CORS preflight
  if (req.method === 'OPTIONS') {
    cors(res)
    res.writeHead(204)
    res.end()
    return
  }

  evictExpired()

  // Health check
  if (path === '/figma-ping' && req.method === 'GET') {
    return json(res, 200, { ok: true, payloads: payloads.size })
  }

  // POST /figma-payload — Osyle stores a payload
  if (path === '/figma-payload' && req.method === 'POST') {
    try {
      const payload = await readBody(req)
      if (!payload?.token) return json(res, 400, { error: 'Missing token' })
      payloads.set(payload.token, { payload, createdAt: Date.now() })
      console.log(
        `[relay] Stored payload token=${payload.token} screens=${payload.screens?.length}`,
      )
      return json(res, 200, { ok: true, token: payload.token })
    } catch (e) {
      return json(res, 400, { error: 'Invalid JSON' })
    }
  }

  // GET /figma-payload/:token — Figma plugin retrieves a payload
  const payloadMatch = path.match(/^\/figma-payload\/([^/]+)$/)
  if (payloadMatch && req.method === 'GET') {
    const token = payloadMatch[1]
    const entry = payloads.get(token)
    if (!entry) return json(res, 404, { error: 'Not found' })
    console.log(`[relay] Retrieved payload token=${token}`)
    return json(res, 200, entry.payload)
  }

  // GET /figma-payload-latest — Figma plugin polls for ANY new payload
  if (path === '/figma-payload-latest' && req.method === 'GET') {
    // Return the most recently stored payload that hasn't been ACKed
    let latest = null
    let latestTime = 0
    for (const [token, entry] of payloads) {
      if (!acks.has(token) && entry.createdAt > latestTime) {
        latest = entry.payload
        latestTime = entry.createdAt
      }
    }
    if (!latest) return json(res, 404, { error: 'No pending payload' })
    console.log(`[relay] Polling: found payload token=${latest.token}`)
    return json(res, 200, latest)
  }

  // POST /figma-ack/:token — Figma plugin acknowledges receipt
  const ackPostMatch = path.match(/^\/figma-ack\/([^/]+)$/)
  if (ackPostMatch && req.method === 'POST') {
    const token = ackPostMatch[1]
    acks.set(token, Date.now())
    payloads.delete(token) // one-time use
    console.log(`[relay] ACK received token=${token}`)
    return json(res, 200, { ok: true })
  }

  // GET /figma-ack/:token — Osyle polls for ACK
  const ackGetMatch = path.match(/^\/figma-ack\/([^/]+)$/)
  if (ackGetMatch && req.method === 'GET') {
    const token = ackGetMatch[1]
    const ackTime = acks.get(token)
    if (!ackTime) return json(res, 404, { error: 'No ACK yet' })
    acks.delete(token)
    return json(res, 200, { ok: true, ackedAt: ackTime })
  }

  return json(res, 404, { error: 'Not found' })
})

// Bind to 0.0.0.0 so the relay is reachable both when running natively
// (localhost:8765) and when running inside Docker (mapped via port binding).
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[relay] Osyle Figma relay running on http://localhost:${PORT}`)
  console.log(`[relay] Keep this running alongside your Vite dev server`)
})

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(
      `[relay] Port ${PORT} already in use — relay may already be running`,
    )
  } else {
    console.error('[relay] Server error:', e)
  }
})
