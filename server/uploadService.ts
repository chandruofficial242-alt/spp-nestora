import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Clean and normalize environment variables (stripping surrounding quotes and extra whitespace)
function getCleanEnv(val?: string): string {
  if (!val) return '';
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

// Environment Variable Resolution with all common alias support
const rawCloudinaryUrl = getCleanEnv(process.env.CLOUDINARY_URL);
let cloudName = getCleanEnv(process.env.CLOUDINARY_CLOUD_NAME) || getCleanEnv(process.env.CLOUD_NAME) || getCleanEnv(process.env.CLOUDINARY_NAME);
let apiKey = getCleanEnv(process.env.CLOUDINARY_API_KEY) || getCleanEnv(process.env.CLOUDINARY_KEY) || getCleanEnv(process.env.API_KEY) || getCleanEnv(process.env.CLOUDINARY_APIKEY);
let apiSecret = getCleanEnv(process.env.CLOUDINARY_API_SECRET) || getCleanEnv(process.env.CLOUDINARY_SECRET) || getCleanEnv(process.env.API_SECRET) || getCleanEnv(process.env.CLOUDINARY_APISECRET);
const uploadPreset = getCleanEnv(process.env.CLOUDINARY_UPLOAD_PRESET) || getCleanEnv(process.env.UPLOAD_PRESET) || getCleanEnv(process.env.CLOUDINARY_PRESET);
const cloudinaryFolder = getCleanEnv(process.env.CLOUDINARY_FOLDER) || 'spp_nestora/properties';

// Parse CLOUDINARY_URL if provided (Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
if (rawCloudinaryUrl) {
  let cleanUrl = rawCloudinaryUrl;
  if (!cleanUrl.startsWith('cloudinary://') && cleanUrl.includes('@')) {
    cleanUrl = `cloudinary://${cleanUrl}`;
  }
  try {
    const parsed = new URL(cleanUrl);
    if (parsed.hostname) cloudName = parsed.hostname;
    if (parsed.username) apiKey = decodeURIComponent(parsed.username);
    if (parsed.password) apiSecret = decodeURIComponent(parsed.password);
  } catch {
    const match = cleanUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    if (match) {
      apiKey = match[1];
      apiSecret = match[2];
      cloudName = match[3];
    }
  }
}

// Determine if Cloudinary is configured
export const hasCloudinary = Boolean(cloudName && (apiKey || uploadPreset));

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey || undefined,
    api_secret: apiSecret || undefined,
    secure: true
  });
  // Force reset Cloudinary internal singleton so runtime changes take effect immediately
  cloudinary.config(true);

  // Masked diagnostic log (Never exposes secrets or credentials)
  const maskedName = cloudName ? `${cloudName.substring(0, 2)}***${cloudName.slice(-2)}` : 'missing';
  const maskedKey = apiKey ? `${apiKey.substring(0, 2)}***${apiKey.slice(-2)}` : 'missing';
  console.log(`[Media Storage] Cloudinary configured: cloud_name='${maskedName}', hasKey=${Boolean(apiKey)} (key='${maskedKey}'), hasSecret=${Boolean(apiSecret)}, hasPreset=${Boolean(uploadPreset)}, folder='${cloudinaryFolder}'`);
} else {
  console.log('[Media Storage] Cloudinary not configured. Fallback disk storage active in development mode.');
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

// Image MIME filter
const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported image format (${file.mimetype}). Only JPG, PNG, and WEBP property photos are allowed.`));
  }
};

// Video MIME filter
const videoFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported video format (${file.mimetype}). Only MP4 and WEBM property videos are allowed.`));
  }
};

// General MIME filter (backwards compatible)
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('video/')) {
    return videoFileFilter(_req, file, cb);
  }
  return imageFileFilter(_req, file, cb);
};

// 20 MB Limit per photo as required
export const PHOTO_MAX_SIZE = 20 * 1024 * 1024; // 20MB
export const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_PHOTO_COUNT = 10;

// Multer middleware for single property photo (20 MB limit)
export const singleImageUpload = multer({
  storage,
  limits: {
    fileSize: PHOTO_MAX_SIZE,
    files: 1
  },
  fileFilter: imageFileFilter
});

// Multer middleware for multiple property photos (Up to 10 photos, 20 MB each)
export const multipleImageUpload = multer({
  storage,
  limits: {
    fileSize: PHOTO_MAX_SIZE,
    files: MAX_PHOTO_COUNT
  },
  fileFilter: imageFileFilter
});

// Multer middleware for video tour (50 MB limit)
export const videoUpload = multer({
  storage,
  limits: {
    fileSize: VIDEO_MAX_SIZE,
    files: 1
  },
  fileFilter: videoFileFilter
});

// Backwards-compatible generic upload middleware
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: VIDEO_MAX_SIZE
  },
  fileFilter
});

/**
 * Validate actual file content against magic byte signatures.
 * Protects against disguised executables, HTML, or corrupted files.
 */
