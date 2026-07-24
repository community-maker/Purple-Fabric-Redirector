import app from '../src/app';

// Vercel invokes the exported Express application as a serverless function.
// Do not call app.listen() here; src/server.ts remains the local entry point.
export default app;
