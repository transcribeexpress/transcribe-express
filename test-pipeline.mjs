// Test du pipeline complet : S3 download → FFmpeg → Transcription
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.AWS_S3_BUCKET_NAME;

// 1. Lister les fichiers récents pour trouver le bon fileKey
console.log('=== Listing recent files in S3 ===');
const listResult = await s3.send(new ListObjectsV2Command({
  Bucket: bucket,
  Prefix: 'transcriptions/',
  MaxKeys: 10,
}));

if (listResult.Contents) {
  for (const obj of listResult.Contents) {
    console.log(`  ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(1)} MB, ${obj.LastModified})`);
  }
}

// 2. Tester le téléchargement du fichier le plus récent
const latestFile = listResult.Contents?.sort((a, b) => b.LastModified - a.LastModified)[0];
if (latestFile) {
  console.log(`\n=== Downloading latest file: ${latestFile.Key} ===`);
  const start = Date.now();
  
  try {
    const getResult = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: latestFile.Key,
    }));
    
    const chunks = [];
    for await (const chunk of getResult.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const elapsed = (Date.now() - start) / 1000;
    console.log(`Downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)} MB in ${elapsed.toFixed(1)}s`);
    
    // 3. Tester FFmpeg
    console.log('\n=== Testing FFmpeg conversion ===');
    const { spawn } = await import('child_process');
    const { writeFileSync, readFileSync, existsSync, unlinkSync, statSync } = await import('fs');
    const { tmpdir } = await import('os');
    const path = await import('path');
    
    // Trouver ffmpeg
    let ffmpegPath;
    try {
      const mod = await import('ffmpeg-static');
      ffmpegPath = mod.default;
      console.log(`FFmpeg path: ${ffmpegPath}`);
    } catch (e) {
      console.error('ffmpeg-static not found:', e.message);
      process.exit(1);
    }
    
    const ext = latestFile.Key.split('.').pop();
    const inputPath = path.join(tmpdir(), `test-input.${ext}`);
    const outputPath = path.join(tmpdir(), `test-output.flac`);
    
    writeFileSync(inputPath, buffer);
    console.log(`Wrote input file: ${inputPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
    
    const ffmpegStart = Date.now();
    const proc = spawn(ffmpegPath, [
      '-i', inputPath,
      '-vn',
      '-acodec', 'flac',
      '-ar', '16000',
      '-ac', '1',
      '-map', '0:a:0',
      '-y',
      outputPath,
    ]);
    
    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      const ffmpegElapsed = (Date.now() - ffmpegStart) / 1000;
      console.log(`FFmpeg exit code: ${code} (took ${ffmpegElapsed.toFixed(1)}s)`);
      
      if (code === 0 && existsSync(outputPath)) {
        const outputSize = statSync(outputPath).size;
        console.log(`Output: ${(outputSize / 1024 / 1024).toFixed(1)} MB`);
        
        // 4. Tester la transcription Groq
        console.log('\n=== Testing Groq Whisper API ===');
        const audioBuffer = readFileSync(outputPath);
        
        const formData = new FormData();
        const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/flac' });
        formData.append('file', audioBlob, 'audio.flac');
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'verbose_json');
        formData.append('prompt', 'Transcription audio/vidéo en français');
        
        const baseUrl = process.env.BUILT_IN_FORGE_API_URL.endsWith('/')
          ? process.env.BUILT_IN_FORGE_API_URL
          : `${process.env.BUILT_IN_FORGE_API_URL}/`;
        const fullUrl = new URL('v1/audio/transcriptions', baseUrl).toString();
        
        console.log(`API URL: ${fullUrl}`);
        console.log(`Audio size: ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB`);
        
        const groqStart = Date.now();
        fetch(fullUrl, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
            'Accept-Encoding': 'identity',
          },
          body: formData,
        }).then(async (resp) => {
          const groqElapsed = (Date.now() - groqStart) / 1000;
          console.log(`Groq response: ${resp.status} ${resp.statusText} (took ${groqElapsed.toFixed(1)}s)`);
          
          if (resp.ok) {
            const result = await resp.json();
            console.log(`Language: ${result.language}`);
            console.log(`Duration: ${result.duration}s`);
            console.log(`Text (first 200 chars): ${result.text?.substring(0, 200)}`);
            console.log('\n✅ PIPELINE COMPLET RÉUSSI');
          } else {
            const errorText = await resp.text();
            console.error(`Groq error: ${errorText.substring(0, 500)}`);
          }
          
          // Cleanup
          try { unlinkSync(inputPath); } catch {}
          try { unlinkSync(outputPath); } catch {}
        }).catch(e => {
          console.error('Groq fetch error:', e.message);
        });
        
      } else {
        console.error('FFmpeg failed. Last stderr:', stderr.slice(-500));
      }
    });
    
    proc.on('error', (err) => {
      console.error('FFmpeg spawn error:', err.message);
    });
    
  } catch (e) {
    console.error('Download error:', e.message);
  }
} else {
  console.log('No files found in S3');
}
