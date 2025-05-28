import { auth } from '@/app/(auth)/auth';
import {
  getChatById,
  getMessageById,
  getMessagesByChatId,
  updateMessage,
} from '@/lib/db/queries';

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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const session = await auth();

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parts } = body;

    // Get the message to check ownership
    const message = (await getMessageById({ id }))[0];
    if (!message) {
      return Response.json({ error: 'Message not found' }, { status: 404 });
    }

    // Get the chat to check permissions
    const chat = await getChatById({ id: message.chatId });
    if (chat?.userId !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the message with the modified parts
    const updatedMessage = await updateMessage({
      id,
      parts,
    });

    return Response.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error updating message:', error);
    return Response.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 },
    );
  }
}
