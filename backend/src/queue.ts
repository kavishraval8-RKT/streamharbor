import { Queue } from 'bullmq';

// Define the connection to our Redis container
const connection = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!, 10),
};

/**
 * This is our main queue for video processing.
 * We export this instance so our API routes can add jobs to it.
 */
export const videoQueue = new Queue('video-processing', { 
  connection,
  defaultJobOptions: {
    // In case a job fails, we'll retry it 3 times
    attempts: 3,
    // Wait 5 seconds before retrying
    backoff: {
      type: 'exponential',
      delay: 5000,
    }
  }
});

videoQueue.on('error', (err) => {
  console.error('BullMQ Queue Error:', err);
});

console.log('✅ BullMQ connection to Redis established.');