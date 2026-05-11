const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk').default;

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/generate-business-cases', async (req, res) => {
  try {
    const {
      targetGrossMargin,
      targetNetProfit,
      usps,
      industries,
      context,
    } = req.body;

    if (!targetGrossMargin || !targetNetProfit || !usps || usps.length === 0 || !industries || industries.length === 0) {
      return res.status(400).json({
        error: '必須項目が不足しています',
      });
    }

    const prompt = `あなたは新規事業開発の専門家です。以下の条件に基づいて、3～5個の新規事業案を生成・分析してください。

【条件】
- 目標月粗利：${targetGrossMargin}万円
- 目標月純利益：${targetNetProfit}万円
- 自社の USP・強み：${usps.join('、')}
- 興味ある業界/キーワード：${industries.join('、')}
${context ? `- 追加コンテキスト：${context}` : ''}

JSON形式で出力してください。

\`\`\`json
{
  "cases": [
    {
      "name": "事業名",
      "overview": "概要",
      "businessModel": "B2B / B2C など",
      "targetCustomers": "顧客層",
      "revenueStreams": ["収益源1"],
      "initialInvestment": 100,
      "leadtimeMonths": 2,
      "year3Revenue": 5000,
      "year3GrossMargin": 2500,
      "realizabilityScore": 8,
      "marketScore": 7,
      "competitionScore": 6,
      "competitors": [
        {
          "name": "企業名",
          "characteristics": "特徴",
          "estimatedRevenue": "推定売上"
        }
      ],
      "stpAnalysis": {
        "segmentation": "セグメンテーション",
        "targeting": "ターゲティング",
        "positioning": "ポジショニング"
      },
      "swotAnalysis": {
        "strengths": ["強み1"],
        "weaknesses": ["弱み1"],
        "opportunities": ["機会1"],
        "threats": ["脅威1"]
      }
    }
  ],
  "summary": "サマリー"
}
\`\`\``;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答が得られませんでした');
    }

    const analysisData = JSON.parse(jsonMatch[1]);
    res.json(analysisData);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || 'サーバーエラーが発生しました',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
