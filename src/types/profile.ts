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
} 