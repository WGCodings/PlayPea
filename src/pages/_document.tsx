import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <meta
          name="description"
          content="Play and analyse against every version of the Pea chess engine, right in your browser."
        />

        {/* OG (Social networks) */}
        <meta property="og:title" content="PlayPea" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PlayPea" />
        <meta property="og:url" content="https://playpea.wgcodings.com/" />
        <meta
          property="og:image"
          content="https://playpea.wgcodings.com/social-networks-1200x630.png"
        />
        <meta
          property="og:description"
          content="Play and analyse against every version of the Pea chess engine, right in your browser."
        />

        {/* Twitter */}
        <meta name="twitter:title" content="PlayPea" />
        <meta name="twitter:domain" content="playpea.wgcodings.com" />
        <meta name="twitter:url" content="https://playpea.wgcodings.com/" />
        <meta
          name="twitter:description"
          content="Play and analyse against every version of the Pea chess engine, right in your browser."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:image"
          content="https://playpea.wgcodings.com/social-networks-1200x630.png"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
