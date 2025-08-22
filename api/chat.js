export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Create response with CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Handle GET request for health check
  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'OK',
        timestamp: new Date().toISOString(),
        hasKey: !!process.env.GEMINI_API_KEY,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Handle POST request
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { message } = body;

      if (!message) {
        return new Response(
          JSON.stringify({ error: 'Message required' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'API key not configured' }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
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
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response';

      return new Response(
        JSON.stringify({ reply }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({
          error: 'Server error',
          details: error.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  // Method not allowed
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}