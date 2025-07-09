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
 * Скачивает файл из Blob
 * @param blob - Blob с данными файла
 * @param filename - имя файла для скачивания
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Экспортирует данные в Excel файл (автоматическое скачивание)
 * @param data - массив массивов данных (строки)
 * @param filename - имя файла для скачивания
 */
export function exportToExcel(
  data: string[][],
  filename: string = 'export.xlsx',
): void {
  const blob = createExcelBlob(data);
  downloadBlob(blob, filename);
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
