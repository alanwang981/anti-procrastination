require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');
app.use(cors({
  origin: [
    'chrome-extension://your-extension-id',
    'https://your-service.onrender.com'
  ]
}));

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: system },
        ...messages
      ],
      max_tokens: 150
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
