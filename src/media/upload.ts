// Match the product-images bucket restrictions. These checks improve feedback;
// Storage's MIME/size limits and admin RLS remain the authorization boundary.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_UPLOAD_HELP = "JPEG, PNG, WebP · 10 МБ хүртэл";
const formats: Record<
  string,
  { extensions: string[]; signature: (b: Uint8Array) => boolean }
> = {
  "image/jpeg": {
    extensions: ["jpg", "jpeg"],
    signature: (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  },
  "image/png": {
    extensions: ["png"],
    signature: (b) =>
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v),
  },
  "image/webp": {
    extensions: ["webp"],
    signature: (b) =>
      b.length >= 12 &&
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
};

export async function validateImageUpload(file: File): Promise<string> {
  const format = formats[file.type];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!format || !format.extensions.includes(extension)) {
    throw new Error("Зөвхөн JPEG, PNG, WebP зураг оруулна уу.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      "Зураг хоосон байж болохгүй, хэмжээ нь 10 МБ-аас хэтрэхгүй байна.",
    );
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!format.signature(bytes)) {
    throw new Error("Файлын агуулга зургийн форматтай тохирохгүй байна.");
  }
  // Never build a Storage path from user-controlled names, slugs or extensions.
  return `media/${crypto.randomUUID()}.${format.extensions[0]}`;
}

export function imageUploadError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Зураг оруулж чадсангүй. Дахин оролдоно уу.";
}
