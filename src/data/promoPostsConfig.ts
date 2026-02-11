/**
 * Promotional / demo posts injected into the feed.
 * Keeping them in a config file keeps the feed logic clean.
 */

export interface PromoPostConfig {
  id: string;
  user_id: string;
  image_url: string;
  media_urls?: string[];
  caption: string;
  likes_count: number;
  comments_count: number;
  user_profile: {
    full_name: string;
    avatar_url: string;
    is_verified: boolean;
  };
  media_type: "image" | "gallery" | "video";
  post_type: "regular" | "product" | "challenge" | "cta";
  product_id?: string;
  product_name?: string;
  product_price?: number;
  product_weight?: string;
  product_sizes?: string[];
  product_colors?: string[];
  challenge_id?: string;
  challenge_title?: string;
  cta_link?: string;
  cta_text?: string;
  /** Position index in feed where this promo should be inserted */
  insertAt: number;
}

export const PROMO_POSTS: PromoPostConfig[] = [
  {
    id: "promo-product-1",
    user_id: "petid-shop",
    image_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800",
    caption: "🐕 מזון פרימיום לכלבים - 20% הנחה! מזון איכותי עשיר בחלבון לבריאות מיטבית של הכלב שלכם.",
    likes_count: 156,
    comments_count: 23,
    user_profile: {
      full_name: "PetID Shop",
      avatar_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=100",
      is_verified: true,
    },
    media_type: "image",
    post_type: "product",
    product_id: "prod-dog-food-1",
    product_name: "מזון פרימיום לכלבים",
    product_price: 89.9,
    product_weight: '15 ק״ג',
    product_colors: ["חום", "בז׳"],
    product_sizes: ["S", "M", "L"],
    insertAt: 2,
  },
  {
    id: "promo-gallery-1",
    user_id: "petid-featured",
    image_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
    media_urls: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800",
      "https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800",
      "https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?w=800",
    ],
    caption: "📸 הרגעים הכי יפים של השבוע! גלריית חיות מחמד מהקהילה שלנו 🐾",
    likes_count: 523,
    comments_count: 67,
    user_profile: {
      full_name: "PetID Featured",
      avatar_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=100",
      is_verified: true,
    },
    media_type: "gallery",
    post_type: "regular",
    insertAt: 4,
  },
  {
    id: "promo-challenge-1",
    user_id: "petid-community",
    image_url: "https://images.unsplash.com/photo-1587559045816-8b0a54d1f2b7?w=800",
    caption: "🏆 אתגר #PetidCutePhoto - שתפו את התמונה הכי חמודה של חיית המחמד שלכם וזכו ב-500 נקודות!",
    likes_count: 342,
    comments_count: 89,
    user_profile: {
      full_name: "PetID Community",
      avatar_url: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=100",
      is_verified: true,
    },
    media_type: "image",
    post_type: "challenge",
    challenge_id: "challenge-cute-photo",
    challenge_title: "הצטרף לאתגר!",
    insertAt: 5,
  },
  {
    id: "promo-cta-1",
    user_id: "petid-adoption",
    image_url: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800",
    caption: "🐾 אימוץ במקום קנייה! מאות כלבים וחתולים מחכים לבית חם. בואו לפגוש את החבר החדש שלכם.",
    likes_count: 278,
    comments_count: 45,
    user_profile: {
      full_name: "PetID Adoption",
      avatar_url: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=100",
      is_verified: true,
    },
    media_type: "image",
    post_type: "cta",
    cta_link: "/adopt",
    cta_text: "לאימוץ",
    insertAt: 8,
  },
];
