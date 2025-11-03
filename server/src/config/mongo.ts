import mongoose from 'mongoose'

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/allforone'

export async function connectMongo() {
  const configuredUri = process.env.MONGO_URI?.trim()
  const uriToUse = configuredUri && configuredUri.length > 0 ? configuredUri : DEFAULT_LOCAL_URI

  if (!configuredUri) {
    console.warn(
      `MONGO_URI not set. Trying fallback connection to ${DEFAULT_LOCAL_URI}. ` +
        'If you prefer another instance, define MONGO_URI in server/.env.'
    )
  }

  try {
    await mongoose.connect(uriToUse, {
      serverSelectionTimeoutMS: 5000
    })
    console.log(`MongoDB connected on ${uriToUse}`)
  } catch (err) {
    console.error('MongoDB connection failed', err)
    if (!configuredUri) {
      console.error(
        'Fallback connection also failed. Make sure your Docker container "afo-mongo" (port 27017) is running or set MONGO_URI to a reachable instance.'
      )
    }
    throw err
  }
}

export function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    return mongoose.disconnect()
  }
  return Promise.resolve()
}
