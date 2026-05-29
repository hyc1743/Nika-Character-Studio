const ALLOWED_HOST_PATTERNS = [
  /(^|\.)openai\.com$/i,
  /(^|\.)deepseek\.com$/i,
  /(^|\.)googleapis\.com$/i,
  /(^|\.)siliconflow\.cn$/i,
  /(^|\.)anthropic\.com$/i,
  /(^|\.)mistral\.ai$/i,
  /(^|\.)openrouter\.ai$/i,
  /(^|\.)together\.xyz$/i
];

export function isAllowedProxyTarget(targetUrl) {
  try {
    const url = new URL(targetUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (url.pathname.includes('/sdapi/v1/')) return true;
    if (url.pathname.includes('/chat/completions')) return true;
    if (url.pathname.includes('/generateContent')) return true;
    if (url.pathname.endsWith('/models') || url.pathname.includes('/v1beta/models')) return true;
    return ALLOWED_HOST_PATTERNS.some(pattern => pattern.test(url.hostname));
  } catch {
    return false;
  }
}
