require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.options('*', cors());
app.use(express.json());

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/ai-analyze', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  const { text } = req.body;
  if (!text || text.length < 20) {
    return res.status(400).json({ error: 'Text too short' });
  }
  const prompt = `
    You are an expert AI-text detector. Check the text for these cues:
    1. Low lexical diversity (few unique words)  
    2. Low burstiness (sentences are very similar in length)  
    3. Overuse of common words (high Zipf frequency)  
    4. Excess transition words (“however,” “moreover,” “thus”)  
    5. Perfect grammar (no typos, slang, or contractions)  
    6. Lack of personal detail (no anecdotes or specifics)  
    7. Unnatural phrasing or flow  
    8. Generic or vague examples
    
    Count how many of these cues you see:
    - 0–1 cues → score in 0–20  
    - 2 cues   → score in 21–40  
    - 3 cues   → score in 41–60  
    - 4–5 cues → score in 61–80  
    - 6+ cues  → score in 81–100  
    
    Choose a number within the range that best matches how strongly you see those cues.  
    Analyze *only* the text below.  
    Respond with a single integer (0–100), no extra text.
    
    Text:
    \"${text}\"
    `.trim();
    

  try {
    const apiRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 10
      })
    });
    if (!apiRes.ok) throw new Error(`Status ${apiRes.status}`);

    const { choices } = await apiRes.json();
    let prob = parseInt(choices[0].message.content.match(/\d+/)[0], 10);
    prob = Math.min(100, Math.max(0, prob));

    res.json({ probability: prob });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`AI service running on ${port}`));
