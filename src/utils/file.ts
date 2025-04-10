import { Profile, ProfileWithConnections } from '../types/profile';
import { ProfileAnalysis } from '../services/ai.service';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

// Функция для создания директории output, если она не существует
function ensureOutputDirectory(): string {
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    logger.info('Создана директория output');
  }
  return outputDir;
}

export async function saveToFile(profiles: Profile[], filename: string): Promise<void> {
  try {
    const outputDir = ensureOutputDirectory();
    const filePath = path.join(outputDir, filename);
    const data = JSON.stringify(profiles, null, 2);
    
    await fs.promises.writeFile(filePath, data);
    logger.info(`Данные сохранены в файл: ${filePath}`);
  } catch (error: any) {
    logger.error(`Ошибка при сохранении в файл: ${error.message}`);
    throw error;
  }
}

export async function saveToExcel(profiles: Profile[], filename: string): Promise<void> {
  try {
    const outputDir = ensureOutputDirectory();
    const filePath = path.join(outputDir, filename);

    // Преобразуем профили в формат для Excel
    const excelData = profiles.map(profile => {
      const topPosts = profile.topPosts || [];
      return {
        'Имя пользователя': profile.username,
        'ID пользователя': profile.userId,
        'Полное имя': profile.fullName,
        'Подписчики': profile.followersCount,
        'Подписки': profile.followingCount,
        'Публикации': profile.postsCount,
        'Приватный аккаунт': profile.isPrivate ? 'Да' : 'Нет',
        'Верифицирован': profile.isVerified ? 'Да' : 'Нет',
        'Описание': profile.biography,
        'Внешняя ссылка': profile.externalUrl || '',
        'Фото профиля': profile.profilePicUrl || '',
        'Email': profile.businessEmail || '',
        'Телефон': profile.businessPhoneNumber || '',
        'Бизнес-аккаунт': profile.isBusinessAccount ? 'Да' : 'Нет',
        'Категория бизнеса': profile.businessCategory || '',
        // Контактные данные
        'WhatsApp номера': profile.contactInfo.whatsappNumbers.join(', '),
        'Telegram ссылки': profile.contactInfo.telegramLinks.join(', '),
        'Номера телефонов': profile.contactInfo.phoneNumbers.join(', '),
        // Топ пост 1
        'Топ пост 1 - Лайки': topPosts[0]?.likes || 0,
        'Топ пост 1 - Комментарии': topPosts[0]?.comments || 0,
        'Топ пост 1 - Описание': topPosts[0]?.caption || '',
        'Топ пост 1 - Ссылка': topPosts[0]?.shortcode ? `https://www.instagram.com/p/${topPosts[0].shortcode}/` : '',
        'Топ пост 1 - Дата': topPosts[0]?.timestamp ? new Date(topPosts[0].timestamp).toLocaleDateString('ru-RU') : '',
        // Топ пост 2
        'Топ пост 2 - Лайки': topPosts[1]?.likes || 0,
        'Топ пост 2 - Комментарии': topPosts[1]?.comments || 0,
        'Топ пост 2 - Описание': topPosts[1]?.caption || '',
        'Топ пост 2 - Ссылка': topPosts[1]?.shortcode ? `https://www.instagram.com/p/${topPosts[1].shortcode}/` : '',
        'Топ пост 2 - Дата': topPosts[1]?.timestamp ? new Date(topPosts[1].timestamp).toLocaleDateString('ru-RU') : '',
        // Топ пост 3
        'Топ пост 3 - Лайки': topPosts[2]?.likes || 0,
        'Топ пост 3 - Комментарии': topPosts[2]?.comments || 0,
        'Топ пост 3 - Описание': topPosts[2]?.caption || '',
        'Топ пост 3 - Ссылка': topPosts[2]?.shortcode ? `https://www.instagram.com/p/${topPosts[2].shortcode}/` : '',
        'Топ пост 3 - Дата': topPosts[2]?.timestamp ? new Date(topPosts[2].timestamp).toLocaleDateString('ru-RU') : ''
      };
    });

    // Создаем новую книгу Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Профили');

    // Сохраняем файл
    XLSX.writeFile(workbook, filePath);
    logger.info(`Данные сохранены в Excel файл: ${filePath}`);
  } catch (error: any) {
    logger.error(`Ошибка при сохранении в Excel: ${error.message}`);
    throw error;
  }
}

