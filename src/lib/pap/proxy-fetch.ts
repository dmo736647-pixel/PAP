const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

// Only load proxy agent when explicitly configured (e.g., local dev behind Clash)
let proxyFetchFn: typeof fetch | null = null;

function getProxyFetch(): typeof fetch {
  if (proxyFetchFn) return proxyFetchFn;

  if (!proxyUrl) {
    // No proxy — use native fetch directly
    proxyFetchFn = fetch;
    return proxyFetchFn;
  }

  // Lazy-load proxy agent only when needed
  try {
    const https = require('node:https') as typeof import('node:https');
    const { HttpsProxyAgent } = require('https-proxy-agent') as typeof import('https-proxy-agent');
    const agent = new HttpsProxyAgent(proxyUrl);

    proxyFetchFn = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      const parsedUrl = new URL(urlString);

      return new Promise((resolve, reject) => {
        const method = init?.method ?? 'GET';
        const headers: Record<string, string> = {};

        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((value, key) => { headers[key] = value; });
          } else if (Array.isArray(init.headers)) {
            for (const [key, value] of init.headers) {
              headers[key] = value;
            }
          } else {
            Object.assign(headers, init.headers);
          }
        }

        const req = https.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method,
          agent,
          headers,
        }, (res: import('node:http').IncomingMessage) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const responseHeaders = new Headers();
            for (const [key, value] of Object.entries(res.headers)) {
              if (value) {
                responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
              }
            }
            resolve(new Response(body, {
              status: res.statusCode ?? 500,
              statusText: res.statusMessage ?? '',
              headers: responseHeaders,
            }));
          });
          res.on('error', reject);
        });

        req.on('error', reject);
        req.setTimeout(30_000, () => {
          req.destroy(new Error('Request timeout'));
        });

        if (init?.body) {
          const body = typeof init.body === 'string' ? init.body : String(init.body);
          req.write(body);
        }

        req.end();
      });
    };

    console.log(`[proxy-fetch] Using proxy: ${proxyUrl}`);
    return proxyFetchFn;
  } catch (error) {
    console.warn('[proxy-fetch] Failed to load proxy agent, falling back to native fetch', error);
    proxyFetchFn = fetch;
    return proxyFetchFn;
  }
}

export async function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  const fetcher = getProxyFetch();
  return fetcher(url, init);
}
