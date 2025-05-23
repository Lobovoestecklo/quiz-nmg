import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { anthropic } from '@ai-sdk/anthropic'
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

const anthropicSonnet3_7ChatModel = anthropic('claude-sonnet-4-20250514')

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': anthropicSonnet3_7ChatModel,
        'chat-model-reasoning': wrapLanguageModel({
          model: anthropicSonnet3_7ChatModel,
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': anthropicSonnet3_7ChatModel,
        'artifact-model': wrapLanguageModel({
          model: anthropicSonnet3_7ChatModel,
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
