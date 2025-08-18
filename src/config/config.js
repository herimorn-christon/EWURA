import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  nfpp: {
    simulation: process.env.NFPP_SIMULATION === 'true' || process.env.NODE_ENV === 'development',
    host: process.env.PTS_HOST || '192.168.1.117',
    port: process.env.PTS_PORT || '8000',
    user: process.env.PTS_USER || 'admin',
    pass: process.env.PTS_PASS || 'admin'
  }
};