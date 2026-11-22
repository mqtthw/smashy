// Where profile pictures live (public "avatars" bucket, random file names). Safe anywhere.
export const AVATARS_BUCKET = "avatars";

export const avatarUrl = (path: string | null | undefined) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/${path}` : null;
