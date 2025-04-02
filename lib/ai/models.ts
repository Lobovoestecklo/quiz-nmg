export const DEFAULT_CHAT_MODEL: string = 'chat-model';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Claude 3.7 Sonnet',
    description: 'Основная модель для всех целей',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Claude 3.7 Sonnet + Reasoning',
    description: 'Использует reasoning для более точных ответов',
  },
];
