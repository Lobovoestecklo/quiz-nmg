import { auth } from '@/app/(auth)/auth';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return Response.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const session = await auth();

    if (!session || !session.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the chat to check permissions
    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Check if the user has permission to access this chat
    if (chat.visibility === 'private' && chat.userId !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get messages from the database
    const messages = await getMessagesByChatId({
      id: chatId,
    });

    return Response.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return Response.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 },
    );
  }
}
