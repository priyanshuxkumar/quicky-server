import { createClient } from "redis";


const redisClient = createClient({
    url: process.env.REDIS_CLIENT_URI,
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

(async () => {
    try {
        if (!process.env.REDIS_CLIENT_URI) {
            throw new Error('REDIS_CLIENT_URI environment variable is not set');
        }
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
})();


process.on('SIGINT', async () => {
    try {
        await redisClient.quit();
        console.log('Redis client disconnected');
        process.exit(0);
    } catch (err) {
        console.error('Error during Redis client disconnection:', err);
        process.exit(1);
    }
});

export default redisClient;
