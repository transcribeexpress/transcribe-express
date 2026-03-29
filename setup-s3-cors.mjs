/**
 * Script de configuration CORS pour le bucket S3
 * 
 * Nécessaire pour permettre l'upload direct depuis le navigateur
 * via les URLs pré-signées (PUT cross-origin).
 */

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'transcribe-express-files';

async function setupCors() {
  console.log(`Setting up CORS for bucket: ${BUCKET_NAME}`);
  
  const corsConfig = {
    Bucket: BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
          AllowedOrigins: ['*'],  // Accepter toutes les origines pour le SaaS
          ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    await s3Client.send(new PutBucketCorsCommand(corsConfig));
    console.log('CORS configuration applied successfully!');
    
    // Vérifier la configuration
    const getResult = await s3Client.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
    console.log('Current CORS rules:', JSON.stringify(getResult.CORSRules, null, 2));
  } catch (err) {
    console.error('Failed to set CORS:', err.message);
    if (err.Code === 'AccessDenied' || err.name === 'AccessDenied') {
      console.error('The AWS credentials do not have permission to modify bucket CORS.');
      console.error('Please add s3:PutBucketCors and s3:GetBucketCors permissions.');
    }
  }
}

setupCors();
