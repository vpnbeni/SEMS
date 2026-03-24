const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL;
const isAttendanceQueueEnabled =
  process.env.ATTENDANCE_QUEUE_ENABLED === 'true' || Boolean(redisUrl);

/**
 * Create a fresh ioredis connection for BullMQ.
 * BullMQ requires separate connection instances for Queue and Worker — do not share.
 * maxRetriesPerRequest: null is REQUIRED by BullMQ.
 */
const getRedisConnection = () => {
  const resolvedRedisUrl = redisUrl || 'redis://127.0.0.1:6379';

  const conn = new IORedis(resolvedRedisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  conn.on('error', (err) => {
    // Log but do not crash — BullMQ retries automatically
    console.error('[Redis] Connection error:', err.message);
  });

  conn.on('connect', () => {
    console.log('[Redis] Connected'.green);
  });

  return conn;
};

const attendanceQueue = isAttendanceQueueEnabled
  ? new Queue('attendance-processing', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 60 * 60 * 24 }, // keep completed jobs 24h
        removeOnFail: { age: 60 * 60 * 24 * 7 }, // keep failed jobs 7 days
      },
    })
  : null;

module.exports = { attendanceQueue, getRedisConnection, isAttendanceQueueEnabled };
