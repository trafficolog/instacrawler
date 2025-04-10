import axios from 'axios';
import { Profile, Post, ProfileWithConnections, Connection, ContactInfo } from '../types/profile';
import { logger } from '../utils/logger';
import { delay } from '../utils/helpers';
import { config } from '../config';

interface InstagramMediaUser {
  media: {
    user: {
      username: string;
    };
  };
}

interface InstagramSection {
  layout_content: {
    medias: InstagramMediaUser[];
  };
}

interface InstagramTagResponse {
  data: {
    top: {
      sections: InstagramSection[];
    };
  };
}

interface InstagramUserResponse {
  data: {
    user: {
      username: string;
      id: string;
      full_name: string;
      edge_followed_by: { count: number };
      edge_follow: { count: number };
      edge_owner_to_timeline_media: { 
        count: number;
        edges: Array<{
          node: {
            id: string;
            shortcode: string;
            edge_media_preview_like: { count: number };
            edge_media_to_comment: { count: number };
            edge_media_to_caption: { edges: Array<{ node: { text: string } }> };
            display_url: string;
            taken_at_timestamp: number;
          }
        }>;
      };
      is_private: boolean;
      is_verified: boolean;
      biography: string;
      external_url: string | null;
      profile_pic_url: string;
      business_email: string | null;
      business_phone_number: string | null;
      is_business_account: boolean;
      business_category_name: string | null;
    };
  };
}

