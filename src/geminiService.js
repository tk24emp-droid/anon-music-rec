/**
 * Vertex AI Proxy Service Client
 * Redirects frontend API calls to local Node.js Express server which interfaces with Google Cloud Vertex AI SDK.
 */

/**
 * Validates the connection to Vertex AI via proxy.
 * Key argument is kept to match existing App.jsx state but is not used directly.
 */
export async function validateApiKey(apiKey, modelName = "gemini-2.5-flash") {
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ modelName })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Vertex AIの接続検証に失敗しました。gcloud auth login/gcloud auth application-default login が成功しているかご確認ください。');
  }

  const data = await response.json();
  return data.success;
}

/**
 * LLM 1: Generates an anonymous feature description using Vertex AI.
 */
export async function generateAnonymousDescription(apiKey, input, options) {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
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
export async function verifyAndFilterSong(apiKey, originalInput, prediction, modelName = "gemini-2.5-flash") {
  const response = await fetch('/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
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
