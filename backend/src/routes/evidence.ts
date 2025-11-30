/**
 * Evidence Routes
 * API endpoints for evidence upload and access
 * Requirements: 3.2, 3.3, 3.5, 3.6
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  getMediaUploadParams,
  appendVideoEvidence,
  appendAudioEvidence,
  getMediaAccessUrl,
  getPortfolio,
  Accessor,
  CloudinaryMediaReference,
} from '../services/evidence';

export const evidenceRouter = Router();

/**
 * POST /api/v1/evidence/upload-params
 * Get signed upload parameters for direct Cloudinary upload
 * Requirements: 3.2, 3.3
 */
evidenceRouter.post('/upload-params', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { portfolioId, mediaType } = req.body;

    if (!portfolioId || !mediaType) {
      return res.status(400).json({
        success: false,
        error: 'portfolioId and mediaType are required',
      });
    }

    if (mediaType !== 'video' && mediaType !== 'audio') {
      return res.status(400).json({
        success: false,
        error: 'mediaType must be "video" or "audio"',
      });
    }

    const result = getMediaUploadParams(portfolioId, mediaType);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        uploadParams: result.params,
        evidenceId: result.evidenceId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/evidence/confirm-upload
 * Confirm media upload and add to evidence portfolio
 * Called after successful Cloudinary upload
 * Requirements: 3.2, 3.3, 3.5
 */
evidenceRouter.post('/confirm-upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { portfolioId, mediaType, mediaRef } = req.body;

    if (!portfolioId || !mediaType || !mediaRef) {
      return res.status(400).json({
        success: false,
        error: 'portfolioId, mediaType, and mediaRef are required',
      });
    }

    // Validate mediaRef structure
    const { publicId, secureUrl, format, bytes, contentHash } = mediaRef;
    if (!publicId || !secureUrl || !bytes) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mediaRef: publicId, secureUrl, and bytes are required',
      });
    }

    const cloudinaryRef: CloudinaryMediaReference = {
      publicId,
      secureUrl,
      resourceType: mediaType,
      format: format || (mediaType === 'video' ? 'mp4' : 'mp3'),
      duration: mediaRef.duration,
      bytes,
      contentHash: contentHash || '',
      uploadedAt: new Date(),
    };

    let evidence;
    if (mediaType === 'video') {
      evidence = await appendVideoEvidence(portfolioId, cloudinaryRef);
    } else {
      evidence = await appendAudioEvidence(portfolioId, cloudinaryRef);
    }

    res.json({
      success: true,
      data: {
        evidenceId: evidence.id,
        hash: evidence.hash,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/evidence/:portfolioId/:evidenceId/access-url
 * Get signed access URL for media evidence
 * Only authorized accessors can access
 * Requirements: 3.6
 */
evidenceRouter.get(
  '/:portfolioId/:evidenceId/access-url',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { portfolioId, evidenceId } = req.params;
      const { expiresIn } = req.query;

      // In production, extract accessor from auth token
      // For now, use placeholder from headers
      const accessor: Accessor = {
        id: req.headers['x-accessor-id'] as string || 'unknown',
        role: req.headers['x-accessor-role'] as string || 'unknown',
      };

      const expiresInSeconds = expiresIn ? parseInt(expiresIn as string, 10) : 3600;

      const result = getMediaAccessUrl(portfolioId, evidenceId, accessor, expiresInSeconds);

      if (!result.success) {
        const status = result.error === 'Unauthorized access' ? 403 : 404;
        return res.status(status).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        data: {
          url: result.url,
          expiresIn: expiresInSeconds,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
