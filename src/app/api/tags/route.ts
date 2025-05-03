export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  // 获取URL参数中的ollamaUrl，如果没有则使用环境变量
  const url = new URL(req.url);
  const ollamaUrl = url.searchParams.get('ollamaUrl');
  
  const res = await fetch(
    ollamaUrl + "/api/tags"
  );
  return new Response(res.body, res);
}
