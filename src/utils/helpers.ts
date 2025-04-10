import { InstagramProfile } from '../types/instagram';

export function filterProfilesByFollowers(
  profiles: InstagramProfile[],
  minFollowers?: number,
  maxFollowers?: number
): InstagramProfile[] {
  return profiles.filter(profile => {
    if (!profile.followerCount) return false;
    if (minFollowers && profile.followerCount < minFollowers) return false;
    if (maxFollowers && profile.followerCount > maxFollowers) return false;
    return true;
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateRandomDelay(baseDelay: number): number {
  // Добавляем случайность к базовой задержке ±30%
  const variation = baseDelay * 0.3;
  return baseDelay + Math.floor(Math.random() * variation * 2 - variation);
}

export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Для ошибок 429 (Too Many Requests) увеличиваем задержку
      const waitTime = error?.response?.status === 429 
        ? delayMs * Math.pow(2, attempt) 
        : delayMs;
      
      console.warn(
        `Attempt ${attempt}/${maxAttempts} failed. Retrying in ${waitTime}ms...`,
        error.message
      );
      
      await sleep(waitTime);
    }
  }
  
  throw lastError || new Error('Все попытки выполнения операции завершились неудачно');
} 