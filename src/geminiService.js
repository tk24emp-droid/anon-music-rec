/**
 * Vertex AI / OpenAI Proxy Service Client
 * Redirects frontend API calls to local Node.js Express server which interfaces with AI SDKs.
 */

/**
 * Validates the connection to the AI provider.
 */
export async function validateApiKey(provider, apiKey, modelName = "gemini-2.5-flash") {
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ provider, apiKey, modelName })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || '接続検証に失敗しました。認証情報をご確認ください。');
  }

  const data = await response.json();
  return data.success;
}

/**
 * LLM 1: Generates an anonymous feature description.
 */
export async function generateAnonymousDescription(apiKey, input, options) {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider: options.provider,
      apiKey: apiKey,
      input,
      filters: {
        hideGender: options.hideGender,
        hideMembers: options.hideMembers,
        hideGenre: options.hideGenre,
        hideEra: options.hideEra,
        hideCountry: options.hideCountry,
        hideLyrics: options.hideLyrics
      },
      emphasize: options.emphasize,
      useWebSearch: options.useWebSearch,
      modelName: options.modelName,
      lang: options.lang
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || '特徴抽出の処理に失敗しました。');
  }

  const data = await response.json();
  return data.text;
}

/**
 * LLM 2: Predicts songs or artists based on the anonymous description.
 */
export async function predictSongsFromDescription(apiKey, description, options) {
  const response = await fetch('/api/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider: options.provider,
      apiKey: apiKey,
      description,
      recommendCount: options.recommendCount,
      useWebSearch: options.useWebSearch,
      modelName: options.modelName,
      lang: options.lang
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || '類似曲連想の処理に失敗しました。');
  }

  return await response.json();
}

/**
 * LLM 3: Double checks if the predicted song is too close or same as the original input.
 */
export async function verifyAndFilterSong(provider, apiKey, originalInput, prediction, modelName = "gemini-2.5-flash") {
  const response = await fetch('/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider,
      apiKey,
      originalInput,
      prediction,
      modelName
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'ニアミス検証の処理に失敗しました。');
  }

  return await response.json();
}
