import { CrawlerConfig } from '../types/instagram';
import dotenv from 'dotenv';

dotenv.config();

export const defaultConfig: CrawlerConfig = {
  hashtags: process.env.INSTAGRAM_HASHTAGS?.split(',') || [],
  sessionId: process.env.INSTAGRAM_SESSION_ID || '',
  delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS || '2000', 10),
  maxPostsPerHashtag: parseInt(process.env.MAX_POSTS_PER_HASHTAG || '50', 10),
  minFollowers: parseInt(process.env.MIN_FOLLOWERS || '0', 10),
  maxFollowers: parseInt(process.env.MAX_FOLLOWERS || '999999999', 10),
}; 