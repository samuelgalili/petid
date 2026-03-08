/**
 * SEO Component - Dynamic meta tags for all pages
 * Handles OG tags, Twitter cards, and structured data
 */

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  noIndex?: boolean;
  // Product specific
  price?: number;
  currency?: string;
  availability?: 'in_stock' | 'out_of_stock';
  // Article specific
  publishedTime?: string;
  author?: string;
}

const BASE_URL = 'https://petid.lovable.app';
const DEFAULT_IMAGE = 'https://petid.lovable.app/pwa-512x512.png';
const SITE_NAME = 'PetID';
const DEFAULT_DESCRIPTION = 'PetID — האפליקציה לחיים עם חיית המחמד שלך 🐶✨ ניהול בריאות, תזונה מותאמת, קהילה וחנות חכמה.';

export const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
  price,
  currency = 'ILS',
  availability,
  publishedTime,
  author,
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — האפליקציה לחיים עם חיית המחמד שלך`;
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (property: string, content: string, isName = false) => {
      const attribute = isName ? 'name' : 'property';
      let element = document.querySelector(`meta[${attribute}="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    setMeta('description', description, true);
    if (noIndex) {
      setMeta('robots', 'noindex, nofollow', true);
    } else {
      setMeta('robots', 'index, follow', true);
    }

    // Open Graph tags
    setMeta('og:title', fullTitle);
    setMeta('og:description', description);
    setMeta('og:image', fullImage);
    setMeta('og:url', fullUrl);
    setMeta('og:type', type);
    setMeta('og:site_name', SITE_NAME);
    setMeta('og:locale', 'he_IL');

    // Twitter Card tags
    setMeta('twitter:card', 'summary_large_image', true);
    setMeta('twitter:title', fullTitle, true);
    setMeta('twitter:description', description, true);
    setMeta('twitter:image', fullImage, true);

    // Product specific meta
    if (type === 'product' && price !== undefined) {
      setMeta('product:price:amount', price.toString());
      setMeta('product:price:currency', currency);
      if (availability) {
        setMeta('product:availability', availability);
      }
    }

    // Article specific meta
    if (type === 'article') {
      if (publishedTime) {
        setMeta('article:published_time', publishedTime);
      }
      if (author) {
        setMeta('article:author', author);
      }
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Cleanup function
    return () => {
      // Reset title when component unmounts
      document.title = `${SITE_NAME} — האפליקציה לחיים עם חיית המחמד שלך`;
    };
  }, [fullTitle, description, fullImage, fullUrl, type, noIndex, price, currency, availability, publishedTime, author]);

  // Also render JSON-LD structured data
  const structuredData = getStructuredData({
    type,
    title: fullTitle,
    description,
    image: fullImage,
    url: fullUrl,
    price,
    currency,
    availability,
    publishedTime,
    author,
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

// Generate JSON-LD structured data based on page type
function getStructuredData(props: {
  type: string;
  title: string;
  description: string;
  image: string;
  url: string;
  price?: number;
  currency?: string;
  availability?: string;
  publishedTime?: string;
  author?: string;
}) {
  const baseData = {
    '@context': 'https://schema.org',
  };

  switch (props.type) {
    case 'product':
      return {
        ...baseData,
        '@type': 'Product',
        name: props.title,
        description: props.description,
        image: props.image,
        url: props.url,
        ...(props.price && {
          offers: {
            '@type': 'Offer',
            price: props.price,
            priceCurrency: props.currency || 'ILS',
            availability: props.availability === 'in_stock' 
              ? 'https://schema.org/InStock' 
              : 'https://schema.org/OutOfStock',
          },
        }),
      };

    case 'article':
      return {
        ...baseData,
        '@type': 'Article',
        headline: props.title,
        description: props.description,
        image: props.image,
        url: props.url,
        datePublished: props.publishedTime,
        author: {
          '@type': 'Person',
          name: props.author || 'PetID',
        },
        publisher: {
          '@type': 'Organization',
          name: 'PetID',
          logo: {
            '@type': 'ImageObject',
            url: 'https://petid.lovable.app/pwa-512x512.png',
          },
        },
      };

    case 'profile':
      return {
        ...baseData,
        '@type': 'ProfilePage',
        name: props.title,
        description: props.description,
        image: props.image,
        url: props.url,
      };

    default:
      return {
        ...baseData,
        '@type': 'WebPage',
        name: props.title,
        description: props.description,
        image: props.image,
        url: props.url,
        isPartOf: {
          '@type': 'WebSite',
          name: 'PetID',
          url: 'https://petid.lovable.app',
        },
      };
  }
}

// Export SEO configuration for each major route
export const SEO_CONFIG: Record<string, SEOProps> = {
  '/': {
    title: 'בית',
    description: 'נהלו את חיית המחמד שלכם בקלות — ביטוח, טיפוח, תזונה, קהילה וחנות',
    url: '/',
  },
  '/feed': {
    title: 'פיד',
    description: 'גלו תוכן מעניין מקהילת בעלי חיות המחמד בישראל',
    url: '/feed',
  },
  '/shop': {
    title: 'חנות',
    description: 'מוצרים איכותיים לחיות מחמד במחירים משתלמים — מזון, צעצועים, ציוד ועוד',
    url: '/shop',
  },
  '/explore': {
    title: 'גילוי',
    description: 'גלו עסקים, שירותים ומקומות ידידותיים לחיות מחמד באזור שלכם',
    url: '/explore',
  },
  '/businesses': {
    title: 'עסקים',
    description: 'מצאו וטרינרים, מאלפים, מספרות כלבים ועוד שירותים לחיות מחמד',
    url: '/businesses',
  },
  '/breeds': {
    title: 'אנציקלופדיית גזעים',
    description: 'מידע מקיף על גזעי כלבים וחתולים — תכונות, בריאות, תזונה והתאמה',
    url: '/breeds',
  },
  '/breed-quiz': {
    title: 'שאלון התאמת גזע',
    description: 'גלו איזה גזע כלב או חתול מתאים לכם בעזרת שאלון חכם',
    url: '/breed-quiz',
  },
  '/breed-detect': {
    title: 'זיהוי גזע',
    description: 'העלו תמונה וגלו את הגזע של חיית המחמד שלכם באמצעות AI',
    url: '/breed-detect',
  },
  '/reels': {
    title: 'Reels',
    description: 'סרטונים קצרים ומשעשעים של חיות מחמד מהקהילה',
    url: '/reels',
  },
  '/live': {
    title: 'שידורים חיים',
    description: 'צפו בשידורים חיים של חיות מחמד ושדרו בעצמכם',
    url: '/live',
  },
  '/experiences': {
    title: 'חוויות',
    description: 'חוויות ופעילויות לבעלי חיות מחמד — טיולים, אירועים ועוד',
    url: '/experiences',
  },
  '/guides': {
    title: 'מדריכים',
    description: 'מדריכים מקצועיים לטיפול בחיות מחמד — תזונה, בריאות, אימונים',
    url: '/guides',
  },
  '/science': {
    title: 'מדע ואמון',
    description: 'המחקר המדעי מאחורי ההמלצות של PetID — מבוסס NRC 2006',
    url: '/science',
  },
  '/chat': {
    title: 'צ\'אט',
    description: 'שוחחו עם הסוכנים החכמים של PetID — שירות, תזונה, ביטוח ועוד',
    url: '/chat',
  },
};

export default SEO;
