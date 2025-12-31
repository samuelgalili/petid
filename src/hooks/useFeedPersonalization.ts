import { useMemo } from "react";
import { useUserRole } from "./useUserRole";
import type { FeedTab } from "@/components/feed/FeedTabs";

interface FeedPersonalizationConfig {
  // Content priority weights (higher = more likely to show)
  contentPriority: {
    video: number;
    emotionalPet: number;
    educational: number;
    product: number;
    suggested: number;
    following: number;
    ad: number;
    adoption: number;
    challenge: number;
  };
  // Default tab for this role
  defaultTab: FeedTab;
  // Tabs to highlight for this role
  highlightedTabs: FeedTab[];
  // Special features for this role
  features: {
    showBusinessInsights: boolean;
    showAdoptionCTA: boolean;
    showMarketTrends: boolean;
    showCommunityStats: boolean;
    prioritizeLocalContent: boolean;
  };
  // Max ads per 10 items
  maxAdsPerTen: number;
}

const DEFAULT_CONFIG: FeedPersonalizationConfig = {
  contentPriority: {
    video: 10,
    emotionalPet: 9,
    educational: 8,
    product: 5,
    suggested: 7,
    following: 6,
    ad: 2,
    adoption: 6,
    challenge: 7,
  },
  defaultTab: "foryou",
  highlightedTabs: ["foryou"],
  features: {
    showBusinessInsights: false,
    showAdoptionCTA: false,
    showMarketTrends: false,
    showCommunityStats: false,
    prioritizeLocalContent: false,
  },
  maxAdsPerTen: 2,
};

const ROLE_CONFIGS: Record<string, Partial<FeedPersonalizationConfig>> = {
  // Regular pet owner - emotional, fun content
  user: {
    contentPriority: {
      video: 10,
      emotionalPet: 9,
      educational: 8,
      product: 5,
      suggested: 7,
      following: 8,
      ad: 2,
      adoption: 5,
      challenge: 8,
    },
    defaultTab: "foryou",
    highlightedTabs: ["foryou", "following"],
    features: {
      showBusinessInsights: false,
      showAdoptionCTA: true,
      showMarketTrends: false,
      showCommunityStats: false,
      prioritizeLocalContent: true,
    },
    maxAdsPerTen: 2,
  },
  
  // Business/Shop - market trends, products, audience
  business: {
    contentPriority: {
      video: 6,
      emotionalPet: 5,
      educational: 7,
      product: 10,
      suggested: 8,
      following: 4,
      ad: 3,
      adoption: 3,
      challenge: 5,
    },
    defaultTab: "marketplace",
    highlightedTabs: ["marketplace", "foryou"],
    features: {
      showBusinessInsights: true,
      showAdoptionCTA: false,
      showMarketTrends: true,
      showCommunityStats: true,
      prioritizeLocalContent: false,
    },
    maxAdsPerTen: 1,
  },
  
  // Organization/Shelter - adoption, community
  org: {
    contentPriority: {
      video: 7,
      emotionalPet: 10,
      educational: 8,
      product: 3,
      suggested: 6,
      following: 5,
      ad: 1,
      adoption: 10,
      challenge: 6,
    },
    defaultTab: "adopt",
    highlightedTabs: ["adopt", "nearby"],
    features: {
      showBusinessInsights: false,
      showAdoptionCTA: true,
      showMarketTrends: false,
      showCommunityStats: true,
      prioritizeLocalContent: true,
    },
    maxAdsPerTen: 1,
  },
  
  // Admin - everything
  admin: {
    contentPriority: {
      video: 8,
      emotionalPet: 8,
      educational: 8,
      product: 8,
      suggested: 8,
      following: 8,
      ad: 8,
      adoption: 8,
      challenge: 8,
    },
    defaultTab: "foryou",
    highlightedTabs: ["foryou", "marketplace", "adopt"],
    features: {
      showBusinessInsights: true,
      showAdoptionCTA: true,
      showMarketTrends: true,
      showCommunityStats: true,
      prioritizeLocalContent: false,
    },
    maxAdsPerTen: 3,
  },
};

export const useFeedPersonalization = () => {
  const { role, isBusiness, isOrg, isAdmin } = useUserRole();

  const config = useMemo((): FeedPersonalizationConfig => {
    const roleConfig = ROLE_CONFIGS[role] || {};
    
    return {
      ...DEFAULT_CONFIG,
      ...roleConfig,
      contentPriority: {
        ...DEFAULT_CONFIG.contentPriority,
        ...roleConfig.contentPriority,
      },
      features: {
        ...DEFAULT_CONFIG.features,
        ...roleConfig.features,
      },
    };
  }, [role]);

  // Sort items by priority for the current role
  const sortByPriority = <T extends { type: string }>(items: T[]): T[] => {
    const getPriority = (type: string): number => {
      const typeMap: Record<string, keyof FeedPersonalizationConfig['contentPriority']> = {
        'post': 'following',
        'adoption': 'adoption',
        'product': 'product',
        'ad': 'ad',
        'suggested': 'suggested',
        'challenge': 'challenge',
      };
      const key = typeMap[type] || 'following';
      return config.contentPriority[key];
    };

    return [...items].sort((a, b) => getPriority(b.type) - getPriority(a.type));
  };

  // Apply spacing rules and ad limits
  const applyFeedRules = <T extends { type: string }>(items: T[]): T[] => {
    const result: T[] = [];
    let nonOrganicCount = 0;
    let lastWasNonOrganic = false;
    let adsInLastTen = 0;

    for (const item of items) {
      const isNonOrganic = item.type !== 'post';
      const isAd = item.type === 'ad';

      // Skip consecutive non-organic items
      if (isNonOrganic && lastWasNonOrganic) {
        continue;
      }

      // Check ad limit per 10 items
      if (isAd) {
        const itemsInCurrentWindow = result.length % 10;
        if (itemsInCurrentWindow === 0) {
          adsInLastTen = 0;
        }
        if (adsInLastTen >= config.maxAdsPerTen) {
          continue;
        }
        adsInLastTen++;
      }

      result.push(item);
      lastWasNonOrganic = isNonOrganic;
    }

    return result;
  };

  return {
    config,
    role,
    isBusiness,
    isOrg,
    isAdmin,
    sortByPriority,
    applyFeedRules,
    defaultTab: config.defaultTab,
    highlightedTabs: config.highlightedTabs,
    features: config.features,
  };
};