export function validateFileContent(
  filePath: string,
  isVideo: boolean = false
): { valid: boolean; detectedMime: string; error?: string } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, detectedMime: 'none', error: 'Uploaded file not found on disk.' };
  }

  const buffer = Buffer.alloc(16);
  let bytesRead = 0;
  try {
    const fd = fs.openSync(filePath, 'r');
    bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
  } catch (err: any) {
    return { valid: false, detectedMime: 'error', error: `Failed to inspect file header: ${err.message}` };
  }

  if (bytesRead < 4) {
    return { valid: false, detectedMime: 'empty', error: 'Uploaded file is empty or corrupted.' };
  }

  let detectedMime = 'application/octet-stream';

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    detectedMime = 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    detectedMime = 'image/png';
  }
  // WEBP: RIFF at bytes 0..3 and WEBP at bytes 8..11
  else if (buffer.toString('ascii', 0, 4) === 'RIFF' && bytesRead >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP') {
    detectedMime = 'image/webp';
  }
  // MP4 / MOV: 'ftyp' or 'moov' at bytes 4..8
  else if (bytesRead >= 8 && (buffer.toString('ascii', 4, 8) === 'ftyp' || buffer.toString('ascii', 4, 8) === 'moov')) {
    detectedMime = 'video/mp4';
  }
  // WEBM: 1A 45 DF A3
  else if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    detectedMime = 'video/webm';
  }

  if (isVideo) {
    if (detectedMime === 'video/mp4' || detectedMime === 'video/webm') {
      return { valid: true, detectedMime };
    }
    return {
      valid: false,
      detectedMime,
      error: `Security verification failed: File content does not match genuine MP4 or WEBM video format.`
    };
  } else {
    if (detectedMime === 'image/jpeg' || detectedMime === 'image/png' || detectedMime === 'image/webp') {
      return { valid: true, detectedMime };
    }
    return {
      valid: false,
      detectedMime,
      error: `Security verification failed: File content does not match genuine JPG, PNG, or WEBP image format.`
    };
  }
}

/**
 * Returns diagnostic details of Cloudinary configuration without exposing secrets.
 */
export function getSafeCloudinaryDiagnostics(): {
  isConfigured: boolean;
  hasCloudName: boolean;
  cloudNameLength: number;
  hasApiKey: boolean;
  apiKeyLength: number;
  hasApiSecret: boolean;
  hasPreset: boolean;
  folder: string;
} {
  return {
    isConfigured: hasCloudinary,
    hasCloudName: Boolean(cloudName),
    cloudNameLength: cloudName ? cloudName.length : 0,
    hasApiKey: Boolean(apiKey),
    apiKeyLength: apiKey ? apiKey.length : 0,
    hasApiSecret: Boolean(apiSecret),
    hasPreset: Boolean(uploadPreset),
    folder: cloudinaryFolder
  };
}

/**
 * Upload single or multiple files to Cloudinary or Persistent Disk
 */
export async function processUploadedFile(file: Express.Multer.File): Promise<{ url: string; format: string; size: number; isVideo: boolean }> {
  const isVideo = file.mimetype.startsWith('video/');

  // 1. Validate actual file content with magic bytes
  const validation = validateFileContent(file.path, isVideo);
  if (!validation.valid) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {}
    throw new Error(validation.error || 'Invalid file content. Genuine property photos (JPG, PNG, WEBP) required.');
  }

  // 2. Upload to Cloudinary if configured
  if (hasCloudinary) {
    try {
      const resourceType = isVideo ? 'video' : 'image';
      const uploadOptions: Record<string, any> = {
        folder: cloudinaryFolder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
      };

      if (uploadPreset) {
        uploadOptions.upload_preset = uploadPreset;
      }

      let result;
      if (apiKey && apiSecret) {
        // Upload to Cloudinary with API key & secret signature (without upload-time transformation to prevent 403 strict transformation rejections)
        result = await cloudinary.uploader.upload(file.path, uploadOptions);
      } else if (uploadPreset) {
        // Unsigned upload via configured Cloudinary Upload Preset
        result = await cloudinary.uploader.unsigned_upload(file.path, uploadPreset, uploadOptions);
      } else if (apiKey && !apiSecret) {
        throw new Error('CLOUDINARY_API_KEY is set, but CLOUDINARY_API_SECRET is missing in Render environment variables. Both are required for signed uploads.');
      } else {
        throw new Error('Cloudinary requires CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (or CLOUDINARY_UPLOAD_PRESET) in Render environment variables.');
      }

      // Cleanup local temp file
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {}

      return {
        url: result.secure_url || result.url,
        format: result.format || (isVideo ? 'mp4' : 'jpg'),
        size: result.bytes || file.size,
        isVideo
      };
    } catch (cloudErr: any) {
      // Cleanup local temp file on error
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {}

      const statusCode = cloudErr?.http_code || (cloudErr?.message?.includes('403') ? 403 : 500);
      const rawMessage = cloudErr?.message || 'Upload operation failed';

      // Log safe diagnostic details without printing credentials or secrets
      const diag = getSafeCloudinaryDiagnostics();
      console.error(
        `[Cloudinary Upload Error] HTTP ${statusCode}: ${rawMessage}. Diag: cloudName=${diag.hasCloudName ? 'set' : 'none'}, key=${diag.hasApiKey ? 'set' : 'none'}, secret=${diag.hasApiSecret ? 'set' : 'none'}, preset=${diag.hasPreset ? 'set' : 'none'}, folder='${diag.folder}'`
      );

      // In production, never silently fall back to ephemeral local disk
      if (statusCode === 403) {
        throw new Error(
          'Media storage upload failed (HTTP 403 Forbidden). Cloudinary rejected the request. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Render environment variables, or ensure your Cloudinary account is active.'
        );
      }

      throw new Error(`Media storage upload failed: ${rawMessage}`);
    }
  }

  // Production check: In production mode, Cloudinary credentials are mandatory
  if (process.env.NODE_ENV === 'production') {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {}
    throw new Error(
      'Media storage is not configured for production. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to Render Environment Variables.'
    );
  }

  // Local development fallback only (when Cloudinary is NOT configured in local dev)
  const relativeUrl = `/uploads/properties/${file.filename}`;
  return {
    url: relativeUrl,
    format: path.extname(file.filename).replace('.', '') || (isVideo ? 'mp4' : 'jpg'),
    size: file.size,
    isVideo
  };
}
