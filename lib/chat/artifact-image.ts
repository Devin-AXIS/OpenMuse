const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1280;
const MAX_OUTPUT_BYTES = 640 * 1024;

function blobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("ARTIFACT_IMAGE_INVALID"));
    reader.onerror = () => reject(reader.error ?? new Error("ARTIFACT_IMAGE_INVALID"));
    reader.readAsDataURL(blob);
  });
}

export async function prepareArtifactImage(file: File) {
  if (!file.type.startsWith("image/") || file.size > MAX_SOURCE_BYTES) throw new Error("ARTIFACT_IMAGE_INVALID");
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("ARTIFACT_IMAGE_INVALID"));
      element.src = source;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("ARTIFACT_IMAGE_INVALID");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
    if (!blob || blob.size > MAX_OUTPUT_BYTES) throw new Error("ARTIFACT_IMAGE_TOO_LARGE");
    return blobAsDataUrl(blob);
  } finally {
    URL.revokeObjectURL(source);
  }
}
