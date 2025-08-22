# Sangdon API

Backend API for Sangdon Park's website chatbot using Google Gemini AI.

## Features

- Gemini 2.0 Flash integration
- Rate limiting (10 req/min, 100 req/day)
- CORS protection
- Secure API key management

## Setup

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Add environment variable:
```bash
vercel env add GEMINI_API_KEY
```

## Local Development

```bash
vercel dev
```

## API Endpoint

POST `/api/chat`

Request:
```json
{
  "message": "Your message here"
}
```

Response:
```json
{
  "reply": "AI response",
  "remaining": 95
}
```