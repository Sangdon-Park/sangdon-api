const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_REQUESTS_PER_DAY = 100;

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimits = rateLimitStore.get(ip) || { requests: [], dailyCount: 0, dailyReset: now + 86400000 };
  
  if (now > userLimits.dailyReset) {
    userLimits.dailyCount = 0;
    userLimits.dailyReset = now + 86400000;
  }
  
  if (userLimits.dailyCount >= MAX_REQUESTS_PER_DAY) {
    return { allowed: false, error: 'Daily limit exceeded' };
  }
  
  userLimits.requests = userLimits.requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (userLimits.requests.length >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, error: 'Too many requests. Please wait a moment.' };
  }
  
  userLimits.requests.push(now);
  userLimits.dailyCount++;
  rateLimitStore.set(ip, userLimits);
  
  return { allowed: true };
}

export default async function handler(req, res) {
  const allowedOrigins = [
    'https://sangdon-park.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const rateLimitResult = checkRateLimit(ip);
  
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: rateLimitResult.error });
  }
  
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({ error: 'API not configured' });
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: message
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return res.status(response.status).json({ error: 'AI service error' });
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: 'Invalid response from AI' });
    }
    
    const reply = data.candidates[0].content.parts[0].text;
    
    res.status(200).json({ 
      reply: reply,
      remaining: MAX_REQUESTS_PER_DAY - rateLimitStore.get(ip).dailyCount
    });
    
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}