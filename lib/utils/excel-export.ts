import * as XLSX from 'xlsx';
import { parse } from 'papaparse';

/**
 * Создает Excel файл и возвращает Blob
 * @param data - массив массивов данных (строки)
 * @returns Blob с Excel файлом
 */
export function createExcelBlob(data: string[][]): Blob {
  // Создаем рабочую книгу
  const workbook = XLSX.utils.book_new();

  // Создаем рабочий лист из данных
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Добавляем лист в книгу
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Генерируем файл
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Создаем Blob
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Генерирует имя файла с текущей датой
 * @param baseName - базовое имя файла (без расширения)
 * @returns имя файла с датой
 */
export function generateFilenameWithDate(baseName: string = 'export'): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '-'); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS

  return `${baseName}_${dateStr}_${timeStr}.xlsx`;
}

/**
 * Скачивает файл из Blob с улучшенной совместимостью браузеров
 * @param blob - Blob с данными файла
 * @param filename - имя файла для скачивания
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Проверяем, что мы в браузере
  if (typeof window === 'undefined') {
    console.error('downloadBlob: Нельзя скачать файл вне браузера');
    return;
  }

  // Проверяем поддержку Blob и URL.createObjectURL
  if (!window.URL || !window.URL.createObjectURL) {
    console.error('downloadBlob: Браузер не поддерживает URL.createObjectURL');
    return;
  }

  let url: string | undefined = undefined;
  let link: HTMLAnchorElement | null = null;

  try {
    // Создаем URL для Blob
    url = window.URL.createObjectURL(blob);

    // Создаем временный элемент <a>
    link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Устанавливаем стили для совместимости с Safari
    link.style.display = 'none';
    link.style.position = 'absolute';
    link.style.left = '-9999px';

    // Добавляем элемент в DOM
    document.body.appendChild(link);

    // Программно кликаем по элементу
    // Для Safari используем setTimeout
    if (
      navigator.userAgent.includes('Safari') &&
      !navigator.userAgent.includes('Chrome')
    ) {
      setTimeout(() => {
        link?.click();
      }, 100);
    } else {
      link.click();
    }
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    throw error;
  } finally {
    // Очищаем ресурсы
    if (link && document.body.contains(link)) {
      document.body.removeChild(link);
    }

    // Освобождаем память
    if (url) {
      // Используем setTimeout для Safari
      setTimeout(() => {
        window.URL.revokeObjectURL(url!);
      }, 1000);
    }
  }
}

/**
 * Продвинутая функция скачивания файла с обработкой edge cases
 * @param blob - Blob с данными файла
 * @param filename - имя файла для скачивания
 * @returns Promise, который разрешается после завершения скачивания
 */
export async function downloadBlobAdvanced(
  blob: Blob,
  filename: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Проверяем, что мы в браузере
    if (typeof window === 'undefined') {
      reject(new Error('Нельзя скачать файл вне браузера'));
      return;
    }

    // Проверяем поддержку Blob и URL.createObjectURL
    if (!window.URL || !window.URL.createObjectURL) {
      reject(new Error('Браузер не поддерживает URL.createObjectURL'));
      return;
    }

    let url: string | undefined = undefined;
    let link: HTMLAnchorElement | null = null;

    try {
      // Создаем URL для Blob
      url = window.URL.createObjectURL(blob);

      // Создаем временный элемент <a>
      link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Устанавливаем стили для совместимости с Safari
      link.style.display = 'none';
      link.style.position = 'absolute';
      link.style.left = '-9999px';
      link.style.top = '-9999px';

      // Добавляем обработчики событий для отслеживания скачивания
      const cleanup = () => {
        if (link && document.body.contains(link)) {
          document.body.removeChild(link);
        }
        if (url) {
          setTimeout(() => {
            window.URL.revokeObjectURL(url!);
          }, 1000);
        }
      };

      // Добавляем элемент в DOM
      document.body.appendChild(link);

      // Программно кликаем по элементу
      // Для Safari используем setTimeout
      if (
        navigator.userAgent.includes('Safari') &&
        !navigator.userAgent.includes('Chrome')
      ) {
        setTimeout(() => {
          link?.click();
          setTimeout(() => {
            cleanup();
            resolve();
          }, 100);
        }, 100);
      } else {
        link.click();
        setTimeout(() => {
          cleanup();
          resolve();
        }, 100);
      }
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);
      reject(error);
    }
  });
}

/**
 * Экспортирует данные в Excel файл (автоматическое скачивание)
 * @param data - массив массивов данных (строки)
 * @param filename - имя файла для скачивания (опционально)
 */
export function exportToExcel(data: string[][], filename?: string): void {
  const finalFilename = filename || generateFilenameWithDate();
  const blob = createExcelBlob(data);
  downloadBlob(blob, finalFilename);
}

/**
 * Конвертирует CSV строку в массив массивов для экспорта в Excel
 * @param csvContent - CSV контент
 * @returns массив массивов данных
 */
export function csvToExcelData(csvContent: string): string[][] {
  if (!csvContent.trim()) {
    return [];
  }

  // Используем papaparse для корректного парсинга CSV
  const result = parse<string[]>(csvContent, {
    skipEmptyLines: true,
    transform: (value) => value.trim(), // Убираем лишние пробелы
  });

  // Фильтруем пустые строки
  const nonEmptyRows = result.data.filter((row) =>
    row.some((cell) => cell.trim() !== ''),
  );

  return nonEmptyRows;
}
