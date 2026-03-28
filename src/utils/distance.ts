// Haversine formula for exact distance
export const getDistance = (userLocation: any, storeLocation: any): number | null => {
  if (!userLocation?.lat || !userLocation?.lng || !storeLocation?.latitude || !storeLocation?.longitude) return null;

  const R = 6371; // km
  const dLat = (userLocation.lat - storeLocation.latitude) * Math.PI / 180;
  const dLon = (userLocation.lng - storeLocation.longitude) * Math.PI / 180;
  const lat1 = storeLocation.latitude * Math.PI / 180;
  const lat2 = userLocation.lat * Math.PI / 180;

  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
