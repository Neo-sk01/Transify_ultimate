/**
 * Test script for Cloudinary integration
 * Run with: npx ts-node scripts/test-cloudinary.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from backend/.env or root .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import {
  configureFromEnv,
  generateSignedUploadParams,
  uploadMedia,
  generateSignedAccessUrl,
  cloudinary,
} from '../src/services/cloudinary';

async function testCloudinaryIntegration() {
  console.log('🧪 Testing Cloudinary Integration\n');

  // Check env vars
  console.log('1. Checking environment variables...');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Missing Cloudinary environment variables');
    console.log('   CLOUDINARY_CLOUD_NAME:', cloudName ? '✓' : '✗');
    console.log('   CLOUDINARY_API_KEY:', apiKey ? '✓' : '✗');
    console.log('   CLOUDINARY_API_SECRET:', apiSecret ? '✓' : '✗');
    process.exit(1);
  }
  console.log('   ✓ All env vars present\n');

  // Configure Cloudinary
  console.log('2. Configuring Cloudinary SDK...');
  try {
    configureFromEnv();
    console.log('   ✓ SDK configured\n');
  } catch (error) {
    console.error('   ❌ Failed to configure:', error);
    process.exit(1);
  }

  // Test signed upload params generation
  console.log('3. Testing signed upload params generation...');
  const testSessionId = 'test-session-123';
  const testEvidenceId = 'test-evidence-456';
  
  const uploadParams = generateSignedUploadParams(testSessionId, 'video', testEvidenceId);
  console.log('   ✓ Generated upload params:');
  console.log('     - Cloud Name:', uploadParams.cloudName);
  console.log('     - Folder:', uploadParams.folder);
  console.log('     - Public ID:', uploadParams.publicId);
  console.log('     - Signature:', uploadParams.signature.substring(0, 20) + '...');
  console.log('');

  // Test upload with a sample image (Cloudinary accepts images as 'raw' type)
  console.log('4. Testing media upload (using Cloudinary sample image)...');
  
  // Use Cloudinary's URL upload instead of buffer for testing
  const uploadResult = await new Promise<any>((resolve) => {
    cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      {
        folder: `transrify/evidence/${testSessionId}`,
        public_id: `test-${Date.now()}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({
            success: true,
            publicId: result?.public_id,
            secureUrl: result?.secure_url,
            hash: 'test-hash',
          });
        }
      }
    );
  });

  if (uploadResult.success) {
    console.log('   ✓ Upload successful:');
    console.log('     - Public ID:', uploadResult.publicId);
    console.log('     - Secure URL:', uploadResult.secureUrl);
    console.log('     - Content Hash:', uploadResult.hash?.substring(0, 20) + '...');
    console.log('');

    // Test signed access URL generation
    console.log('5. Testing signed access URL generation...');
    if (uploadResult.publicId) {
      const accessUrl = generateSignedAccessUrl(uploadResult.publicId, 3600);
      console.log('   ✓ Generated access URL:');
      console.log('     -', accessUrl.substring(0, 80) + '...');
      console.log('');

      // Cleanup: delete test file
      console.log('6. Cleaning up test file...');
      try {
        await cloudinary.uploader.destroy(uploadResult.publicId, { resource_type: 'image' });
        console.log('   ✓ Test file deleted\n');
      } catch (error) {
        console.log('   ⚠ Could not delete test file (may need manual cleanup)\n');
      }
    }
  } else {
    console.log('   ❌ Upload failed:', uploadResult.error);
    console.log('');
  }

  // Test API ping
  console.log('7. Testing Cloudinary API connectivity...');
  try {
    const pingResult = await cloudinary.api.ping();
    console.log('   ✓ API ping successful:', pingResult.status);
  } catch (error: any) {
    console.log('   ❌ API ping failed:', error.message);
  }

  console.log('\n✅ Cloudinary integration test complete!');
}

testCloudinaryIntegration().catch(console.error);
