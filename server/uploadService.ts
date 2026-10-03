import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if credentials exist
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL
);

if (hasCloudinary) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
      api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
      api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim()
    });
  }
  console.log('[Media Storage] Cloudinary persistent object storage configured.');
} else {
  console.log('[Media Storage] Local persistent disk storage configured at /uploads.');
}

// Local storage fallback directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'properties');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `spp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter validation
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file format (${file.mimetype}). Only JPG, PNG, WEBP images and MP4/WEBM videos are allowed.`));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB maximum for video; images handled separately
  },
  fileFilter
});

/**
 * Upload single or multiple files to Cloudinary or Persistent Disk
 */
export async function processUploadedFile(file: Express.Multer.File): Promise<{ url: string; format: string; size: number; isVideo: boolean }> {
  const isVideo = file.mimetype.startsWith('video/');

  if (hasCloudinary) {
    try {
      const resourceType = isVideo ? 'video' : 'image';
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'spp_nestora/properties',
        resource_type: resourceType,
        transformation: isVideo ? undefined : [{ quality: 'auto', fetch_format: 'auto' }]
      });

      // Cleanup local temp file
      try {
        fs.unlinkSync(file.path);
      } catch {}

      return {
        url: result.secure_url,
        format: result.format || (isVideo ? 'mp4' : 'jpg'),
        size: result.bytes,
        isVideo
      };
    } catch (cloudErr) {
      console.error('[Cloudinary Upload Error] Falling back to local disk:', cloudErr);
    }
  }

  // Fallback to locally served persistent URL
  const relativeUrl = `/uploads/properties/${file.filename}`;
  return {
    url: relativeUrl,
    format: path.extname(file.filename).replace('.', ''),
    size: file.size,
    isVideo
  };
}
