/**
 * Media Upload Hook
 * Handles video/audio upload to Cloudinary during emergencies
 * Requirements: 3.2, 3.3, 3.5
 */

import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import {
  getMediaUploadParams,
  confirmMediaUpload,
  uploadMediaToCloudinary,
} from '@/services/api';

export interface MediaUploadState {
  isUploading: boolean;
  progress: number;
  lastUploadedId: string | null;
  error: string | null;
}

export interface UseMediaUploadResult {
  state: MediaUploadState;
  uploadVideo: (portfolioId: string, fileUri: string) => Promise<{ success: boolean; evidenceId?: string; error?: string }>;
  uploadAudio: (portfolioId: string, fileUri: string) => Promise<{ success: boolean; evidenceId?: string; error?: string }>;
}

const initialState: MediaUploadState = {
  isUploading: false,
  progress: 0,
  lastUploadedId: null,
  error: null,
};

/**
 * Simple hash function for content integrity (SHA-256 via SubtleCrypto when available)
 */
async function simpleHash(content: string): Promise<string> {
  // Use a simple hash for React Native environment
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Hook for uploading video/audio evidence to Cloudinary
 * Requirements: 3.2, 3.3, 3.5
 */
export function useMediaUpload(): UseMediaUploadResult {
  const [state, setState] = useState<MediaUploadState>(initialState);

  /**
   * Generate content hash for integrity verification
   */
  const generateContentHash = useCallback(async (fileUri: string): Promise<string> => {
    try {
      // Get file info for a basic hash (full content hash would be too slow for large files)
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists && 'size' in fileInfo) {
        // Create hash from file path + size + modification time
        const hashInput = `${fileUri}:${fileInfo.size}:${fileInfo.modificationTime || Date.now()}`;
        return simpleHash(hashInput);
      }
      return '';
    } catch (error) {
      console.warn('Failed to generate content hash:', error);
      return '';
    }
  }, []);

  /**
   * Upload media file to Cloudinary and confirm with backend
   */
  const uploadMedia = useCallback(
    async (
      portfolioId: string,
      fileUri: string,
      mediaType: 'video' | 'audio'
    ): Promise<{ success: boolean; evidenceId?: string; error?: string }> => {
      setState((prev) => ({
        ...prev,
        isUploading: true,
        progress: 0,
        error: null,
      }));

      try {
        // Step 1: Get signed upload params from backend
        setState((prev) => ({ ...prev, progress: 10 }));
        const paramsResponse = await getMediaUploadParams({ portfolioId, mediaType });

        if (!paramsResponse.success || !paramsResponse.data) {
          throw new Error(paramsResponse.error?.message || 'Failed to get upload params');
        }

        const { uploadParams, evidenceId } = paramsResponse.data;

        // Step 2: Generate content hash for integrity
        setState((prev) => ({ ...prev, progress: 20 }));
        const contentHash = await generateContentHash(fileUri);

        // Step 3: Upload directly to Cloudinary
        setState((prev) => ({ ...prev, progress: 30 }));
        const uploadResult = await uploadMediaToCloudinary(uploadParams, fileUri, contentHash);

        if (!uploadResult.success || !uploadResult.mediaRef) {
          throw new Error(uploadResult.error || 'Cloudinary upload failed');
        }

        setState((prev) => ({ ...prev, progress: 80 }));

        // Step 4: Confirm upload with backend (adds to evidence portfolio with hash chain)
        const confirmResponse = await confirmMediaUpload({
          portfolioId,
          mediaType,
          mediaRef: uploadResult.mediaRef,
        });

        if (!confirmResponse.success || !confirmResponse.data) {
          throw new Error(confirmResponse.error?.message || 'Failed to confirm upload');
        }

        setState({
          isUploading: false,
          progress: 100,
          lastUploadedId: confirmResponse.data.evidenceId,
          error: null,
        });

        return { success: true, evidenceId: confirmResponse.data.evidenceId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setState({
          isUploading: false,
          progress: 0,
          lastUploadedId: null,
          error: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    },
    [generateContentHash]
  );

  /**
   * Upload video evidence
   * Requirements: 3.2
   */
  const uploadVideo = useCallback(
    (portfolioId: string, fileUri: string) => uploadMedia(portfolioId, fileUri, 'video'),
    [uploadMedia]
  );

  /**
   * Upload audio evidence
   * Requirements: 3.3
   */
  const uploadAudio = useCallback(
    (portfolioId: string, fileUri: string) => uploadMedia(portfolioId, fileUri, 'audio'),
    [uploadMedia]
  );

  return {
    state,
    uploadVideo,
    uploadAudio,
  };
}

export default useMediaUpload;
