const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const colors = require('colors');

const redisUrl = process.env.REDIS_URL;
const isAttendanceQueueEnabled =
  process.env.ATTENDANCE_QUEUE_ENABLED === 'true' || Boolean(redisUrl);

let attendanceQueue = null;
let isAttendanceQueueReady = false;
let lastRedisErrorLogAt = 0;

const REDIS_ERROR_LOG_INTERVAL_MS = 60_000;
const REDIS_PROBE_TIMEOUT_MS = 3000;

const getResolvedRedisUrl = () => redisUrl || 'redis://127.0.0.1:6379';

const logRedisError = (message) => {
  const now = Date.now();
  if (now - lastRedisErrorLogAt >= REDIS_ERROR_LOG_INTERVAL_MS) {
    lastRedisErrorLogAt = now;
    console.error('[Redis]', message);
  }
};

/**
 * Create a fresh ioredis connection for BullMQ.
 * BullMQ requires separate connection instances for Queue and Worker — do not share.
 * maxRetriesPerRequest: null is REQUIRED by BullMQ.
 */
const createRedisConnection = () => {
  const conn = new IORedis(getResolvedRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 10) {
        return null;
      }
      return Math.min(times * 500, 5000);
    },
  });

  conn.on('error', (err) => {
    logRedisError(`Connection error: ${err.message}`);
  });

  conn.on('connect', () => {
    console.log('[Redis] Connected'.green);
  });

  return conn;
};

const getRedisConnection = () => createRedisConnection();

const getAttendanceQueue = () => attendanceQueue;

const probeRedisConnection = async () => {
  const conn = createRedisConnection();

  try {
    await Promise.race([
      conn.connect().then(() => conn.ping()),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connection timed out')), REDIS_PROBE_TIMEOUT_MS);
      }),
    ]);
    await conn.quit();
    return true;
  } catch {
    try {
      conn.disconnect();
    } catch {
      // ignore cleanup errors
    }
    return false;
  }
};

const initAttendanceQueue = async () => {
  if (!isAttendanceQueueEnabled) {
    return false;
  }

  const reachable = await probeRedisConnection();
  if (!reachable) {
    console.warn(
      '⚠️  Attendance queue unavailable — Redis is not reachable at'
        .yellow,
      getResolvedRedisUrl(),
      '(start Redis or unset REDIS_URL to silence this)'.yellow
    );
    isAttendanceQueueReady = false;
    return false;
  }

  attendanceQueue = new Queue('attendance-processing', {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 60 * 60 * 24 }, // keep completed jobs 24h
      removeOnFail: { age: 60 * 60 * 24 * 7 }, // keep failed jobs 7 days
    },
  });

  isAttendanceQueueReady = true;
  return true;
};

module.exports = {
  attendanceQueue,
  getAttendanceQueue,
  getRedisConnection,
  initAttendanceQueue,
  isAttendanceQueueEnabled,
  isAttendanceQueueReady: () => isAttendanceQueueReady,
};
