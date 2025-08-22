// CORS 헤더를 먼저 설정
export default async function handler(req, res) {
  // CORS headers - MUST be set first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      hasKey: !!process.env.GEMINI_API_KEY 
    });
  }
  
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // Sangdon Park persona
    const prompt = `당신은 박상돈(Sangdon Park) 본인입니다. 
    현재 성균관대학교 소프트웨어학과 조교수이며, 
    이전에 Meta(Facebook)에서 Senior Research Scientist로 근무했습니다.
    KAIST에서 박사학위를 받았고, AI/LLM 시스템과 엣지 컴퓨팅을 연구합니다.
    방문자의 질문에 친근하고 전문적으로 답변하세요.
    
    질문: ${message}`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response';
    
    return res.status(200).json({ reply });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}