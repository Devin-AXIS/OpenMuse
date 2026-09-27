import { cloudBaseUrl } from "./config";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 320;

export function resolveAvatarUrl(value: string | null | undefined) {
  if (!value) return "";
  return value.startsWith("/") ? `${cloudBaseUrl}${value}` : value;
}

export async function prepareAvatar(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("AVATAR_TYPE_INVALID");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("AVATAR_TOO_LARGE");
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("AVATAR_TYPE_INVALID"));
      element.src = sourceUrl;
    });
    const scale = Math.min(1, AVATAR_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("AVATAR_PROCESS_FAILED");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob) throw new Error("AVATAR_PROCESS_FAILED");
    return blob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
