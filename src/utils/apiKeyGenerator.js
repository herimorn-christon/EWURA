import crypto from 'crypto';

export const generateStationApiKey = (stationCode) => {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString(36);
  return `${stationCode}_${timestamp}_${randomBytes}`.toUpperCase();
};