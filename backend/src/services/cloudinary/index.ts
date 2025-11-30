/**
 * Cloudinary Service
 * Handles media upload for video/audio evidence
 * Requirements: 3.2, 3.3, 3.5
 */

import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { createHash } from 'crypto';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId: string;
  resourceType: 'video' | 'image' | 'raw';
}

export interface UploadResult {
  success: boolean;
  publicId?: string;
  secureUrl?: string;
  format?: string;
  duration?: number;
  bytes?: number;
  hash?: string;
  error?: string;
}

export interface MediaReference {
  publicId: string;
  secureUrl: string;
  resourceType: 'video' | 'audio';
  format: string;
  duration?: number;
  bytes: number;
  contentHash: string;
  uploadedAt: Date;
}

// Cloudinary configuration state
let isConfigured = false;

/**
 * Configure Cloudinary SDK
 */
export function configureCloudinary(config: CloudinaryConfig): void {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  isConfigured = true;
}

/**
 * Configure from environment variables
 */
export function configureFromEnv(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Missing Cloudinary environment variables');
  }

  configureCloudinary({ cloudName, apiKey, apiSecret });
}

/**
 * Generate signed upload parameters for direct mobile upload
 * This allows the mobile app to upload directly to Cloudinary
 * Requirements: 3.2, 3.3
 */
export function generateSignedUploadParams(
  sessionId: string,
  evidenceType: 'video' | 'audio',
  evidenceId: string
): SignedUploadParams {
  if (!isConfigured) {
    configureFromEnv();
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `transrify/evidence/${sessionId}`;
  const publicId = `${evidenceType}_${evidenceId}`;
  const resourceType = evidenceType === 'audio' ? 'video' : 'video'; // Cloudinary uses 'video' for audio too

  // Parameters to sign (must be in alphabetical order)
  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder,
    publicId,
    resourceType,
  };
}

/**
 * Upload media directly from backend (for buffered uploads)
 * Requirements: 3.2, 3.3, 3.5
 */
export async function uploadMedia(
  buffer: Buffer,
  sessionId: string,
  evidenceType: 'video' | 'audio',
  evidenceId: string
): Promise<UploadResult> {
  if (!isConfigured) {
    configureFromEnv();
  }

  const folder = `transrify/evidence/${sessionId}`;
  const publicId = `${evidenceType}_${evidenceId}`;

  // Generate content hash for integrity verification
  const contentHash = createHash('sha256').update(buffer).digest('hex');

  try {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'video', // Works for both video and audio
          type: 'authenticated', // Requires signed URLs for access
          access_mode: 'authenticated',
          tags: ['evidence', sessionId, evidenceType],
        },
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error('No result from Cloudinary'));
        }
      );
      uploadStream.end(buffer);
    });

    return {
      success: true,
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes,
      hash: contentHash,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate a signed URL for accessing evidence media
 * Only authorized users should be able to view evidence
 * Requirements: 3.6
 */
export function generateSignedAccessUrl(
  publicId: string,
  expiresInSeconds: number = 3600
): string {
  if (!isConfigured) {
    configureFromEnv();
  }

  const expiresAt = Math.round(Date.now() / 1000) + expiresInSeconds;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    type: 'authenticated',
    sign_url: true,
    expires_at: expiresAt,
  });
}

/**
 * Delete evidence media (for data retention compliance)
 * Requirements: 10.4
 */
export async function deleteMedia(publicId: string): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured) {
    configureFromEnv();
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Delete failed';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get media info for verification
 */
export async function getMediaInfo(publicId: string): Promise<{
  success: boolean;
  info?: {
    format: string;
    duration: number;
    bytes: number;
    createdAt: Date;
  };
  error?: string;
}> {
  if (!isConfigured) {
    configureFromEnv();
  }

  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: 'video' });
    return {
      success: true,
      info: {
        format: result.format,
        duration: result.duration,
        bytes: result.bytes,
        createdAt: new Date(result.created_at),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get media info';
    return { success: false, error: errorMessage };
  }
}

export { cloudinary };
