import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Загружаем .env файл
dotenv.config();

interface Config {
  instagramSessionId: string;
  instagramHashtags: string[];
  delayBetweenRequests: number;
  maxPostsPerHashtag: number;
  minFollowers: number;
  maxFollowers: number;
  maxFollowersToAnalyze: number;
}

// Функция для логирования текущих настроек
function logConfig(config: Config) {
  logger.info('Текущие настройки:');
  logger.info(`- Хэштеги: ${config.instagramHashtags.join(', ')}`);
  logger.info(`- Макс. профилей на хэштег: ${config.maxPostsPerHashtag}`);
  logger.info(`- Мин. подписчиков: ${config.minFollowers}`);
  logger.info(`- Макс. подписчиков: ${config.maxFollowers}`);
  logger.info(`- Задержка между запросами: ${config.delayBetweenRequests}ms`);
  logger.info(`- Анализируемых подписчиков: ${config.maxFollowersToAnalyze}`);
}

export const config: Config = {
  instagramSessionId: process.env.INSTAGRAM_SESSION_ID || '',
  instagramHashtags: (process.env.INSTAGRAM_HASHTAGS || '').split(',').map(tag => tag.trim()),
  delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS || '3000', 10),
  maxPostsPerHashtag: parseInt(process.env.MAX_POSTS_PER_HASHTAG || '20', 10),
  minFollowers: parseInt(process.env.MIN_FOLLOWERS || '1000', 10),
  maxFollowers: parseInt(process.env.MAX_FOLLOWERS || '1000000', 10),
  maxFollowersToAnalyze: parseInt(process.env.MAX_FOLLOWERS_TO_ANALYZE || '50', 10)
};

// Логируем настройки при запуске
logConfig(config); 