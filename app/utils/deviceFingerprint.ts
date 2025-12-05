/**
 * Device Fingerprinting Utility
 * Creates a unique fingerprint for each device to prevent multiple accounts
 */

// Generate a device fingerprint using multiple browser/device characteristics
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server-' + Date.now();
  }

  const components: string[] = [];

  // Screen properties
  if (screen.width && screen.height) {
    components.push(`screen:${screen.width}x${screen.height}`);
  }
  if (screen.colorDepth) {
    components.push(`depth:${screen.colorDepth}`);
  }
  if (screen.pixelDepth) {
    components.push(`pixel:${screen.pixelDepth}`);
  }

  // Browser/User Agent
  if (navigator.userAgent) {
    components.push(`ua:${navigator.userAgent.substring(0, 50)}`);
  }

  // Language
  if (navigator.language) {
    components.push(`lang:${navigator.language}`);
  }

  // Timezone
  if (Intl.DateTimeFormat) {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      components.push(`tz:${timezone}`);
    } catch (e) {
      // Timezone not available
    }
  }

  // Platform
  if (navigator.platform) {
    components.push(`platform:${navigator.platform}`);
  }

  // Hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency) {
    components.push(`cores:${navigator.hardwareConcurrency}`);
  }

  // Memory (if available)
  if ('deviceMemory' in navigator && (navigator as any).deviceMemory) {
    components.push(`mem:${(navigator as any).deviceMemory}`);
  }

  // Canvas fingerprinting (more unique)
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Device fingerprint 🔒', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device fingerprint 🔒', 4, 17);
      
      const canvasHash = canvas.toDataURL().substring(0, 100);
      components.push(`canvas:${canvasHash}`);
    }
  } catch (e) {
    // Canvas not available
  }

  // WebGL fingerprinting (very unique)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (vendor) components.push(`gl-vendor:${String(vendor).substring(0, 30)}`);
        if (renderer) components.push(`gl-renderer:${String(renderer).substring(0, 30)}`);
      }
    }
  } catch (e) {
    // WebGL not available
  }

  // Combine all components
  const fingerprintString = components.join('|');

  // Create a hash of the fingerprint (simple hash function)
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Create a stable fingerprint ID (no timestamp - same device = same fingerprint)
  const fingerprint = `fp-${Math.abs(hash).toString(36)}`;

  return fingerprint;
}

// Get device fingerprint (cached in sessionStorage for current session only)
// This ensures same fingerprint across page refreshes in same session
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server-' + Date.now();
  }

  // Use sessionStorage to cache fingerprint for current session only
  // This prevents new fingerprint on every refresh, but clears when browser closes
  const storageKey = 'device_fingerprint';
  let fingerprint = sessionStorage.getItem(storageKey);

  if (!fingerprint) {
    fingerprint = generateDeviceFingerprint();
    sessionStorage.setItem(storageKey, fingerprint);
  }

  return fingerprint;
}

// Get device info for display/debugging
export function getDeviceInfo(): {
  fingerprint: string;
  screen: string;
  platform: string;
  userAgent: string;
} {
  if (typeof window === 'undefined') {
    return {
      fingerprint: 'server',
      screen: 'unknown',
      platform: 'server',
      userAgent: 'server',
    };
  }

  return {
    fingerprint: getDeviceFingerprint(),
    screen: `${screen.width}x${screen.height}`,
    platform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent.substring(0, 100),
  };
}

