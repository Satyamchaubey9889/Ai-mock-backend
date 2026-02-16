import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

// ✅ Backblaze B2 S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // us-east-005
  endpoint: process.env.AWS_ENDPOINT, // https://s3.us-east-005.backblazeb2.com
  forcePathStyle: true, // REQUIRED for Backblaze
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export const upload = multer({ storage: multer.memoryStorage() });


// ✅ Upload to Backblaze B2
export async function uploadToB2(fileBuffer, originalFilename, contentType) {
  if (!isValidImageType(contentType)) {
    throw new Error("Invalid image type");
  }

  const ext = originalFilename.split(".").pop();
  const key = `projects/${uuidv4()}.${ext}`;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );

    // Generate signed URL
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return signedUrl;
  } catch (error) {
    console.error("B2 upload error:", error);
    throw new Error("Failed to upload image");
  }
}


// ✅ Delete from Backblaze B2
export async function deleteFromB2(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const key = url.pathname.slice(1);

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error("B2 delete error:", error);
    throw new Error("Failed to delete image");
  }
}


// ✅ Generate signed URL from Backblaze B2
export async function getSignedUrlFromB2(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}


// ✅ Validate image types
export function isValidImageType(contentType) {
  return ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    .includes(contentType.toLowerCase());
}
