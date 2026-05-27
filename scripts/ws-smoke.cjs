const WebSocket = require("ws")
const fp = "smoke-node-" + Date.now()
const ws = new WebSocket("ws://localhost:3000/faucet/ws?fingerprint=" + fp)
const collected = []
ws.on("open", () => console.log("OPEN"))
ws.on("message", m => { console.log("MSG:", m.toString()); collected.push(m.toString()) })
ws.on("error", e => console.log("ERR:", e.message))
ws.on("close", (code, reason) => console.log("CLOSE", code, reason.toString()))
setTimeout(async () => {
  console.log("--- firing HTTP request ---")
  const r = await fetch("http://localhost:3000/api/v1/faucet/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses: { "bitcoin:testnet": "tb1qquv9lg5g2r4jkr0ahun0ddfg5xntxjelvmc7t8" }, deviceFingerprint: fp })
  })
  console.log("HTTP", r.status, await r.text())
}, 500)
setTimeout(() => { console.log("FINAL events:", collected.length); ws.close(); process.exit(0) }, 6000)
