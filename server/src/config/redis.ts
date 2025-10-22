import { createClient } from 'redis'

let client: ReturnType<typeof createClient> | null = null

export async function connectRedis() {
  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('REDIS_URL not set, skipping Redis connection.')
    return null
  }
  client = createClient({ url })
  client.on('error', (err) => console.error('Redis error', err))
  await client.connect()
  console.log('Redis connected')
  return client
}

export function getRedis() {
  return client
}

export async function disconnectRedis() {
  if (client) {
    await client.quit()
    client = null
  }
}

