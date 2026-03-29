import { generatePresignedUploadUrl } from './server/s3Direct.ts';

async function test() {
  try {
    const result = await generatePresignedUploadUrl('test-user', 'test.txt', 'text/plain');
    console.log('Presigned URL generated');
    console.log('Upload URL:', result.uploadUrl.substring(0, 120) + '...');
    
    // Tester l'upload avec fetch PUT
    const testContent = 'Hello World test upload';
    const response = await fetch(result.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: testContent,
    });
    
    console.log('Upload status:', response.status);
    console.log('Upload statusText:', response.statusText);
    
    if (response.ok) {
      console.log('Upload SUCCESS!');
      
      // Vérifier que le fichier existe
      const headResp = await fetch(result.fileUrl, { method: 'HEAD' });
      console.log('HEAD after upload:', headResp.status);
    } else {
      const body = await response.text();
      console.log('Error body:', body.substring(0, 500));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
