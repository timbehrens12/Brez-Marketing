const Redis = require('ioredis')
require('dotenv').config({ path: '.env.local' })

const host = process.env.REDIS_HOST?.replace('https://', '')
const redis = new Redis({
  host: host,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
})

redis.set('test', 'hello world')
  .then(() => redis.get('test'))
  .then(result => {
    console.log('✅ Redis works:', result)
    redis.disconnect()
  })
  .catch(err => {
    console.log('❌ Error:', err.message)
    redis.disconnect()
  })
