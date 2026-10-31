import { supabase, unwrap } from "../lib/supabase";

const AVATAR_SIZE = 256;

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user.id;
}

// Center-crops and shrinks any image to a 256×256 WebP (~15–30 KB) before upload.
async function toAvatarBlob(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (JPG, PNG or WebP).");
  if (file.size > 10 * 1024 * 1024) throw new Error("That image is over 10 MB. Choose a smaller one.");
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = Object.assign(document.createElement("canvas"), { width: AVATAR_SIZE, height: AVATAR_SIZE });
  canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that image."))), "image/webp", 0.85));
}

export async function uploadAvatar(file) {
  const [uid, blob] = await Promise.all([currentUserId(), toAvatarBlob(file)]);
  const path = `${uid}/avatar.webp`;
  await unwrap(supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/webp" }));
  const { error } = await supabase.auth.updateUser({ data: { avatar_path: path } });
  if (error) throw error;
}

export async function removeAvatar() {
  const uid = await currentUserId();
  await unwrap(supabase.storage.from("avatars").remove([`${uid}/avatar.webp`]));
  const { error } = await supabase.auth.updateUser({ data: { avatar_path: null } });
  if (error) throw error;
}

// Private bucket → short-lived signed URL. Returns null if there's no photo or it can't be read.
export async function getAvatarUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return error ? null : `${data.signedUrl}&v=${Date.now()}`;
}

export async function updateSecretaryName(fullName) {
  const uid = await currentUserId();
  return unwrap(supabase.from("secretaries").update({ full_name: fullName.trim() }).eq("auth_user_id", uid));
}
