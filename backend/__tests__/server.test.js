const request = require('supertest')
const app = require('../server')

describe('GET /', () => {
  it('returns 200 and API running message', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.text).toBe('VoxNoto API running')
  })
})

describe('POST /upload', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/upload')
    expect(res.status).toBe(400)
  })

  it('returns 429 after exceeding rate limit', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/upload')
    }
    const res = await request(app).post('/upload')
    expect(res.status).toBe(429)
  })
})
