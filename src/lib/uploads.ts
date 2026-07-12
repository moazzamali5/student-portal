import { randomUUID } from "crypto";
import { adminStorageBucket } from "@/lib/firebase-admin";
import { STORAGE_PREFIX } from "@/lib/collections";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function saveUploadedFile(file: File, subdir: string) {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Only PDF or PNG files are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File is too large (max 10MB).");
  }

  const storagePath = `${STORAGE_PREFIX}/${subdir}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await adminStorageBucket().file(storagePath).save(buffer, { contentType: file.type });

  return { relativePath: storagePath, fileType: ext };
}

export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  const [buffer] = await adminStorageBucket().file(storagePath).download();
  return buffer;
}
