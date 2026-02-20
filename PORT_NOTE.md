# Configuration du port

Le backend doit être configuré pour tourner sur le port 3001 pour éviter le conflit avec Next.js (port 3000).

Modifier `src/main.ts` :
```typescript
await app.listen(3001);
```
