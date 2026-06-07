import React, { useState, useEffect } from 'react';
import { 
  Music, Search, Sparkles, Filter, CheckCircle, AlertCircle,
  Settings, Info, Lock, RefreshCw, Eye, EyeOff, Globe
} from 'lucide-react';
import { 
  validateApiKey, generateAnonymousDescription, 
  predictSongsFromDescription, verifyAndFilterSong
} from './geminiService';

// ─── i18n strings ──────────────────────────────────────────────
const T = {
  ja: {
    subtitle: 'あなたの好きな曲・歌手の「音楽的特徴」だけから、新たな類似曲を連想して推薦します',
    settingsTitle: 'Vertex AI 接続設定',
    settingsDesc: '本アプリは Google Cloud Vertex AI を使用して音楽推薦を行います。ローカルの認証情報（gcloud auth）を使用するため、通常 API キーの入力は不要です。',
    modelLabel: '使用する AI モデル',
    verifyBtn: '保存して検証',
    verifying: '検証中...',
    clearKey: 'キーをクリア',
    close: '閉じる',
    connectedStatus: 'Vertex AI 接続状態: 良好',
    settingsBtn: '設定',
    validationFail: 'Vertex AI への接続検証に失敗しました。',
    validationError: '接続検証中にエラーが発生しました。gcloud のログイン状態やプロジェクト権限をご確認ください。',
    inputLabel: '好きな歌手名、または曲名',
    inputPlaceholder: '例: あいみょん - マリーゴールド',
    hideTitle: '匿名化フィルター設定（隠す）',
    hideDesc: '特徴抽出時に、意図的に記述を禁止する特徴を指定します。これにより推薦がより離れたジャンルへ広がります。',
    empTitle: '特徴強調設定（強調する）',
    empDesc: '特徴抽出時に、その要素を意図的に詳しく記述させ、推薦の重要な条件として重視させます。※「隠す」と同時には選べません。',
    attrs: {
      gender:  { label: '性別・声調',  hideDesc: '男性/女性/混声などの伏せ',       empDesc: '男性/女性等の特徴を強調' },
      members: { label: '人数・構成',  hideDesc: 'ソロ/バンド/グループ等の伏せ',    empDesc: 'ソロ/バンド等の特徴を強調' },
      genre:   { label: 'ジャンル',    hideDesc: 'ロック/ポップス等の直接的表現',   empDesc: 'ジャンルや様式美を強調' },
      era:     { label: '年代・時期',  hideDesc: '90年代/昭和/最新等の伏せ',        empDesc: '年代や歴史背景を強調' },
      country: { label: '国籍・言語',  hideDesc: 'J-POP/洋楽/英語などの伏せ',      empDesc: '活動国や言語の特徴を強調' },
      lyrics:  { label: '歌詞内容',    hideDesc: '歌詞のテーマ/世界観などの伏せ',   empDesc: '歌詞のテーマや物語性を強調' },
    },
    webSearchLabel: 'Google 検索連携',
    webSearchDesc:  'Web 検索で最新・より的確な音楽特徴を参照',
    countLabel: '推薦候補数',
    startBtn: '音楽推薦を開始する',
    runningBtn: '推薦処理を実行中...',
    idleTitle: '推薦結果がここに表示されます',
    idleDesc: 'お気に入りの曲名や歌手名を入力し、左のボタンを押して推薦をスタートしてください。',
    errTitle: 'エラーが発生しました',
    step1Title: '1. 特徴抽出プロファイリング',
    step1Running: '解析中', step1Done: '完了',
    step1Spinner: '固有名詞と隠蔽属性を除去して特徴を記述中...',
    step1InfoBox: '抽出された「匿名化された特徴」です。ここには固有名詞や隠した設定は含まれません。',
    step2Title: '2. 特徴から曲の連想',
    step2Waiting: '待機中', step2Running: '連想中', step2Done: '完了',
    step2Spinner: '特徴記述から該当する実在の曲を推測中...',
    step2ResultLabel: (n) => `LLM が特徴のみから推測した実在曲候補 (${n}件):`,
    step3Title: '3. ニアミス検証 & 正解除外',
    step3Waiting: '待機中', step3Running: '検証中', step3Done: '完了',
    step3Desc: '推薦候補が元の曲・歌手（正解）と被っていないかチェックしています...',
    step4Title: '4. 最終推薦結果',
    step4Waiting: '待機中', step4Done: '完了',
    step4WaitingDesc: 'ニアミス検証がすべて終了すると、ここに最終推薦結果カードが表示されます。',
    noRecTitle: '推薦可能な曲が残りませんでした',
    noRecDesc: 'すべての推薦候補が元の曲または歌手（正解）と判定されて除外されました。もう少し異なる条件か、別の曲でお試しください。',
    recReasonLabel: '推薦理由',
    badgeChecking: '判定中', badgeRemoved: '除外', badgePassed: '通過',
    removedReason: '入力内容（正解）と文字列が一致するため除外しました。',
    passedReason: '元ネタとの類似検証をパスしました。',
    llmRemovedFallback: '元のアーティストまたは曲と判定されました。',
    footer: '© 2026 AnonMusicRec. Powered by Vertex AI & React',
    langToggle: 'English',
    errorKeyMsg: '有効な Gemini API キーを入力してください。',
    errorPipelineMsg: '推薦の処理中にエラーが発生しました。プロンプト制限やネットワークを確認してください。',
  },
  en: {
    subtitle: 'Recommend similar songs using only the musical characteristics of your favorites — no names required.',
    settingsTitle: 'Vertex AI Connection',
    settingsDesc: 'This app uses Google Cloud Vertex AI for music recommendations. Local credentials (gcloud auth) are used, so no API key is required.',
    modelLabel: 'AI Model',
    verifyBtn: 'Save & Verify',
    verifying: 'Verifying...',
    clearKey: 'Clear Key',
    close: 'Close',
    connectedStatus: 'Vertex AI: Connected',
    settingsBtn: 'Settings',
    validationFail: 'Failed to verify connection to Vertex AI.',
    validationError: 'Connection error. Please check your gcloud login status and project permissions.',
    inputLabel: 'Favorite artist or song title',
    inputPlaceholder: 'e.g. Radiohead - Creep',
    hideTitle: 'Anonymize Filters (Hide)',
    hideDesc: 'Suppress specific attributes from the feature description, pushing recommendations toward more distant styles.',
    empTitle: 'Emphasis Settings (Emphasize)',
    empDesc: 'Force the AI to describe specific attributes in detail to prioritize them in recommendations. Cannot be combined with "Hide".',
    attrs: {
      gender:  { label: 'Gender / Timbre', hideDesc: 'Hide male/female/mixed vocal info',    empDesc: 'Emphasize vocal gender & timbre' },
      members: { label: 'Members / Format', hideDesc: 'Hide solo/band/group info',            empDesc: 'Emphasize group format' },
      genre:   { label: 'Genre',            hideDesc: 'Hide genre names',                     empDesc: 'Emphasize genre & style' },
      era:     { label: 'Era / Period',     hideDesc: 'Hide decade/era references',           empDesc: 'Emphasize era & time period' },
      country: { label: 'Country / Language', hideDesc: 'Hide nationality & language',       empDesc: 'Emphasize country & language' },
      lyrics:  { label: 'Lyrics Content',   hideDesc: 'Hide lyrical themes & storytelling',  empDesc: 'Emphasize lyrical themes & narrative' },
    },
    webSearchLabel: 'Google Search Integration',
    webSearchDesc:  'Use web search for up-to-date, more accurate music features',
    countLabel: 'Recommendation Count',
    startBtn: 'Start Music Recommendations',
    runningBtn: 'Processing...',
    idleTitle: 'Results will appear here',
    idleDesc: 'Enter your favorite artist or song title and click the button to start.',
    errTitle: 'An error occurred',
    step1Title: '1. Feature Profiling',
    step1Running: 'Analyzing', step1Done: 'Done',
    step1Spinner: 'Extracting anonymized musical features...',
    step1InfoBox: 'These are the anonymized musical features. No artist/song names or hidden attributes are included.',
    step2Title: '2. Song Association',
    step2Waiting: 'Waiting', step2Running: 'Associating', step2Done: 'Done',
    step2Spinner: 'Finding real songs that match the feature description...',
    step2ResultLabel: (n) => `AI guessed ${n} real songs from the features alone:`,
    step3Title: '3. Near-Miss Filtering',
    step3Waiting: 'Waiting', step3Running: 'Filtering', step3Done: 'Done',
    step3Desc: 'Checking whether any candidates match the original input...',
    step4Title: '4. Final Recommendations',
    step4Waiting: 'Waiting', step4Done: 'Done',
    step4WaitingDesc: 'Final results will appear here once filtering is complete.',
    noRecTitle: 'No recommendations remaining',
    noRecDesc: 'All candidates were filtered out as too similar to the original. Try different settings or a different song.',
    recReasonLabel: 'Why recommended',
    badgeChecking: 'Checking', badgeRemoved: 'Excluded', badgePassed: 'Passed',
    removedReason: 'String match with input (correct answer) — excluded.',
    passedReason: 'Passed near-miss verification.',
    llmRemovedFallback: 'Identified as same artist or song.',
    footer: '© 2026 AnonMusicRec. Powered by Vertex AI & React',
    langToggle: '日本語',
    errorKeyMsg: 'Please enter a valid Gemini API key.',
    errorPipelineMsg: 'An error occurred during processing. Check prompt limits and network.',
  }
};

