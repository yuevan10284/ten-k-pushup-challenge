export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const target = new URL("https://ten-k-pushup-challenge.yuevan10284.chatgpt.site/api/athletes");
  target.search = incoming.search;
  const response = await fetch(target, { cache: "no-store" });
  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" },
  });
}
