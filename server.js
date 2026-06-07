import express from 'express';
import cors from 'cors';
import { VertexAI } from '@google-cloud/vertexai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GCP Project configuration
const PROJECT_ID = 'paisel-claude-vertex';
const LOCATION = 'us-central1'; // us-central1 is default for Vertex AI models

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

/**
 * Maps standard short model names to Vertex AI specific model IDs
 */
function mapModelName(modelName) {
  switch (modelName) {
    case 'gemini-2.5-flash':
      return 'gemini-2.5-flash';
    case 'gemini-2.0-flash':
      return 'gemini-2.0-flash-001';
    case 'gemini-2.5-pro':
      return 'gemini-2.5-pro';
    case 'gemini-1.5-pro':
      return 'gemini-1.5-pro-002';
    default:
      return 'gemini-2.5-flash';
  }
}

// 1. API connection / validation route
app.post('/api/validate', async (req, res) => {
  const { modelName } = req.body;
  const targetModel = mapModelName(modelName || 'gemini-2.5-flash');
  
  try {
    const generativeModel = vertexAI.getGenerativeModel({ model: targetModel });
    const result = await generativeModel.generateContent('Connection test');
    const text = result.response.candidates[0].content.parts[0].text;
    res.json({ success: true, message: 'Vertex AI connection verified!', text });
  } catch (error) {
    console.error('Vertex AI Validation Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. LLM 1: Extract Anonymous Description
app.post('/api/extract', async (req, res) => {
  const { input, filters, emphasize, useWebSearch, modelName, lang } = req.body;
  const targetModel = mapModelName(modelName || 'gemini-2.5-flash');
  const isEn = lang === 'en';

  // Build constraints
  let attributeConstraints = "";
  if (isEn) {
    if (filters.hideGender)  attributeConstraints += "- Do NOT mention vocalist gender, sex, or pronouns (he/she/male/female/mixed voices etc.) in any way.\n";
    if (filters.hideMembers) attributeConstraints += "- Do NOT mention the number of performers or group format (solo, duo, band, group, unit, etc.).\n";
    if (filters.hideGenre)   attributeConstraints += "- Do NOT name any specific music genre (pop, rock, hip-hop, anime song, etc.); describe sound textures, tempo, and mood instead.\n";
    if (filters.hideEra)     attributeConstraints += "- Do NOT mention any decade, era, or historical time period (80s, 90s, 2020s, Showa, Heisei, recent, etc.).\n";
    if (filters.hideCountry) attributeConstraints += "- Do NOT mention nationality, region, or the language sung (Japan, J-POP, K-POP, English, French, etc.).\n";
    if (filters.hideLyrics)  attributeConstraints += "- Do NOT describe any lyrical themes, story, narrative, or worldview of the song.\n";
  } else {
    if (filters.hideGender)  attributeConstraints += "- ボーカルの性別に関する直接的・間接的な言及（男性、女性、男声、女声、ミックスボイス、彼、彼女など）を完全に禁止します。\n";
    if (filters.hideMembers) attributeConstraints += "- アーティストの人数や構成に関する直接的・間接的な言及（ソロ、バンド、グループ、デュオ、ユニット、〇人組など）を完全に禁止します。\n";
    if (filters.hideGenre)   attributeConstraints += "- 直接的な音楽ジャンル名（J-POP、ロック、ヒップホップ、アニソン、ボカロ、演歌、クラシックなど）の記述を禁止し、音の特徴やテンポ、リズム、雰囲気で表現してください。\n";
    if (filters.hideEra)     attributeConstraints += "- リリースされた年代や時期、歴史的なタイミング（昭和、平成、令和、90年代、2020年代、最近、デビュー当時など）に関する言及を完全に禁止します。\n";
    if (filters.hideCountry) attributeConstraints += "- アーティストの国籍、地域、あるいは歌唱言語（日本、洋楽、邦楽、K-POP、英語、日本語など）に関する言及を完全に禁止します。\n";
    if (filters.hideLyrics)  attributeConstraints += "- 歌詞のテーマ、内容、世界観、物語性に関するいかなる記述も禁止します。\n";
  }

  // Build emphases
  let attributeEmphases = "";
  if (emphasize) {
    if (isEn) {
      if (emphasize.empGender)  attributeEmphases += "- Describe vocalist gender (male/female/mixed) and vocal timbre in rich detail; make this a key highlight.\n";
      if (emphasize.empMembers) attributeEmphases += "- Describe group format and member count (solo/duo/band/group) specifically; make this a key highlight.\n";
      if (emphasize.empGenre)   attributeEmphases += "- Explicitly name and elaborate on the music genre and its distinctive stylistic features; make this a key highlight.\n";
      if (emphasize.empEra)     attributeEmphases += "- Clearly state the decade/era and describe the historical atmosphere and sonic trends of that time; make this a key highlight.\n";
      if (emphasize.empCountry) attributeEmphases += "- Clearly state the country/region and language of the music; make this a key highlight.\n";
      if (emphasize.empLyrics)  attributeEmphases += "- Describe the lyrical themes, narrative, and overall worldview in rich detail; make this a key highlight.\n";
    } else {
      if (emphasize.empGender)  attributeEmphases += "- ボーカルの性別（男性、女性、混声など）や声質の特徴について、非常に詳細に記述し、強調してください。\n";
      if (emphasize.empMembers) attributeEmphases += "- アーティストの構成や構成人数（ソロ、デュオ、バンド、グループなど）について、具体的に記述し、強調してください。\n";
      if (emphasize.empGenre)   attributeEmphases += "- その音楽のジャンル（J-POP、ロック、ジャズなど）やそのジャンル特有の様式美について、明確に言及し、強調してください。\n";
      if (emphasize.empEra)     attributeEmphases += "- リリースされた年代や時代背景（昭和、平成、90年代、2020年代など）について、明確に記述し、その時代の空気感を強調してください。\n";
      if (emphasize.empCountry) attributeEmphases += "- アーティストの活動国、地域、または歌唱言語（日本、洋楽、K-POP、英語、日本語など）について、明確に言及し、強調してください。\n";
      if (emphasize.empLyrics)  attributeEmphases += "- 歌詞のテーマ、ストーリー性、世界観について非常に詳細に記述し、強調してください。\n";
    }
  }

  const prompt = isEn
    ? `You are a music expert. Analyze the song or artist provided and describe its musical characteristics, mood, and atmosphere in bullet-point format.

[Input Song or Artist]
${input}

[STRICT CONSTRAINTS — MUST FOLLOW]
Completely omit the following from your description:
- The input name itself and all related proper nouns (artist names, song titles, album names, label names, tie-up works, related people, etc.)
- Pronouns or expressions that hint at the specific person (e.g. "his debut single", "her signature falsetto")
${attributeConstraints}

[Points to Emphasize]
${attributeEmphases || 'None'}

[Description Guidelines]
- Tempo, rhythm pattern, time signature
- Melodic character, chord progression mood (melancholic, energetic, bright, complex, etc.)
- Vocal style (vocal texture, technique, use of falsetto, head voice, etc. — omit if constrained above)
- Primary instruments and sound textures (acoustic guitar, distorted electric guitar, synthesizers, live strings, electronic drums, etc.)
- Lyrical themes, storytelling, and overall worldview (omit if constrained above)

Output bullet points only. No introduction, conclusion, or greeting.`
    : `あなたは音楽の専門家です。
入力された曲またはアーティストについて、その音楽的特徴や歌詞の世界観、雰囲気などを分析し、箇条書きで詳細に記述してください。

【入力された曲またはアーティスト】
${input}

【制約事項（超重要）】
記述の中から、以下の情報を完全に排除してください。
- 入力された固有名詞そのもの、およびそれに関連する固有名詞（アーティスト名、曲名、アルバム名、関連する人物名、タイアップ作品名、レコード会社名など）
- 代名詞やそれとわかる表現（例：「彼の代表曲」「彼女のデビュー作」などの性別が推測できる表現）
${attributeConstraints}

【強調・重視する事項】
${attributeEmphases || '特になし'}

【記述する特徴のガイドライン】
- テンポ、リズムパターン、拍子
- メロディの特徴、コード進行の雰囲気（哀愁漂う、エモーショナル、明るい、複雑など）
- ボーカルのスタイル（歌声の質感、歌い方、ハイトーン、ファルセットなど。ただし、制約事項で禁止されている場合は言及しないこと）
- 使用されている主な楽器やサウンドテクスチャ（アコースティックギター、歪んだエレキギター、シンセサイザー、生のストリングス、エレクトロニックドラムなど）
- 歌詞のテーマ、ストーリー性、全体的な世界観（ただし、制約事項で禁止されている場合は言及しないこと）

特徴のみを簡潔な箇条書きで出力してください。導入文や結論、あいさつは不要です。`;

  const modelConfig = { model: targetModel };
  if (useWebSearch) modelConfig.tools = [{ googleSearch: {} }];

  try {
    const generativeModel = vertexAI.getGenerativeModel(modelConfig);
    const result = await generativeModel.generateContent(prompt);
    const text = result.response.candidates[0].content.parts[0].text;
    res.json({ text });
  } catch (error) {
    console.error('Vertex AI Extract Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. LLM 2: Predict Songs From Features
app.post('/api/predict', async (req, res) => {
  const { description, recommendCount, useWebSearch, modelName, lang } = req.body;
  const targetModel = mapModelName(modelName || 'gemini-2.5-flash');
  const count = recommendCount || 5;
  const isEn = lang === 'en';

  const prompt = isEn
    ? `You are a music recommendation system.
Read the anonymized musical feature description below carefully, and recommend ${count} real existing songs (title + artist) that best match these features.

[Anonymized Feature Description]
${description}

[Instructions]
- Recommended songs must be real, verifiable tracks (indie to major, any language).
- For each recommendation, briefly explain which part of the feature description it matches and why.
- Output ONLY the JSON array below with no greeting or extra text.

[Output Format]
[
  {
    "title": "Song Title",
    "artist": "Artist Name",
    "reason": "Brief explanation of how this song matches the features (30-100 words)"
  }
]`
    : `あなたは音楽推薦システムです。
提示された「匿名化された音楽的特徴の記述」を注意深く読み、この特徴に非常によく合致する実在する音楽（曲名とアーティスト名）を【必ず実在するもの】から ${count} 個挙げてください。

【匿名化された特徴記述】
${description}

【注意事項】
- 推薦する曲は、インディーズからメジャーまで、邦楽・洋楽を問わず実在するものである必要があります。
- 各推薦項目には、その曲が特徴記述のどの部分にどのように合致しているかの説明を書いてください。
- 余計な挨拶や説明は一切省き、指定されたJSONフォーマットのみをテキストとして出力してください。

【出力フォーマット】
[
  {
    "title": "曲名",
    "artist": "アーティスト名",
    "reason": "この曲が特徴記述のどの部分にどのように合致しているかの解説（30文字〜100文字程度）"
  }
]`;

  const modelConfig = {
    model: targetModel,
    // Note: responseMimeType is not specified here because it conflicts with the Search tool.
    // Instead, we will parse the JSON from raw text output.
  };

  // Google Search Grounding config.
  if (useWebSearch) {
    modelConfig.tools = [{ googleSearch: {} }];
  }

  try {
    const generativeModel = vertexAI.getGenerativeModel(modelConfig);
    const result = await generativeModel.generateContent(prompt);
    const text = result.response.candidates[0].content.parts[0].text;
    
    // Parse the output as JSON (Robust parser)
    let parsedJson;
    let rawText = text.trim();
    
    try {
      // 1. Try standard parse
      parsedJson = JSON.parse(rawText);
    } catch (e) {
      console.log("Standard JSON parsing failed, attempting text cleaning...");
      // 2. Remove markdown code blocks if present
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      
      try {
        parsedJson = JSON.parse(rawText);
      } catch (e2) {
        console.log("Cleaned JSON parsing failed, attempting bracket extraction...");
        // 3. Extract content between first '[' and last ']'
        const startIdx = rawText.indexOf('[');
        const endIdx = rawText.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          rawText = rawText.substring(startIdx, endIdx + 1);
          try {
            parsedJson = JSON.parse(rawText);
          } catch (e3) {
            console.error("Bracket extraction parsing failed:", e3);
            throw new Error("AIの応答からJSONを抽出できませんでした。生成テキスト: " + text);
          }
        } else {
          throw new Error("AIの応答にJSONの配列が含まれていません。生成テキスト: " + text);
        }
      }
    }
    res.json(parsedJson);
  } catch (error) {
    console.error('Vertex AI Predict Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. LLM 3: Verify and Filter
app.post('/api/verify', async (req, res) => {
  const { originalInput, prediction, modelName } = req.body;
  const targetModel = mapModelName(modelName || 'gemini-2.5-flash');

  const prompt = `あなたはフィルタリングシステムです。
推薦された曲が、ユーザーが最初に入力した「元ネタ（元の曲やアーティスト）」と同一、または非常に密接に関連している（同じアーティストの別の曲など）かを判定してください。
目的は、元ネタそのものや、元ネタのアーティストの曲を「推薦から排除する」ことです。

【元ネタの入力】
"${originalInput}"

【検証対象の推薦曲】
曲名: "${prediction.title}"
アーティスト: "${prediction.artist}"

【判定基準】
1. 検証対象のアーティスト名が、元ネタのアーティスト名と同一か？ (同一なら排除)
2. 検証対象の曲名が、元ネタの曲名と同一か？ (同一なら排除)
3. 検証対象のアーティストと元ネタのアーティストが、同じグループやプロジェクトである、あるいは同じ人物の別名義か？ (同一なら排除)
4. 検証対象の曲が、元ネタの曲のカバーバージョンや別バージョンか？ (同一なら排除)

【出力フォーマット】
以下のJSONフォーマットでのみ回答してください。
{
  "isTooClose": true または false,
  "reason": "排除した理由、あるいは判定理由の説明"
}
`;

  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: targetModel,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const result = await generativeModel.generateContent(prompt);
    const text = result.response.candidates[0].content.parts[0].text;
    res.json(JSON.parse(text));
  } catch (error) {
    console.error('Vertex AI Verify Error:', error);
    // Fallback on error: let it pass but log it
    res.json({ isTooClose: false, reason: "検証エラーのため通過させました。" });
  }
});

app.listen(PORT, () => {
  console.log(`Vertex AI Proxy Server running on port ${PORT}`);
});
