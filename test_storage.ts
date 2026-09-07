import { ensureBucket, uploadObject, createSignedUrl } from './lib/storage.js';

async function testStorage() {
  try {
    console.log('Ensuring bucket exists...');
    await ensureBucket();
    
    console.log('Uploading test document...');
    const testData = new TextEncoder().encode("Hello world! This is a test document.");
    // We must pass an ArrayBuffer, so testData.buffer
    const objectKey = 'test-pet-id/test-doc/test.txt';
    await uploadObject(objectKey, testData.buffer, 'application/pdf');
    
    console.log('Upload successful. Generating signed URL...');
    const signedUrl = await createSignedUrl(objectKey);
    console.log('Signed URL:', signedUrl);
    
    console.log('Test completed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testStorage();
