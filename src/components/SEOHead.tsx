import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = "https://petid.lovable.app";
const DEFAULT_IMAGE = `${BASE_URL}/pwa-512x512.png`;
const SITE_NAME = "PetID";
const DEFAULT_TITLE = "PetID — האפליקציה לחיים עם חיית המחמד שלך";
const DEFAULT_DESC = "PetID — ניהול, טיפול, קהילה וחנות לחיות מחמד 🐶✨ שמרו רגעים, עקבו אחר בריאות, קבלו תזכורות וגלו מוצרים מותאמים.";

export const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  path = "",
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const canonicalUrl = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="he_IL" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify({ "@context": "https://schema.org", ...jsonLd })}
        </script>
      )}
    </Helmet>
  );
};
