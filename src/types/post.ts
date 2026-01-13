export type PostType = {
  id: number;
  type: string;
  title: string;
  userId: number;
  userAlias: string;
  date: string;
  status: 'processing' | 'published' | 'failed';
  content_id: number;
  image_url: string;
};