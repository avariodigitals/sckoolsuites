import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

interface UploadOptions {
  schoolId: string;
  folder: string; // e.g. "passports", "logos", "avatars", "payment-proofs"
  publicId?: string; // optional custom public id
  overwrite?: boolean;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string,
  options: UploadOptions
) {
  const folderPath = `school_${options.schoolId}/${options.folder}`;

  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        public_id: options.publicId,
        overwrite: options.overwrite ?? true,
        resource_type: mimeType.startsWith("image/") ? "image" : "auto",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}