export async function saveConnectionsToExcel(profiles: ProfileWithConnections[], filename: string): Promise<void> {
  try {
    const outputDir = ensureOutputDirectory();
    const filePath = path.join(outputDir, filename);

    // Основной лист с профилями и их связями
    const profilesData = profiles.map(profile => {
      const topConnections = profile.connections.slice(0, 5); // Берем топ-5 связей
      return {
        'Имя пользователя': profile.username,
        'Подписчики': profile.followersCount,
        'Количество связей': profile.connections.length,
        'Топ связи': topConnections.map(c => 
          `${c.username} (${c.commonFollowersCount} общих подписчиков)`
        ).join(', '),
      };
    });

    // Детальный лист со всеми связями
    const connectionsData = profiles.flatMap(profile =>
      profile.connections.map(connection => ({
        'Профиль': profile.username,
        'Связан с': connection.username,
        'Общих подписчиков': connection.commonFollowersCount,
        'Список общих подписчиков': connection.commonFollowers.join(', ')
      }))
    );

    // Создаем новую книгу Excel
    const workbook = XLSX.utils.book_new();

    // Добавляем лист с профилями
    const profilesSheet = XLSX.utils.json_to_sheet(profilesData);
    XLSX.utils.book_append_sheet(workbook, profilesSheet, 'Обзор связей');

    // Добавляем лист с детальными связями
    const connectionsSheet = XLSX.utils.json_to_sheet(connectionsData);
    XLSX.utils.book_append_sheet(workbook, connectionsSheet, 'Детальные связи');

    // Сохраняем файл
    XLSX.writeFile(workbook, filePath);
    logger.info(`Данные о взаимосвязях сохранены в Excel файл: ${filePath}`);
  } catch (error: any) {
    logger.error(`Ошибка при сохранении связей в Excel: ${error.message}`);
    throw error;
  }
}

export async function saveAnalysisToExcel(analysisResults: Map<string, ProfileAnalysis>, filename: string): Promise<void> {
  try {
    const outputDir = ensureOutputDirectory();
    const filePath = path.join(outputDir, filename);

    const excelData = Array.from(analysisResults.entries()).map(([username, analysis]) => ({
      'Имя пользователя': username,
      'Категория': analysis.category,
      'Тип бизнеса': analysis.businessType,
      'Качество контента (1-10)': analysis.contentQuality,
      'Коммерческий потенциал (1-10)': analysis.commercialPotential,
      'Основные темы': analysis.mainTopics.join(', '),
      'Рекомендуемые хэштеги': analysis.suggestedTags.join(', '),
      'Рекомендации': analysis.recommendations.join('\n'),
      'Тип аудитории': analysis.audienceType,
      'Ценовой сегмент': analysis.priceSegment,
      'Потенциальные конкуренты': analysis.competitors.join(', ')
    }));

    // Создаем новую книгу Excel
    const workbook = XLSX.utils.book_new();

    // Добавляем лист с анализом
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Настраиваем ширину колонок
    const columnWidths = [
      { wch: 20 }, // Имя пользователя
      { wch: 15 }, // Категория
      { wch: 15 }, // Тип бизнеса
      { wch: 10 }, // Качество контента
      { wch: 10 }, // Коммерческий потенциал
      { wch: 30 }, // Основные темы
      { wch: 30 }, // Рекомендуемые хэштеги
      { wch: 50 }, // Рекомендации
      { wch: 20 }, // Тип аудитории
      { wch: 15 }, // Ценовой сегмент
      { wch: 30 }  // Потенциальные конкуренты
    ];
    worksheet['!cols'] = columnWidths;

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AI Анализ');

    // Сохраняем файл
    XLSX.writeFile(workbook, filePath);
    logger.info(`Результаты AI-анализа сохранены в Excel файл: ${filePath}`);
  } catch (error: any) {
    logger.error(`Ошибка при сохранении результатов анализа в Excel: ${error.message}`);
    throw error;
  }
} 