import axios from 'axios';
import { Profile } from '../types/profile';
import { logger } from '../utils/logger';

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
      edge_owner_to_timeline_media: { count: number };
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
      const response = await axios.get<InstagramTagResponse>(
        `${this.baseURL}/api/v1/tags/web_info/?tag_name=${hashtag}`,
        {
          headers: {
            ...this.defaultHeaders,
            'Referer': `https://www.instagram.com/explore/tags/${hashtag}/`
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

  async getProfile(username: string): Promise<Profile | null> {
    try {
      const response = await axios.get<InstagramUserResponse>(
        `${this.baseURL}/api/v1/users/web_profile_info/?username=${username}`,
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
      return {
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
        businessCategory: user.business_category_name || null
      };
    } catch (error: any) {
      logger.error(`Ошибка при получении профиля ${username}: ${error.message}`);
      return null;
    }
  }
} 