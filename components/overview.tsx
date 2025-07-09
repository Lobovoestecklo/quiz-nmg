import { motion } from 'framer-motion';
import Link from 'next/link';

import { MessageIcon, VercelIcon } from './icons';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-6 leading-relaxed text-center max-w-2xl">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Привет! Я помогу тебе создать качественные образовательные тесты
          </h2>

          <p className="text-muted-foreground">
            Загружай документы с учебным материалом — я помогу структурировать
            тест и подготовить данные для импорта!
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
          <h3 className="font-medium text-foreground">
            📁 Поддерживаемые форматы:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • <strong>PDF</strong> — учебники, методички, презентации
            </li>
            <li>
              • <strong>DOCX</strong> — документы Word с текстом
            </li>
            <li>
              • <strong>PPTX</strong> — презентации PowerPoint
            </li>
            <li>
              • <strong>TXT</strong> — простые текстовые файлы
            </li>
            <li>
              • <strong>Изображения</strong> — скриншоты, фотографии документов
            </li>
          </ul>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
          <h3 className="font-medium text-foreground">🎯 Как это работает:</h3>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>Загрузи документ с учебным материалом</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Я проанализирую содержимое и задам уточняющие вопросы</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>Создам структуру теста с разными типами вопросов</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">4.</span>
              <span>
                Подготовлю готовую таблицу для импорта в систему тестирования
              </span>
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2 text-left">
          <h3 className="font-medium text-blue-700 dark:text-blue-300">
            💡 Совет:
          </h3>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Чем качественнее и структурированнее будет материал, тем лучше
            получится тест. Рекомендуем загружать документы с четкой структурой
            глав и разделов.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
