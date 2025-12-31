import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EngagementEvent {
  contentType: 'post' | 'product' | 'adoption' | 'challenge' | 'ad' | 'suggested';
  contentId: string;
  action: 'view' | 'like' | 'save' | 'share' | 'click' | 'purchase';
  durationSeconds?: number;
  metadata?: Record<string, any>;
}

export const useEngagement = () => {
  const { user } = useAuth();
  const viewTimers = useRef<Map<string, number>>(new Map());

  // Track an engagement event
  const trackEngagement = useCallback(async (event: EngagementEvent) => {
    if (!user) return;

    try {
      await supabase.from('user_engagement').insert({
        user_id: user.id,
        content_type: event.contentType,
        content_id: event.contentId,
        action: event.action,
        duration_seconds: event.durationSeconds,
        metadata: event.metadata,
      });
    } catch (error) {
      // Silent fail - don't interrupt user experience
      console.debug('Engagement tracking failed:', error);
    }
  }, [user]);

  // Start tracking view time
  const startViewTimer = useCallback((contentType: string, contentId: string) => {
    const key = `${contentType}-${contentId}`;
    viewTimers.current.set(key, Date.now());
  }, []);

  // End tracking and record view
  const endViewTimer = useCallback((contentType: EngagementEvent['contentType'], contentId: string) => {
    const key = `${contentType}-${contentId}`;
    const startTime = viewTimers.current.get(key);
    
    if (startTime) {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      viewTimers.current.delete(key);
      
      // Only track if viewed for at least 1 second
      if (durationSeconds >= 1) {
        trackEngagement({
          contentType,
          contentId,
          action: 'view',
          durationSeconds,
        });
      }
    }
  }, [trackEngagement]);

  // Track a like
  const trackLike = useCallback((contentType: EngagementEvent['contentType'], contentId: string) => {
    trackEngagement({ contentType, contentId, action: 'like' });
  }, [trackEngagement]);

  // Track a save
  const trackSave = useCallback((contentType: EngagementEvent['contentType'], contentId: string) => {
    trackEngagement({ contentType, contentId, action: 'save' });
  }, [trackEngagement]);

  // Track a share
  const trackShare = useCallback((contentType: EngagementEvent['contentType'], contentId: string) => {
    trackEngagement({ contentType, contentId, action: 'share' });
  }, [trackEngagement]);

  // Track a click
  const trackClick = useCallback((contentType: EngagementEvent['contentType'], contentId: string) => {
    trackEngagement({ contentType, contentId, action: 'click' });
  }, [trackEngagement]);

  // Track a purchase
  const trackPurchase = useCallback((contentType: EngagementEvent['contentType'], contentId: string, metadata?: Record<string, any>) => {
    trackEngagement({ contentType, contentId, action: 'purchase', metadata });
  }, [trackEngagement]);

  // Update user interests directly
  const updateInterest = useCallback(async (interestType: string, interestValue: string, weight: number = 1) => {
    if (!user) return;

    try {
      await supabase.from('user_interests').upsert({
        user_id: user.id,
        interest_type: interestType,
        interest_value: interestValue,
        weight,
      }, {
        onConflict: 'user_id,interest_type,interest_value',
      });
    } catch (error) {
      console.debug('Interest update failed:', error);
    }
  }, [user]);

  // Cleanup view timers on unmount
  useEffect(() => {
    return () => {
      viewTimers.current.clear();
    };
  }, []);

  return {
    trackEngagement,
    startViewTimer,
    endViewTimer,
    trackLike,
    trackSave,
    trackShare,
    trackClick,
    trackPurchase,
    updateInterest,
  };
};
