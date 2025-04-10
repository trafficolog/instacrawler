export interface InstagramProfile {
  username: string;
  userId: string;
  fullName?: string;
  biography?: string;
  followerCount?: number;
  mediaCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  profilePicUrl?: string;
  businessEmail?: string;
  businessPhoneNumber?: string;
}

export interface HashtagSearchResult {
  posts: Array<{
    id: string;
    shortcode: string;
    owner: {
      username: string;
      id: string;
    };
  }>;
  hasNextPage: boolean;
  endCursor?: string;
}

export interface CrawlerConfig {
  hashtags: string[];
  sessionId: string;
  minFollowers?: number;
  maxFollowers?: number;
  delayBetweenRequests: number;
  maxPostsPerHashtag: number;
} 