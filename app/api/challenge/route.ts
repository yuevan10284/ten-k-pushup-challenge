const upstream = "https://ten-k-pushup-challenge.yuevan10284.chatgpt.site/api/challenge";

async function proxy(request: Request) {
  const incoming = new URL(request.url);
  const target = new URL(upstream);
  target.search = incoming.search;
  const response = await fetch(target, {
    method: request.method,
    headers: { "content-type": request.headers.get("content-type") || "application/json" },
    body: request.method === "GET" ? undefined : await request.text(),
    cache: "no-store",
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" },
  });
}

export const GET = proxy;
export const POST = proxy;
