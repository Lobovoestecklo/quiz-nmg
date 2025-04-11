import { auth } from '@/app/(auth)/auth';
import { checkChatHasDocuments } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('Missing chatId', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const hasDocuments = await checkChatHasDocuments({ chatId });
    return Response.json({ hasDocuments }, { status: 200 });
  } catch (error) {
    console.error('Error checking for documents:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
