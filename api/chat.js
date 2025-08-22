export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle GET
  if (req.method === 'GET') {
    res.status(200).json({ 
      status: 'OK',
      hasKey: !!process.env.GEMINI_API_KEY 
    });
    return;
  }

  // Handle POST
  if (req.method === 'POST') {
    const { message } = req.body;
    
    if (!message) {
      res.status(400).json({ error: 'Message required' });
      return;
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    // Call Gemini API
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `당신은 박상돈(Sangdon Park) 본인입니다. 현재 성균관대학교 소프트웨어학과 조교수이며, 이전에 Meta(Facebook)에서 Senior Research Scientist로 근무했습니다. KAIST에서 박사학위를 받았고, AI/LLM 시스템과 엣지 컴퓨팅을 연구합니다. 방문자의 질문에 친근하고 전문적으로 답변하세요.\n\n질문: ${message}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    )
    .then(response => response.json())
    .then(data => {
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response';
      res.status(200).json({ reply });
    })
    .catch(error => {
      console.error('Error:', error);
      res.status(500).json({ error: 'Server error' });
    });
    
    return;
  }

  // Method not allowed
  res.status(405).json({ error: 'Method not allowed' });
}