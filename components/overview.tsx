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
            Привет! Я ваш персональный консультант по обучению и развитию
          </h2>

          <p className="text-muted-foreground">
            Расскажите о ваших карьерных целях — я помогу подобрать курсы
            и составить персональный план развития!
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
          <h3 className="font-medium text-foreground">
            🎓 Доступные направления:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • <strong>Управление и лидерство</strong> — проектный менеджмент, Agile, эмоциональный интеллект
            </li>
            <li>
              • <strong>Технические навыки</strong> — Python, машинное обучение, веб-разработка
            </li>
            <li>
              • <strong>Бизнес и финансы</strong> — финансы, маркетинг, предпринимательство
            </li>
            <li>
              • <strong>Soft skills</strong> — презентации, тайм-менеджмент, коммуникации
            </li>
            <li>
              • <strong>Дизайн и креативность</strong> — UX/UI, графический дизайн
            </li>
          </ul>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
          <h3 className="font-medium text-foreground">🎯 Как это работает:</h3>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>Расскажите о вашей должности, опыте и целях развития</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Я проанализирую ваши потребности и текущий уровень</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>Подберу 3-5 наиболее подходящих курсов из каталога</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">4.</span>
              <span>
                Составлю персональный план обучения с фазами и milestone'ами
              </span>
            </li>
          </ol>
        </div>

        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-2 text-left">
          <h3 className="font-medium text-green-700 dark:text-green-300">
            💡 Начните прямо сейчас:
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400">
            Просто напишите: "Привет, хочу развиваться профессионально" — 
            и я задам несколько вопросов, чтобы составить идеальный план обучения именно для вас!
          </p>
        </div>
      </div>
    </motion.div>
  );
};
