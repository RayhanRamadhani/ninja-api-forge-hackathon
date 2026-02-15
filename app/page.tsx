import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>🥷 Ninja API Forge</h1>
          <p className={styles.subtitle}>
            Real-time market insights and analytics for Injective Protocol spot markets
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>TypeScript</span>
            <span className={styles.badge}>Next.js 15</span>
            <span className={styles.badge}>Injective Protocol</span>
          </div>
        </div>

        <div className={styles.endpoints}>
          <h2>📡 API Endpoints</h2>
          
          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={styles.method}>GET</span>
              <code className={styles.path}>/api/top-movers</code>
            </div>
            <p className={styles.endpointDesc}>
              Top 5 gaining and losing markets based on 24h price changes
            </p>
            <a 
              href="/api/top-movers" 
              target="_blank"
              className={styles.tryIt}
            >
              Try it →
            </a>
          </div>

          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={styles.method}>GET</span>
              <code className={styles.path}>/api/markets/:symbol/insight</code>
            </div>
            <p className={styles.endpointDesc}>
              Real-time orderbook analysis: spread, buy/sell pressure
            </p>
            <a 
              href="/api/markets/0x2be72879bb90ec8cbbd7510d0eed6a727f6c2690ce7f1397982453d552f9fe8f/insight" 
              target="_blank"
              className={styles.tryIt}
            >
              Try it →
            </a>
          </div>
        </div>

        <div className={styles.quickstart}>
          <h2>🚀 Quick Start</h2>
          <div className={styles.codeBlock}>
            <pre><code>{`// JavaScript/TypeScript
const response = await fetch(
  'https://ninja-api-forge-hackathon.vercel.app/api/top-movers'
);
const data = await response.json();
console.log(data.topGainers);

// Python
import requests
response = requests.get(
  'https://ninja-api-forge-hackathon.vercel.app/api/top-movers'
)
print(response.json())`}</code></pre>
          </div>
        </div>

        <div className={styles.features}>
          <h2>✨ Features</h2>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <h3>⚡ Smart Caching</h3>
              <p>Multi-layer caching reduces API calls by 90%</p>
            </div>
            <div className={styles.feature}>
              <h3>🔒 Type Safe</h3>
              <p>Full TypeScript with comprehensive validation</p>
            </div>
            <div className={styles.feature}>
              <h3>🛡️ Secure</h3>
              <p>Input sanitization & XSS protection</p>
            </div>
            <div className={styles.feature}>
              <h3>📊 Real-time</h3>
              <p>Live orderbook data from Injective</p>
            </div>
          </div>
        </div>

        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="https://github.com/RayhanRamadhani/ninja-api-forge-hackathon/"
            target="_blank"
            rel="noopener noreferrer"
          >
            📖 Documentation
          </a>
          <a
            className={styles.secondary}
            href="https://github.com/RayhanRamadhani/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ⭐ GitHub
          </a>
        </div>
      </main>
    </div>
  );
}
