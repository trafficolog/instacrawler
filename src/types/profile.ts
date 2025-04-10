export interface Post {
  id: string;
  shortcode: string;
  likes: number;
  comments: number;
  caption: string;
  imageUrl: string;
  timestamp: string;
}

export interface ContactInfo {
  whatsappNumbers: string[];
  telegramLinks: string[];
  phoneNumbers: string[];
}

export interface Connection {
  username: string;
  commonFollowers: string[];
  commonFollowersCount: number;
}

export interface ProfileWithConnections extends Profile {
  connections: Connection[];
  followers: string[];
}

export interface Profile {
  username: string;
  userId: string;
  fullName: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  biography: string;
  externalUrl: string | null;
  profilePicUrl: string | null;
  businessEmail: string | null;
  businessPhoneNumber: string | null;
  isBusinessAccount: boolean;
  businessCategory: string | null;
  topPosts: Post[];
  contactInfo: ContactInfo;
} 