import { createApp } from '../src/app';

// Vercel invokes the exported Express application as a serverless function.
// Do not call app.listen() here; src/server.ts remains the local entry point.
const app = createApp();

export default app;
