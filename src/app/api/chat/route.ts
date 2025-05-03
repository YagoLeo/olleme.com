import { createOllama } from 'ollama-ai-provider';
import { streamText, convertToCoreMessages, CoreMessage, UserContent } from 'ai';

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Destructure request data
  const { messages, selectedModel, data, ollamaUrl } = await req.json();

  // 使用请求中提供的ollamaUrl，如果没有则使用环境变量
  const apiUrl = ollamaUrl || process.env.OLLAMA_URL;

  const initialMessages = messages.slice(0, -1); 
  const currentMessage = messages[messages.length - 1]; 

  const ollama = createOllama({baseURL: apiUrl + "/api"});

  // Build message content array directly
  const messageContent: UserContent = [{ type: 'text', text: currentMessage.content }];

  // Add images if they exist
  data?.images?.forEach((imageUrl: string) => {
    const image = new URL(imageUrl);
    messageContent.push({ type: 'image', image });
  });

  // Stream text using the ollama model
  const result = await streamText({
    model: ollama(selectedModel),
    messages: [
      ...convertToCoreMessages(initialMessages),
      { role: 'user', content: messageContent },
    ],
  });

  return result.toDataStreamResponse();
}
