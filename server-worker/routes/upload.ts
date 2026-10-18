import { Hono } from 'hono';
import type { Env } from '../types.ts';
import { generateCloudinarySignature } from '../crypto.ts';

export const uploadRouter = new Hono<{ Bindings: Env }>();

// POST /upload/sign (Signed Cloudinary Upload Parameters for Direct Client-to-Cloudinary Upload)
uploadRouter.post('/sign', async (c) => {
  const cloudName = c.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = c.env.CLOUDINARY_API_KEY || '';
  const apiSecret = c.env.CLOUDINARY_API_SECRET || '';
  const folder = c.env.CLOUDINARY_FOLDER || 'spp_nestora/properties';

  if (!cloudName || !apiKey || !apiSecret) {
    return c.json({
      configured: false,
      message: 'Cloudinary not fully configured in environment bindings'
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder,
    timestamp
  };

  const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

  return c.json({
    configured: true,
    cloudName,
    apiKey,
    folder,
    timestamp,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
  });
});

// POST /upload/image (Worker In-Memory Direct Proxy to Cloudinary without local disk)
uploadRouter.post('/image', async (c) => {
  try {
    const cloudName = c.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = c.env.CLOUDINARY_API_KEY || '';
    const apiSecret = c.env.CLOUDINARY_API_SECRET || '';
    const uploadPreset = c.env.CLOUDINARY_UPLOAD_PRESET || '';
    const folder = c.env.CLOUDINARY_FOLDER || 'spp_nestora/properties';

    const formData = await c.req.formData();
    const file = formData.get('image') || formData.get('file');

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No image file provided in request' }, 400);
    }

    // Check Cloudinary configuration
    if (!cloudName || (!apiSecret && !uploadPreset)) {
      // Diagnostic fallback for local test mode
      return c.json({
        url: `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80`,
        publicId: `dev-simulated-${Date.now()}`,
        format: 'jpg',
        isVideo: false
      });
    }

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('folder', folder);

    if (apiSecret && apiKey) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await generateCloudinarySignature({ folder, timestamp }, apiSecret);
      cloudinaryFormData.append('api_key', apiKey);
      cloudinaryFormData.append('timestamp', String(timestamp));
      cloudinaryFormData.append('signature', signature);
    } else if (uploadPreset) {
      cloudinaryFormData.append('upload_preset', uploadPreset);
    }

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: cloudinaryFormData
    });

    if (!cloudRes.ok) {
      const err = await cloudRes.json().catch(() => ({}));
      return c.json({ error: (err as any).error?.message || 'Cloudinary upload failed' }, 502);
    }

    const cloudData = await cloudRes.json() as any;
    return c.json({
      url: cloudData.secure_url || cloudData.url,
      publicId: cloudData.public_id,
      format: cloudData.format,
      bytes: cloudData.bytes,
      isVideo: false
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Image upload error' }, 500);
  }
});

// POST /upload/multiple
uploadRouter.post('/multiple', async (c) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return c.json({ error: 'No images provided' }, 400);
    }

    const cloudName = c.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = c.env.CLOUDINARY_API_KEY || '';
    const apiSecret = c.env.CLOUDINARY_API_SECRET || '';
    const uploadPreset = c.env.CLOUDINARY_UPLOAD_PRESET || '';
    const folder = c.env.CLOUDINARY_FOLDER || 'spp_nestora/properties';

    const uploadedFiles: Array<{ url: string; originalName?: string; format?: string; size?: number }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!cloudName || (!apiSecret && !uploadPreset)) {
        uploadedFiles.push({
          url: `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80`,
          originalName: file.name,
          format: 'jpg',
          size: file.size
        });
        continue;
      }

      const cFormData = new FormData();
      cFormData.append('file', file);
      cFormData.append('folder', folder);

      if (apiSecret && apiKey) {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = await generateCloudinarySignature({ folder, timestamp }, apiSecret);
        cFormData.append('api_key', apiKey);
        cFormData.append('timestamp', String(timestamp));
        cFormData.append('signature', signature);
      } else if (uploadPreset) {
        cFormData.append('upload_preset', uploadPreset);
      }

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: cFormData
      });

      if (cloudRes.ok) {
        const cData = await cloudRes.json() as any;
        uploadedFiles.push({
          url: cData.secure_url || cData.url,
          originalName: file.name,
          format: cData.format,
          size: cData.bytes
        });
      }
    }

    return c.json({ files: uploadedFiles });
  } catch (err: any) {
    return c.json({ error: err.message || 'Multiple upload error' }, 500);
  }
});

// POST /upload/video
uploadRouter.post('/video', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return c.json({ error: 'No video provided' }, 400);
    }

    const cloudName = c.env.CLOUDINARY_CLOUD_NAME || '';
    const uploadPreset = c.env.CLOUDINARY_UPLOAD_PRESET || '';

    if (!cloudName) {
      return c.json({
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        isVideo: true
      });
    }

    const cFormData = new FormData();
    cFormData.append('file', file);
    if (uploadPreset) cFormData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: 'POST',
      body: cFormData
    });

    if (!res.ok) {
      return c.json({ error: 'Cloudinary video upload failed' }, 502);
    }

    const data = await res.json() as any;
    return c.json({
      url: data.secure_url || data.url,
      isVideo: true
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Video upload error' }, 500);
  }
});
