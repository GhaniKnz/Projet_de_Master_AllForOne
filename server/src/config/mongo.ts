import mongoose from 'mongoose'

const uri = process.env.MONGO_URI || ''

export async function connectMongo() {
  if (!uri) {
    console.warn('MONGO_URI not set, skipping Mongo connection (memory fallback).')
    return
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    })
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection failed', err)
    throw err
  }
}

export function disconnectMongo() {
  return mongoose.disconnect()
}

