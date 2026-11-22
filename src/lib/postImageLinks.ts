// Where post photos live (Supabase Storage, "post-images" bucket). Kept apart from postImages.ts so
// pages that only show photos don't load the image-processing library.

export type PostImage = { url: string; width: number; height: number; alt: string };

export const POST_IMAGES_BUCKET = "post-images";

export const postImageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_IMAGES_BUCKET}/${path}`;
