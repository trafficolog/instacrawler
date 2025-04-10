import dotenv from 'dotenv';

dotenv.config();

interface Config {
  instagramSessionId: string;
  instagramHashtags: string[];
  delayBetweenRequests: number;
  maxPostsPerHashtag: number;
  minFollowers: number;
  maxFollowers: number;
}

export const config: Config = {
  instagramSessionId: process.env.INSTAGRAM_SESSION_ID || '',
  instagramHashtags: (process.env.INSTAGRAM_HASHTAGS || '').split(',').map(tag => tag.trim()),
  delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS || '3000', 10),
  maxPostsPerHashtag: parseInt(process.env.MAX_POSTS_PER_HASHTAG || '20', 10),
  minFollowers: parseInt(process.env.MIN_FOLLOWERS || '1000', 10),
  maxFollowers: parseInt(process.env.MAX_FOLLOWERS || '1000000', 10)
}; 