# Erreur mobile upload chunked - 7 mai 2026

## Message d'erreur exact
```
Upload completion failed (400): {"error":"Chunks manquants pour l'uploadId upload-mov0ymhd-3lnvvg. Assurez-vous que tous les chunks ont été uploadés."}
```

## Contexte
- iPhone 13, vidéo 470 Mo
- Upload atteint 88% puis échoue
- L'erreur vient de la route `/api/upload-chunk-complete`
- Le serveur détecte des chunks manquants lors de la finalisation

## Cause probable
- Certains chunks échouent silencieusement (timeout réseau mobile, 413 payload too large, etc.)
- Le client pense avoir uploadé tous les chunks mais certains n'ont pas été reçus côté serveur
- À 88% d'un fichier de 470 Mo = chunk ~42 sur 47 (10 Mo/chunk)
- Possible que le retry échoue 3 fois sur un chunk et que le client continue quand même

## Fichiers à analyser
- client/src/utils/chunkedUploader.ts (logique de retry et gestion d'erreur)
- server/chunkedUploadRoute.ts (validation des chunks reçus)
