// Utility functions for location calculations

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing (direction) from point 1 to point 2
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x);
  bearing = toDeg(bearing);
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Format distance for display
 * Returns string with unit (km or m)
 */
export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters >= 1000) {
    return `${(distanceInMeters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceInMeters)} m`;
}

/**
 * Smooth GPS coordinates using moving average filter
 * Helps reduce jitter and improve accuracy
 */
export class LocationSmoother {
  private positions: Array<{ lat: number; lon: number; accuracy: number; timestamp: number }> = [];
  private readonly maxPositions = 5; // Keep last 5 positions
  private readonly maxAge = 5000; // 5 seconds

  addPosition(lat: number, lon: number, accuracy: number): { lat: number; lon: number } {
    const now = Date.now();
    
    // Remove old positions
    this.positions = this.positions.filter(p => now - p.timestamp < this.maxAge);
    
    // Add new position
    this.positions.push({ lat, lon, accuracy, timestamp: now });
    
    // If we have enough positions, use weighted average (more weight to accurate readings)
    if (this.positions.length >= 2) {
      let totalWeight = 0;
      let weightedLat = 0;
      let weightedLon = 0;
      
      this.positions.forEach(pos => {
        // Weight inversely proportional to accuracy (lower accuracy = lower weight)
        const weight = 1 / (1 + pos.accuracy / 10);
        weightedLat += pos.lat * weight;
        weightedLon += pos.lon * weight;
        totalWeight += weight;
      });
      
      return {
        lat: weightedLat / totalWeight,
        lon: weightedLon / totalWeight,
      };
    }
    
    // If not enough positions, return the latest
    return { lat, lon };
  }

  reset() {
    this.positions = [];
  }
}

/**
 * Smooth heading using exponential moving average
 */
export class HeadingSmoother {
  private smoothedHeading: number | null = null;
  private readonly alpha = 0.3; // Smoothing factor (0-1, lower = more smoothing)

  smooth(heading: number): number {
    if (this.smoothedHeading === null) {
      this.smoothedHeading = heading;
      return heading;
    }

    // Handle wrap-around (0-360 degrees)
    let diff = heading - this.smoothedHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    this.smoothedHeading = (this.smoothedHeading + diff * this.alpha) % 360;
    if (this.smoothedHeading < 0) this.smoothedHeading += 360;

    return this.smoothedHeading;
  }

  reset() {
    this.smoothedHeading = null;
  }
}

