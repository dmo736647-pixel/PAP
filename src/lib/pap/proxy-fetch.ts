import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';

let proxyAgent: https.Agent | undefined;
let initialized = false;

function getProxyAgent(): https.Agent | undefined {
  if (!initialized) {
    initialized = true;
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxyUrl) {
      proxyAgent = new HttpsProxyAgent(proxyUrl);
      console.log(`[proxy-fetch] Using proxy: ${proxyUrl}`);
    } else {
      console.log('[proxy-fetch] No proxy configured, using direct connection');
    }
  }
  return proxyAgent;
}

export async function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  const agent = getProxyAgent();

  if (!agent) {
    return fetch(url, init);
  }

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
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
    }, (res) => {
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
}