// Attribute keys (order used to render checkboxes)
const ATTR_KEYS = ['gender', 'members', 'genre', 'era', 'country', 'lyrics'];

function App() {
  const [lang, setLang] = useState('ja');
  const t = T[lang];

  // --- Settings ---
  const [apiKey, setApiKey] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [showSettings, setShowSettings] = useState(false);

  const [musicInput, setMusicInput] = useState('');

  // --- Filters (hide = anonymize) ---
  const [filters, setFilters] = useState({
    hideGender: true, hideMembers: true, hideGenre: false,
    hideEra: true, hideCountry: false, hideLyrics: false,
  });

  // --- Emphasize ---
  const [emphasize, setEmphasize] = useState({
    empGender: false, empMembers: false, empGenre: false,
    empEra: false, empCountry: false, empLyrics: false,
  });

  const [useWebSearch, setUseWebSearch] = useState(true);
  const [recommendCount, setRecommendCount] = useState(5);

  // --- Pipeline ---
  const [pipelineStatus, setPipelineStatus] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedFeatures, setExtractedFeatures] = useState('');
  const [rawPredictions, setRawPredictions] = useState([]);
  const [filteringList, setFilteringList] = useState([]);

  // Init
  useEffect(() => {
    const savedKey = localStorage.getItem('anon_music_api_key');
    const savedModel = localStorage.getItem('anon_music_model');
    const savedLang = localStorage.getItem('anon_music_lang');
    if (savedModel) setSelectedModel(savedModel);
    if (savedLang) setLang(savedLang);
    setApiKey(savedKey || 'vertex-ai-mode');
    setIsKeyValid(true);
  }, []);

  // Persist lang
  const switchLang = () => {
    const next = lang === 'ja' ? 'en' : 'ja';
    setLang(next);
    localStorage.setItem('anon_music_lang', next);
  };

  // Verify connection
  const handleSaveApiKey = async () => {
    setIsValidating(true);
    setValidationError('');
    try {
      const key = apiKey.trim() || 'vertex-ai-mode';
      const isValid = await validateApiKey(key, selectedModel);
      setIsValidating(false);
      setIsKeyValid(isValid);
      if (isValid) {
        localStorage.setItem('anon_music_api_key', key);
        localStorage.setItem('anon_music_model', selectedModel);
        setShowSettings(false);
      } else {
        localStorage.removeItem('anon_music_api_key');
        setValidationError(t.validationFail);
      }
    } catch (err) {
      setIsValidating(false);
      setIsKeyValid(false);
      localStorage.removeItem('anon_music_api_key');
      setValidationError(err.message || t.validationError);
    }
  };

  // Toggle helpers — mutually exclusive between hide & emphasize
  const toggleFilter = (key) => {
    setFilters(prev => {
      const next = !prev[key];
      if (next) {
        const empKey = 'emp' + key.substring(4); // hideGender -> empGender
        setEmphasize(e => ({ ...e, [empKey]: false }));
      }
      return { ...prev, [key]: next };
    });
  };

  const toggleEmphasize = (key) => {
    setEmphasize(prev => {
      const next = !prev[key];
      if (next) {
        const hideKey = 'hide' + key.substring(3); // empGender -> hideGender
        setFilters(f => ({ ...f, [hideKey]: false }));
      }
      return { ...prev, [key]: next };
    });
  };

  // Main pipeline
  const runRecommendation = async (e) => {
    e.preventDefault();
    if (!musicInput.trim()) return;

    setPipelineStatus('running');
    setCurrentStep(1);
    setErrorMsg('');
    setExtractedFeatures('');
    setRawPredictions([]);
    setFilteringList([]);

    try {
      // Step 1: Feature extraction
      const features = await generateAnonymousDescription(apiKey, musicInput, {
        ...filters, emphasize, useWebSearch, modelName: selectedModel, lang,
      });
      setExtractedFeatures(features);
      setCurrentStep(2);

      // Step 2: Song prediction
      const predictions = await predictSongsFromDescription(apiKey, features, {
        recommendCount, useWebSearch, modelName: selectedModel, lang,
      });
      setRawPredictions(predictions);

      const initialList = predictions.map((song, i) => ({
        ...song, id: i, status: 'checking', filterReason: '',
      }));
      setFilteringList(initialList);
      setCurrentStep(3);

      // Step 3: Filtering
      const cleanInput = musicInput.toLowerCase().replace(/\s+/g, '');
      for (let i = 0; i < initialList.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        const song = initialList[i];
        const titleClean = song.title.toLowerCase().replace(/\s+/g, '');
        const artistClean = song.artist.toLowerCase().replace(/\s+/g, '');

        let isRemoved = false, reason = '';
        if (cleanInput.includes(titleClean) || titleClean.includes(cleanInput) ||
            cleanInput.includes(artistClean) || artistClean.includes(cleanInput)) {
          isRemoved = true;
          reason = t.removedReason;
        } else {
          try {
            const v = await verifyAndFilterSong(apiKey, musicInput, song, selectedModel);
            if (v.isTooClose) { isRemoved = true; reason = v.reason || t.llmRemovedFallback; }
          } catch (err) { /* fall through */ }
        }

        setFilteringList(prev => prev.map(item =>
          item.id === song.id
            ? { ...item, status: isRemoved ? 'removed' : 'passed', filterReason: reason || t.passedReason }
            : item
        ));
      }

      setCurrentStep(4);
      setPipelineStatus('completed');
    } catch (err) {
      setErrorMsg(err.message || t.errorPipelineMsg);
      setPipelineStatus('error');
    }
  };

  const renderFeatures = (raw) => {
    if (!raw) return null;
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
      .map(l => l.replace(/^[\s*\-•✦+]+/, '').trim());
    return (
      <ul className="feature-list">
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    );
  };

  const finalRecs = filteringList.filter(i => i.status === 'passed');

  // Checkbox row renderer
  const FilterRow = ({ attrKey, isHide }) => {
    const stateKey = isHide ? `hide${attrKey.charAt(0).toUpperCase() + attrKey.slice(1)}`
                            : `emp${attrKey.charAt(0).toUpperCase() + attrKey.slice(1)}`;
    const active = isHide ? filters[stateKey] : emphasize[stateKey];
    const info = t.attrs[attrKey];
    return (
      <div
        className={`checkbox-label ${active ? 'active' : ''}`}
        onClick={() => pipelineStatus !== 'running' && (isHide ? toggleFilter(stateKey) : toggleEmphasize(stateKey))}
        style={active && !isHide ? { borderColor: 'var(--color-accent)', background: 'rgba(255,0,122,0.05)' } : {}}
      >
        <div className="checkbox-custom" style={active && !isHide ? { borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent)' } : {}}>
          {active && <CheckCircle size={12} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{info.label}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {isHide ? info.hideDesc : info.empDesc}
          </span>
        </div>
      </div>
    );
  };

  const selectStyle = {
    width: '100%', padding: '0.8rem 1rem',
    backgroundColor: 'var(--bg-input)', border: '1.5px solid var(--border-color)',
    borderRadius: '12px', color: 'white', fontFamily: 'var(--font-sans)',
    fontSize: '0.95rem', outline: 'none', cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em',
  };

  return (
    <>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="logo-container">
            <div className="logo-icon"><Music size={26} /></div>
            <h1>AnonMusicRec</h1>
          </div>
          <button
            onClick={switchLang}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem' }}
          >
            <Globe size={14} />
            {t.langToggle}
          </button>
        </div>
        <p className="subtitle">{t.subtitle}</p>
      </header>

      {/* Settings panel */}
      {showSettings ? (
        <div className="glass-panel" style={{ marginBottom: '2rem' }}>
          <div className="options-title" style={{ justifyContent: 'space-between', border: 'none', marginBottom: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} className="accent-text" />
              {t.settingsTitle}
            </span>
            {isKeyValid && <button className="btn-secondary" onClick={() => setShowSettings(false)}>{t.close}</button>}
          </div>
          <p className="toggle-desc" style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>{t.settingsDesc}</p>
          {/* Hidden key input for vertex-ai mode */}
          <div style={{ display: 'none' }}>
            <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="modelSelect">{t.modelLabel}</label>
            <select id="modelSelect" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={selectStyle}>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash {lang === 'ja' ? '(推奨・最新)' : '(Recommended)'}</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro {lang === 'ja' ? '(高性能)' : '(High Capability)'}</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary" onClick={handleSaveApiKey} disabled={isValidating}
              style={{ width: 'auto', padding: '0.7rem 1.5rem' }}
            >
              {isValidating ? (<><div className="spinner" style={{ width: '16px', height: '16px' }} />{t.verifying}</>) : t.verifyBtn}
            </button>
          </div>
          {isKeyValid === false && (
            <div className="error-box" style={{ marginTop: '1rem', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{t.validationFail}</span>
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#ffb3d1', lineHeight: '1.4' }}>{validationError}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="api-key-banner">
          <div className="api-key-status">
            <div className={`api-key-indicator ${isKeyValid ? 'valid' : 'invalid'}`} />
            <span>{t.connectedStatus}</span>
          </div>
          <button className="btn-secondary" onClick={() => setShowSettings(true)}>
            <Settings size={14} style={{ marginRight: '0.4rem' }} />{t.settingsBtn}
          </button>
        </div>
      )}

      {/* Main grid */}
      <div className="app-grid">
        {/* Left: Config */}
        <section className="glass-panel">
          <form onSubmit={runRecommendation}>
            <div className="form-group">
              <label htmlFor="musicInput">{t.inputLabel}</label>
              <div className="input-wrapper">
                <Search className="input-icon" size={18} />
                <input
                  id="musicInput" type="text" placeholder={t.inputPlaceholder}
                  value={musicInput} onChange={e => setMusicInput(e.target.value)}
                  disabled={pipelineStatus === 'running'} required
                />
              </div>
            </div>

            {/* Hide filters */}
            <div className="options-title">
              <Filter size={18} className="accent-text" />
              {t.hideTitle}
            </div>
            <p className="toggle-desc" style={{ marginBottom: '1rem' }}>{t.hideDesc}</p>
            <div className="checkbox-grid">
              {ATTR_KEYS.map(k => <FilterRow key={`hide-${k}`} attrKey={k} isHide={true} />)}
            </div>

            {/* Emphasize */}
            <div className="options-title" style={{ marginTop: '1.5rem' }}>
              <Sparkles size={18} className="accent-text" />
              {t.empTitle}
            </div>
            <p className="toggle-desc" style={{ marginBottom: '1rem' }}>{t.empDesc}</p>
            <div className="checkbox-grid" style={{ marginBottom: '1.5rem' }}>
              {ATTR_KEYS.map(k => <FilterRow key={`emp-${k}`} attrKey={k} isHide={false} />)}
            </div>

            {/* Web search toggle */}
            <div className="toggle-group">
              <div className="toggle-info">
                <span className="toggle-label">{t.webSearchLabel}</span>
                <span className="toggle-desc">{t.webSearchDesc}</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox" checked={useWebSearch}
                  onChange={() => pipelineStatus !== 'running' && setUseWebSearch(!useWebSearch)}
                  disabled={pipelineStatus === 'running'}
                />
                <span className="slider" />
              </label>
            </div>

            {/* Count slider */}
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.countLabel}</span>
                <span className="accent-text" style={{ fontWeight: 'bold' }}>{recommendCount}</span>
              </label>
              <input
                type="range" min="3" max="8" value={recommendCount}
                onChange={e => setRecommendCount(parseInt(e.target.value))}
                disabled={pipelineStatus === 'running'}
                style={{ width: '100%', accentColor: 'var(--color-secondary)', cursor: 'pointer', marginTop: '0.5rem' }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={pipelineStatus === 'running' || !musicInput.trim()}>
              {pipelineStatus === 'running' ? (
                <><RefreshCw size={18} className="spinner" style={{ animationDuration: '2s' }} />{t.runningBtn}</>
              ) : (
                <><Sparkles size={18} />{t.startBtn}</>
              )}
            </button>
          </form>
        </section>

        {/* Right: Pipeline / Results */}
        <section className="glass-panel" style={{ minHeight: '400px' }}>
          {pipelineStatus === 'idle' && (
            <div className="no-results">
              <Music size={48} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
              <h3>{t.idleTitle}</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t.idleDesc}</p>
            </div>
          )}

          {pipelineStatus === 'error' && (
            <div className="error-box">
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{t.errTitle}</h4>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {(pipelineStatus === 'running' || pipelineStatus === 'completed') && (
            <div className="timeline-container">
              <div className="timeline">

                {/* Step 1 */}
                <div className={`timeline-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                  <div className="timeline-badge" />
                  <div className="timeline-header">
                    <div className={`timeline-title ${currentStep === 1 ? 'active' : ''}`}><span>{t.step1Title}</span></div>
                    <span className="timeline-status">{currentStep === 1 ? t.step1Running : t.step1Done}</span>
                  </div>
                  <div className="timeline-content">
                    {currentStep === 1 && <div className="spinner-container"><div className="spinner" /><span>{t.step1Spinner}</span></div>}
                    {currentStep > 1 && extractedFeatures && (
                      <div>
                        <div className="info-box" style={{ padding: '0.6rem 0.8rem', marginBottom: '0.8rem' }}>
                          <Info size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                          <span>{t.step1InfoBox}</span>
                        </div>
                        {renderFeatures(extractedFeatures)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className={`timeline-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
                  <div className="timeline-badge" />
                  <div className="timeline-header">
                    <div className={`timeline-title ${currentStep === 2 ? 'active' : ''}`}><span>{t.step2Title}</span></div>
                    <span className="timeline-status">{currentStep < 2 ? t.step2Waiting : currentStep === 2 ? t.step2Running : t.step2Done}</span>
                  </div>
                  <div className="timeline-content">
                    {currentStep < 2 && <span style={{ color: 'var(--text-muted)' }}>{t.step2Waiting}...</span>}
                    {currentStep === 2 && <div className="spinner-container"><div className="spinner" /><span>{t.step2Spinner}</span></div>}
                    {currentStep > 2 && rawPredictions.length > 0 && (
                      <div>
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>{t.step2ResultLabel(rawPredictions.length)}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {rawPredictions.map((s, i) => (
                            <span key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                              🎵 {s.title} / {s.artist}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className={`timeline-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
                  <div className="timeline-badge" />
                  <div className="timeline-header">
                    <div className={`timeline-title ${currentStep === 3 ? 'active' : ''}`}><span>{t.step3Title}</span></div>
                    <span className="timeline-status">{currentStep < 3 ? t.step3Waiting : currentStep === 3 ? t.step3Running : t.step3Done}</span>
                  </div>
                  <div className="timeline-content">
                    {currentStep < 3 && <span style={{ color: 'var(--text-muted)' }}>{t.step3Waiting}...</span>}
                    {currentStep >= 3 && filteringList.length > 0 && (
                      <div className="predict-item-container">
                        <p style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>{t.step3Desc}</p>
                        {filteringList.map(song => (
                          <div key={song.id} className={`predict-item ${song.status}`}>
                            <div className="song-info">
                              <span className="song-title">{song.title}</span>
                              <span className="song-artist">{song.artist}</span>
                              {song.filterReason && (
                                <span style={{ fontSize: '0.75rem', color: song.status === 'removed' ? 'var(--color-accent)' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                                  💡 {song.filterReason}
                                </span>
                              )}
                            </div>
                            <span className={`filter-badge ${song.status}`}>
                              {song.status === 'checking' ? t.badgeChecking : song.status === 'removed' ? t.badgeRemoved : t.badgePassed}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4 */}
                <div className={`timeline-item ${currentStep === 4 ? 'completed' : ''}`}>
                  <div className="timeline-badge" />
                  <div className="timeline-header">
                    <div className={`timeline-title ${currentStep === 4 ? 'active' : ''}`}><span>{t.step4Title}</span></div>
                    <span className="timeline-status">{currentStep < 4 ? t.step4Waiting : t.step4Done}</span>
                  </div>
                  <div className="timeline-content" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                    {currentStep < 4 && <span style={{ color: 'var(--text-muted)' }}>{t.step4WaitingDesc}</span>}
                    {currentStep === 4 && (
                      finalRecs.length > 0 ? (
                        <div className="rec-cards-container">
                          {finalRecs.map((rec, idx) => (
                            <div key={idx} className="rec-card">
                              <div className="rec-header">
                                <div className="rec-meta">
                                  <div className="rec-index">{idx + 1}</div>
                                  <div className="rec-music-details">
                                    <span className="rec-title">{rec.title}</span>
                                    <span className="rec-artist">{rec.artist}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="rec-reason-title">
                                  <Sparkles size={12} className="accent-text" />
                                  {t.recReasonLabel}
                                </div>
                                <p className="rec-reason">{rec.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-results" style={{ padding: '2rem' }}>
                          <AlertCircle size={36} style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} />
                          <h3>{t.noRecTitle}</h3>
                          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t.noRecDesc}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>
      </div>

      <footer><p>{t.footer}</p></footer>
    </>
  );
}

export default App;
