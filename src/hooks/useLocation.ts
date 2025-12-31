import { useState, useEffect, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    city: null,
    error: null,
    loading: false,
    permissionDenied: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'המכשיר שלך לא תומך במיקום',
        loading: false,
      }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to get city name from coordinates (reverse geocoding)
        let city: string | null = null;
        try {
          // Using a free geocoding service
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=he`
          );
          const data = await response.json();
          city = data.city || data.locality || data.principalSubdivision || null;
        } catch (e) {
          console.log('Could not get city name:', e);
        }

        setLocation({
          latitude,
          longitude,
          city,
          error: null,
          loading: false,
          permissionDenied: false,
        });
      },
      (error) => {
        let errorMessage = 'שגיאה בקבלת מיקום';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'הגישה למיקום נדחתה';
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'מידע המיקום לא זמין';
            break;
          case error.TIMEOUT:
            errorMessage = 'פג הזמן לקבלת מיקום';
            break;
        }

        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionDenied,
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  // Calculate distance between two points (in km)
  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Check if a point is within radius (default 10km)
  const isNearby = useCallback((lat: number, lon: number, radiusKm: number = 10): boolean => {
    if (!location.latitude || !location.longitude) return false;
    const distance = getDistance(location.latitude, location.longitude, lat, lon);
    return distance <= radiusKm;
  }, [location.latitude, location.longitude, getDistance]);

  return {
    ...location,
    requestLocation,
    getDistance,
    isNearby,
    hasLocation: location.latitude !== null && location.longitude !== null,
  };
};
