const http = require("node:http");

const publicPort = Number(process.env.RPC_PROXY_PORT || 8545);
const ganachePort = Number(process.env.GANACHE_PORT || 8546);

function respondUnavailable(response) {
  response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
  response.end("Ganache is not ready\n");
}

function checkGanache(response) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "eth_blockNumber",
    params: [],
    id: 1
  });
  const request = http.request(
    {
      hostname: "127.0.0.1",
      port: ganachePort,
      path: "/",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body)
      }
    },
    (rpcResponse) => {
      rpcResponse.resume();
      if (rpcResponse.statusCode === 200) {
        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        response.end("ok\n");
      } else {
        respondUnavailable(response);
      }
    }
  );

  request.setTimeout(2000, () => request.destroy());
  request.on("error", () => respondUnavailable(response));
  request.end(body);
}

const server = http.createServer((request, response) => {
  if (request.url === "/health" && (request.method === "GET" || request.method === "HEAD")) {
    checkGanache(response);
    return;
  }

  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: ganachePort,
      path: request.url,
      method: request.method,
      headers: { ...request.headers, host: `127.0.0.1:${ganachePort}` }
    },
    (rpcResponse) => {
      response.writeHead(rpcResponse.statusCode || 502, rpcResponse.headers);
      rpcResponse.pipe(response);
    }
  );

  upstream.on("error", (error) => {
    console.error(`RPC proxy request failed: ${error.message}`);
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      response.end("Ganache RPC is unavailable\n");
    } else {
      response.destroy(error);
    }
  });

  request.pipe(upstream);
});

server.listen(publicPort, "0.0.0.0", () => {
  console.log(`==> RPC proxy listening on 0.0.0.0:${publicPort}`);
});
