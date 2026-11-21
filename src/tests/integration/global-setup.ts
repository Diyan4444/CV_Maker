import { spawn, execSync, ChildProcess } from 'node:child_process';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let server: ChildProcess | null = null;

export async function setup() {
  const PORT = 3101;
  process.env.TEST_BASE_URL = `http://localhost:${PORT}`;

  console.log(`\n[Integration GlobalSetup] Building application for integration test suite...`);
  execSync('npm run build', { stdio: 'inherit' });

  console.log(`\n[Integration GlobalSetup] Starting dedicated Next.js production server on port ${PORT}...`);
  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) },
  });

  // Wait for server to become responsive
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 60000) {
    try {
      const res = await fetch(`http://localhost:${PORT}`);
      if (res.status > 0) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!ready) {
    if (server) server.kill();
    throw new Error(`Integration server failed to respond on port ${PORT} within 60s`);
  }

  console.log(`[Integration GlobalSetup] Dedicated server ready at http://localhost:${PORT}.\n`);

  return async () => {
    console.log(`\n[Integration GlobalSetup] Stopping dedicated integration server on port ${PORT}...`);
    if (server) {
      if (process.platform === 'win32' && server.pid) {
        try {
          execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
        } catch {
          server.kill();
        }
      } else {
        server.kill();
      }
    }
    console.log(`[Integration GlobalSetup] Integration server stopped.\n`);
  };
}
