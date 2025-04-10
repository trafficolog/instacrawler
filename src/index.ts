import { config } from './config';
import { InstagramService } from './services/instagram.service';
import { AIService } from './services/ai.service';
import { Profile } from './types/profile';
import { logger } from './utils/logger';
import { saveToFile, saveToExcel, saveConnectionsToExcel, saveAnalysisToExcel } from './utils/file';
import { delay } from './utils/helpers';

function generateRandomDelay(baseDelay: number): number {
  const variation = 0.2; // 20% variation
  const minDelay = baseDelay * (1 - variation);
  const maxDelay = baseDelay * (1 + variation);
  return Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
}

function isProfileValid(profile: Profile): boolean {
  if (!profile.followersCount) return false;
  
  return (
    profile.followersCount >= config.minFollowers &&
    profile.followersCount <= config.maxFollowers &&
    !profile.isPrivate
  );
}

function generateFilename(extension: string): string {
  const date = new Date();
  return `profiles_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}.${extension}`;
}

async function main() {
  const instagram = new InstagramService(config.instagramSessionId);
  const ai = new AIService(process.env.OPENAI_API_KEY || '');
  const profiles: Profile[] = [];

  for (const hashtag of config.instagramHashtags) {
    try {
      logger.info(`Поиск по хэштегу #${hashtag}...`);
      const usernames = await instagram.searchHashtag(hashtag);

      for (const username of usernames) {
        try {
          await delay(generateRandomDelay(config.delayBetweenRequests));
          
          const profile = await instagram.getProfile(username);
          if (profile && isProfileValid(profile)) {
            profiles.push(profile);
            logger.info(`Найден профиль: @${profile.username} (${profile.followersCount} подписчиков)`);
          }

          if (profiles.length >= config.maxPostsPerHashtag) {
            break;
          }
        } catch (error: any) {
          logger.error(`Ошибка при обработке профиля ${username}: ${error.message}`);
        }
      }
    } catch (error: any) {
      logger.error(`Ошибка при обработке хэштега #${hashtag}: ${error.message}`);
    }
  }

  logger.info('\nКраулинг завершен!');
  logger.info(`Всего найдено профилей: ${profiles.length}`);

  if (profiles.length > 0) {
    // Сохраняем базовую информацию
    const jsonFilename = generateFilename('json');
    await saveToFile(profiles, jsonFilename);

    const excelFilename = generateFilename('xlsx');
    await saveToExcel(profiles, excelFilename);

    // Анализируем взаимосвязи
    logger.info('\nНачинаем анализ взаимосвязей между профилями...');
    const profilesWithConnections = await instagram.analyzeConnections(profiles);
    
    // Сохраняем результаты анализа
    const connectionsFilename = `connections_${generateFilename('xlsx')}`;
    await saveConnectionsToExcel(profilesWithConnections, connectionsFilename);
    
    logger.info('Анализ взаимосвязей завершен!');

    // Запускаем AI-анализ
    if (process.env.OPENAI_API_KEY) {
      logger.info('\nНачинаем AI-анализ профилей...');
      const analysisResults = await ai.analyzeBatch(profiles);
      
      // Сохраняем результаты AI-анализа
      const aiAnalysisFilename = `ai_analysis_${generateFilename('xlsx')}`;
      await saveAnalysisToExcel(analysisResults, aiAnalysisFilename);
      
      logger.info('AI-анализ завершен!');
    } else {
      logger.warn('AI-анализ пропущен: не указан OPENAI_API_KEY в .env файле');
    }
  }
}

main().catch(error => {
  logger.error(`Критическая ошибка: ${error.message}`);
  process.exit(1);
}); 