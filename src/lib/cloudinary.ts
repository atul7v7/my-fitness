import { v2 as cloudinary } from "cloudinary";

function configured() {
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET
  );
}

function client() {
  if (!configured()) {
    throw new Error("Cloudinary env vars (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) are not set");
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

/**
 * Generate a signed upload payload for client-side direct upload to Cloudinary,
 * so the API secret never reaches the browser.
 */
export function generateUploadSignature(folder: string) {
  const c = client();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = c.utils.api_sign_request(
    { timestamp, folder, resource_type: "video" },
    process.env.CLOUDINARY_API_SECRET!
  );
  return {
    timestamp,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY!,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    resource_type: "video" as const,
  };
}

/** Delete an asset by public_id (used when removing/replacing a video). */
export async function deleteAsset(publicId: string) {
  const c = client();
  try {
    await c.uploader.destroy(publicId, { resource_type: "video" });
  } catch (err) {
    // Log but don't fail the request — the DB record is the source of truth.
    console.error("Cloudinary delete failed for", publicId, err);
  }
}

export function isConfigured() {
  return configured();
}
