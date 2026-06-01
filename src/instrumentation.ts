export async function register() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (proxyUrl && process.env.NEXT_RUNTIME === 'nodejs') {
    const { ProxyAgent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log(`[Proxy] All requests routed through ${proxyUrl}`);
  }
}