export class InstagramService {
  private readonly sessionId: string;
  private readonly baseURL = 'https://www.instagram.com';
  private readonly defaultHeaders: Record<string, string>;
  private readonly appId = '936619743392459';

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'X-IG-App-ID': this.appId,
      'X-ASBD-ID': '129477',
      'X-IG-WWW-Claim': '0',
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Origin': 'https://www.instagram.com',
      'Referer': 'https://www.instagram.com/',
      'Cookie': `sessionid=${this.sessionId}; ig_did=random; ig_nrcb=1; ds_user_id=49499131649;`
    };
  }

  async searchHashtag(hashtag: string): Promise<string[]> {
    try {
      const encodedHashtag = encodeURIComponent(hashtag);
      const response = await axios.get<InstagramTagResponse>(
        `${this.baseURL}/api/v1/tags/web_info/?tag_name=${encodedHashtag}`,
        {
          headers: {
            ...this.defaultHeaders,
            'Referer': `https://www.instagram.com/explore/tags/${encodedHashtag}/`
          },
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );

      if (!response.data?.data?.top?.sections) {
        throw new Error('Неверный формат ответа API');
      }

      const usernames = response.data.data.top.sections
        .flatMap(section => section.layout_content?.medias || [])
        .map(media => media.media?.user?.username)
        .filter((username): username is string => username !== undefined && username !== null);

      return [...new Set(usernames)];
    } catch (error: any) {
      logger.error(`Ошибка при поиске хэштега ${hashtag}: ${error.message}`);
      throw error;
    }
  }

  private extractTopPosts(mediaEdges: InstagramUserResponse['data']['user']['edge_owner_to_timeline_media']['edges']): Post[] {
    return mediaEdges
      .sort((a, b) => b.node.edge_media_preview_like.count - a.node.edge_media_preview_like.count)
      .slice(0, 3)
      .map(edge => ({
        id: edge.node.id,
        shortcode: edge.node.shortcode,
        likes: edge.node.edge_media_preview_like.count,
        comments: edge.node.edge_media_to_comment.count,
        caption: edge.node.edge_media_to_caption.edges[0]?.node.text || '',
        imageUrl: edge.node.display_url,
        timestamp: new Date(edge.node.taken_at_timestamp * 1000).toISOString()
      }));
  }

  private async getUserPosts(userId: string): Promise<Post[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/feed/user/${userId}/?count=12`,
        {
          headers: {
            ...this.defaultHeaders,
            'Referer': `https://www.instagram.com/`
          },
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );

      if (!response.data?.items?.length) {
        return [];
      }

      return response.data.items
        .sort((a: any, b: any) => b.like_count - a.like_count)
        .slice(0, 3)
        .map((post: any) => ({
          id: post.id,
          shortcode: post.code,
          likes: post.like_count,
          comments: post.comment_count,
          caption: post.caption?.text || '',
          imageUrl: post.image_versions2?.candidates[0]?.url || '',
          timestamp: new Date(post.taken_at * 1000).toISOString()
        }));
    } catch (error: any) {
      logger.error(`Ошибка при получении постов пользователя ${userId}: ${error.message}`);
      return [];
    }
  }

  private extractPhoneNumber(text: string): string[] {
    const phones: string[] = [];
    
    // Ищем номера в WhatsApp ссылках
    const whatsappUrls = text.match(/(?:https?:\/\/)?(?:api\.)?(?:wa\.me|whatsapp\.com)\/(?:send\/?)?(?:\?phone=)?([0-9]+)/g);
    if (whatsappUrls) {
      whatsappUrls.forEach(url => {
        const number = url.match(/[0-9]+/)?.[0];
        if (number) phones.push(number);
      });
    }

    // Ищем обычные номера телефонов
    const phoneMatches = text.match(/(?:\+)?(?:[0-9][\s-]?){10,}/g);
    if (phoneMatches) {
      phoneMatches.forEach(phone => {
        // Очищаем номер от всего кроме цифр
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 10) phones.push(cleanPhone);
      });
    }

    return [...new Set(phones)]; // Удаляем дубликаты
  }

  private extractTelegramLinks(text: string): string[] {
    const links: string[] = [];
    
    // Ищем ссылки вида t.me/username или telegram.me/username
    const telegramUrls = text.match(/(?:https?:\/\/)?(?:t(?:elegram)?\.me)\/([a-zA-Z0-9_]+)/g);
    if (telegramUrls) {
      links.push(...telegramUrls);
    }

    // Ищем упоминания телеграм аккаунтов
    const telegramMentions = text.match(/(?:@)?(?:telegram|tg):?\s*@?([a-zA-Z0-9_]+)/gi);
    if (telegramMentions) {
      links.push(...telegramMentions);
    }

    return [...new Set(links)]; // Удаляем дубликаты
  }

  private extractContactInfo(profile: Profile): ContactInfo {
    const textToAnalyze = [
      profile.biography || '',
      profile.externalUrl || '',
      profile.businessPhoneNumber || '',
      ...profile.topPosts.map(post => post.caption)
    ].join(' ');

    const whatsappNumbers = this.extractPhoneNumber(textToAnalyze);
    const telegramLinks = this.extractTelegramLinks(textToAnalyze);
    const phoneNumbers = this.extractPhoneNumber(textToAnalyze);

    return {
      whatsappNumbers,
      telegramLinks,
      phoneNumbers: phoneNumbers.filter(phone => !whatsappNumbers.includes(phone)) // Исключаем WhatsApp номера из обычных
    };
  }

  async getProfile(username: string): Promise<Profile | null> {
    try {
      const response = await axios.get<InstagramUserResponse>(
        `${this.baseURL}/api/v1/users/web_profile_info/?username=${username}&include_feed_comments=true&fetch_mutual=true&include_reel=true`,
        {
          headers: {
            ...this.defaultHeaders,
            'Referer': `https://www.instagram.com/${username}/`
          },
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );

      if (!response.data?.data?.user) {
        return null;
      }

      const user = response.data.data.user;
      let topPosts = user.edge_owner_to_timeline_media?.edges?.length 
        ? this.extractTopPosts(user.edge_owner_to_timeline_media.edges)
        : [];

      // Если посты не получены через первый метод, пробуем второй
      if (topPosts.length === 0 && user.id) {
        logger.info(`Пробуем получить посты через дополнительный метод для ${username}`);
        topPosts = await this.getUserPosts(user.id);
      }

      logger.info(`Получено ${topPosts.length} постов для профиля ${username}`);

      const profile: Profile = {
        username: user.username,
        userId: user.id,
        fullName: user.full_name,
        followersCount: user.edge_followed_by?.count || 0,
        followingCount: user.edge_follow?.count || 0,
        postsCount: user.edge_owner_to_timeline_media?.count || 0,
        isPrivate: user.is_private,
        isVerified: user.is_verified,
        biography: user.biography || '',
        externalUrl: user.external_url || null,
        profilePicUrl: user.profile_pic_url || null,
        businessEmail: user.business_email || null,
        businessPhoneNumber: user.business_phone_number || null,
        isBusinessAccount: user.is_business_account || false,
        businessCategory: user.business_category_name || null,
        topPosts,
        contactInfo: {
          whatsappNumbers: [],
          telegramLinks: [],
          phoneNumbers: []
        }
      };

      // Извлекаем контактную информацию
      profile.contactInfo = this.extractContactInfo(profile);

      // Логируем найденные контакты
      if (profile.contactInfo.whatsappNumbers.length > 0) {
        logger.info(`Найдены WhatsApp номера для ${username}: ${profile.contactInfo.whatsappNumbers.join(', ')}`);
      }
      if (profile.contactInfo.telegramLinks.length > 0) {
        logger.info(`Найдены Telegram ссылки для ${username}: ${profile.contactInfo.telegramLinks.join(', ')}`);
      }
      if (profile.contactInfo.phoneNumbers.length > 0) {
        logger.info(`Найдены номера телефонов для ${username}: ${profile.contactInfo.phoneNumbers.join(', ')}`);
      }

      return profile;
    } catch (error: any) {
      logger.error(`Ошибка при получении профиля ${username}: ${error.message}`);
      return null;
    }
  }

  async getFollowers(userId: string): Promise<string[]> {
    try {
      const followers: string[] = [];
      let hasNextPage = true;
      let endCursor = '';
      let attempts = 0;
      const maxAttempts = 20; // Увеличиваем количество попыток, так как получаем меньше подписчиков за раз

      while (hasNextPage && followers.length < config.maxFollowersToAnalyze && attempts < maxAttempts) {
        attempts++;
        logger.info(`Получение подписчиков для ${userId} (попытка ${attempts}, текущее количество: ${followers.length})`);

        const response = await axios.get(
          `${this.baseURL}/api/v1/friendships/${userId}/followers/?count=12&max_id=${endCursor}`,
          {
            headers: {
              ...this.defaultHeaders,
              'Referer': `https://www.instagram.com/`,
              'X-CSRFToken': this.sessionId.split('%3A')[0], // Добавляем CSRF токен
            }
          }
        );

        if (!response.data?.users) {
          logger.warn(`Нет данных о подписчиках в ответе API (попытка ${attempts})`);
          break;
        }

        const users = response.data.users;
        const newFollowers = users.map((user: any) => user.username);
        
        // Проверяем на дубликаты перед добавлением
        const uniqueNewFollowers = newFollowers.filter((follower: string) => !followers.includes(follower));
        followers.push(...uniqueNewFollowers);

        logger.info(`Получено ${uniqueNewFollowers.length} новых уникальных подписчиков в текущем запросе`);

        hasNextPage = response.data.has_more && response.data.next_max_id;
        endCursor = response.data.next_max_id || '';

        if (hasNextPage) {
          const delayTime = 2000 + Math.random() * 1000; // Случайная задержка от 2 до 3 секунд
          await delay(delayTime);
        }
      }

      const finalFollowers = followers.slice(0, config.maxFollowersToAnalyze);
      logger.info(`Итого получено ${finalFollowers.length} подписчиков для пользователя ${userId} (запрошено: ${config.maxFollowersToAnalyze})`);
      
      if (finalFollowers.length < config.maxFollowersToAnalyze) {
        logger.warn(`Не удалось получить запрошенное количество подписчиков (получено ${finalFollowers.length} из ${config.maxFollowersToAnalyze})`);
      }

      return finalFollowers;
    } catch (error: any) {
      logger.error(`Ошибка при получении подписчиков ${userId}: ${error.message}`);
      return [];
    }
  }

  async analyzeConnections(profiles: Profile[]): Promise<ProfileWithConnections[]> {
    const profilesWithFollowers: ProfileWithConnections[] = [];

    // Получаем подписчиков для каждого профиля
    for (const profile of profiles) {
      logger.info(`Анализ подписчиков для ${profile.username}...`);
      const followers = await this.getFollowers(profile.userId);
      
      profilesWithFollowers.push({
        ...profile,
        followers,
        connections: []
      });

      await delay(3000); // Задержка между профилями
    }

    // Анализируем взаимосвязи
    for (const profile of profilesWithFollowers) {
      const connections: Connection[] = [];

      for (const otherProfile of profilesWithFollowers) {
        if (profile.username === otherProfile.username) continue;

        const commonFollowers = profile.followers.filter(follower => 
          otherProfile.followers.includes(follower)
        );

        if (commonFollowers.length > 0) {
          connections.push({
            username: otherProfile.username,
            commonFollowers,
            commonFollowersCount: commonFollowers.length
          });
        }
      }

      profile.connections = connections.sort((a, b) => b.commonFollowersCount - a.commonFollowersCount);
    }

    return profilesWithFollowers;
  }
} 