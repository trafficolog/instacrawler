import { config } from './config';
import { InstagramService } from './services/instagram.service';
import { Profile } from './types/profile';
import { logger } from './utils/logger';
import { saveToFile } from './utils/file';

function generateRandomDelay(baseDelay: number): number {
  const variation = 0.2; // 20% variation
  const minDelay = baseDelay * (1 - variation);
  const maxDelay = baseDelay * (1 + variation);
  return Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isProfileValid(profile: Profile): boolean {
  if (!profile.followersCount) return false;
  
  return (
    profile.followersCount >= config.minFollowers &&
    profile.followersCount <= config.maxFollowers &&
    !profile.isPrivate
  );
}

function generateFilename(): string {
  const date = new Date();
  return `profiles_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}.json`;
}

async function main() {
  const instagram = new InstagramService(config.instagramSessionId);
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
    const filename = generateFilename();
    await saveToFile(profiles, filename);
  }
}

main().catch(error => {
  logger.error(`Критическая ошибка: ${error.message}`);
  process.exit(1);
}); 