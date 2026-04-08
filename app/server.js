const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/optimize', async (req, res) => {
    try {
        const { platform, age, gender, lookingFor, location, currentBio, interests, promptAnswers, photoCount, photoNames } = req.body;

        const platformLabel = platform === 'all' ? 'Tinder, Hinge, and Bumble' : platform.charAt(0).toUpperCase() + platform.slice(1);

        const prompt = `You are an expert dating profile optimizer who has studied thousands of high-performing dating profiles. Optimize this user's dating profile.

USER DETAILS:
- Platform: ${platformLabel}
- Age: ${age || 'Not specified'}
- Gender: ${gender || 'Not specified'}
- Looking for: ${lookingFor || 'Not specified'}
- Location: ${location || 'Not specified'}
- Current bio: ${currentBio}
- Interests: ${interests || 'Not specified'}
${promptAnswers ? `- Current Hinge prompts: ${promptAnswers}` : ''}
- Number of photos: ${photoCount || 0}
${photoNames?.length ? `- Photo filenames: ${photoNames.join(', ')}` : ''}

Return a JSON object with these exact keys:
{
  "bio": "The rewritten bio optimized for ${platformLabel}. Make it witty, authentic, specific, and attention-grabbing. Keep the user's personality but enhance it. ${platform === 'tinder' ? 'Max 500 chars.' : platform === 'bumble' ? 'Max 300 chars.' : 'Appropriate length for the platform.'}",
  "promptAnswers": ${platform === 'hinge' || platform === 'all' ? '"3 Hinge prompt suggestions with answers that are specific, funny, and conversation-starting"' : 'null'},
  "photoAdvice": "Specific advice on photo ordering and what types of photos to add/remove based on what works best on ${platformLabel}. ${photoCount > 0 ? `They have ${photoCount} photos named: ${photoNames?.join(', ')}. Suggest optimal ordering.` : 'Give general photo advice.'}",
  "conversationStarters": ["array of 10 unique, personalized conversation starters they can use when matching with someone"],
  "tips": "3-5 specific pro tips for their profile based on their details, platform best practices, and common mistakes to avoid"
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = message.content[0].text;
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { bio: text, conversationStarters: [], photoAdvice: '', tips: '' };
        }

        res.json(parsed);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Failed to optimize profile. Please try again.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ProfileGlow AI running on port ${PORT}`));
