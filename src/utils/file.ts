import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export async function saveToFile<T>(data: T, filename: string): Promise<void> {
  try {
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const filePath = path.join(outputDir, filename);
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    logger.info(`Данные сохранены в файл: ${filePath}`);
  } catch (error: any) {
    logger.error(`Ошибка при сохранении файла: ${error.message}`);
    throw error;
  }
} 