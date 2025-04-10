import axios from 'axios';
import { Profile } from '../types/profile';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface ProfileAnalysis {
  category: string;
  businessType: string;
  contentQuality: number;
  commercialPotential: number;
  mainTopics: string[];
  suggestedTags: string[];
  recommendations: string[];
  audienceType: string;
  priceSegment: string;
  competitors: string[];
}

export class AIService {
  private readonly apiKey: string;
  private readonly apiEndpoint = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async analyzeWithGPT(prompt: string): Promise<any> {
    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "Ты эксперт по анализу Instagram профилей и маркетингу. Твоя задача - анализировать профили и давать детальную оценку их коммерческого потенциала, категории бизнеса и рекомендации по развитию."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error: any) {
      logger.error(`Ошибка при запросе к GPT API: ${error.message}`);
      throw error;
    }
  }

  async analyzeProfile(profile: Profile): Promise<ProfileAnalysis> {
    const prompt = `
    Проанализируй Instagram профиль и предоставь структурированный анализ в формате JSON со следующими полями:
    - category: основная категория профиля
    - businessType: тип бизнеса
    - contentQuality: оценка качества контента (1-10)
    - commercialPotential: оценка коммерческого потенциала (1-10)
    - mainTopics: массив основных тем контента
    - suggestedTags: рекомендуемые хэштеги
    - recommendations: рекомендации по улучшению
    - audienceType: тип целевой аудитории
    - priceSegment: ценовой сегмент (economy/middle/premium)
    - competitors: потенциальные конкуренты или похожие профили

    Данные профиля:
    Имя: ${profile.fullName}
    Описание: ${profile.biography}
    Подписчики: ${profile.followersCount}
    Посты: ${profile.postsCount}
    Бизнес-категория: ${profile.businessCategory}
    Топ посты: ${profile.topPosts.map(post => post.caption).join('\n')}
    `;

    try {
      const analysis = await this.analyzeWithGPT(prompt);
      
      // Преобразуем строковые поля в массивы, если они пришли как строки
      const ensureArray = (field: any) => {
        if (typeof field === 'string') {
          return field.split(',').map(item => item.trim());
        }
        return Array.isArray(field) ? field : [];
      };

      return {
        ...analysis,
        mainTopics: ensureArray(analysis.mainTopics),
        suggestedTags: ensureArray(analysis.suggestedTags),
        recommendations: ensureArray(analysis.recommendations),
        competitors: ensureArray(analysis.competitors)
      };
    } catch (error) {
      logger.error(`Ошибка при анализе профиля ${profile.username}: ${error}`);
      return {
        category: 'Unknown',
        businessType: 'Unknown',
        contentQuality: 0,
        commercialPotential: 0,
        mainTopics: [],
        suggestedTags: [],
        recommendations: [],
        audienceType: 'Unknown',
        priceSegment: 'Unknown',
        competitors: []
      };
    }
  }

  async analyzeBatch(profiles: Profile[]): Promise<Map<string, ProfileAnalysis>> {
    const results = new Map<string, ProfileAnalysis>();
    
    for (const profile of profiles) {
      try {
        logger.info(`Анализируем профиль: ${profile.username}`);
        const analysis = await this.analyzeProfile(profile);
        results.set(profile.username, analysis);
        
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Ошибка при анализе профиля ${profile.username}: ${error}`);
      }
    }

    return results;
  }
} 