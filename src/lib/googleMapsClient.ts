type GoogleMapsFeature = "places" | "distanceMatrix";

type GoogleMapsWindow = Window & {
  google?: any;
  __googleMapsLoading?: boolean;
  __xioohGoogleMapsScriptPromise?: Promise<any> | null;
  gm_authFailure?: () => void;
};

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
const GOOGLE_MAPS_TIMEOUT_MS = 10000;
const GOOGLE_MAPS_FEATURE_LABELS: Record<GoogleMapsFeature, string> = {
  places: "Places Autocomplete",
  distanceMatrix: "Distance Matrix",
};

export function logGoogleMapsDiagnostic(message: string, details?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (details === undefined) {
    console.warn(`[Google Maps] ${message}`);
  } else {
    console.warn(`[Google Maps] ${message}`, details);
  }
}

function getGoogleMapsWindow() {
  if (typeof window === "undefined") {
    throw new Error("Google Maps is unavailable on the server");
  }

  return window as GoogleMapsWindow;
}

function getGoogleMapsApiKey() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !apiKey.startsWith("AIza")) {
    const error = new Error("Google Maps API key is not configured");
    logGoogleMapsDiagnostic(error.message);
    throw error;
  }

  return apiKey;
}

function buildGoogleMapsScriptUrl(apiKey: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/js");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("libraries", "places");
  url.searchParams.set("loading", "async");
  return url.toString();
}

function hasGoogleMapsFeature(google: any, feature: GoogleMapsFeature) {
  if (!google?.maps) return false;

  if (feature === "places") {
    return Boolean(google.maps.places?.AutocompleteService);
  }

  return Boolean(google.maps.DistanceMatrixService);
}

function hasGoogleMapsFeatures(google: any, features: GoogleMapsFeature[]) {
  return features.every((feature) => hasGoogleMapsFeature(google, feature));
}

function describeFeatures(features: GoogleMapsFeature[]) {
  return features.map((feature) => GOOGLE_MAPS_FEATURE_LABELS[feature]).join(", ");
}

function waitForGoogleMapsFeatures(
  googleWindow: GoogleMapsWindow,
  features: GoogleMapsFeature[],
  timeoutMs = GOOGLE_MAPS_TIMEOUT_MS
) {
  const google = googleWindow.google;
  if (hasGoogleMapsFeatures(google, features)) {
    return Promise.resolve(google);
  }

  return new Promise<any>((resolve, reject) => {
    const startedAt = Date.now();
    const label = describeFeatures(features);
    const interval = googleWindow.setInterval(() => {
      const currentGoogle = googleWindow.google;
      if (hasGoogleMapsFeatures(currentGoogle, features)) {
        googleWindow.clearInterval(interval);
        resolve(currentGoogle);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        googleWindow.clearInterval(interval);
        const error = new Error(`Google Maps timed out waiting for ${label}`);
        logGoogleMapsDiagnostic(error.message);
        reject(error);
      }
    }, 100);
  });
}

function waitForGoogleMapsCore(googleWindow: GoogleMapsWindow, timeoutMs = GOOGLE_MAPS_TIMEOUT_MS) {
  if (googleWindow.google?.maps) {
    return Promise.resolve(googleWindow.google);
  }

  return new Promise<any>((resolve, reject) => {
    const startedAt = Date.now();
    const interval = googleWindow.setInterval(() => {
      const currentGoogle = googleWindow.google;
      if (currentGoogle?.maps) {
        googleWindow.clearInterval(interval);
        resolve(currentGoogle);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        googleWindow.clearInterval(interval);
        const error = new Error("Google Maps timed out while loading script");
        logGoogleMapsDiagnostic(error.message);
        reject(error);
      }
    }, 100);
  });
}

function waitForGoogleMapsScript(googleWindow: GoogleMapsWindow) {
  return new Promise<any>((resolve, reject) => {
    const complete = () => {
      const google = googleWindow.google;
      if (google?.maps) {
        resolve(google);
      } else {
        const error = new Error("Google Maps failed to load");
        logGoogleMapsDiagnostic(error.message);
        reject(error);
      }
    };

    const fail = () => {
      const error = new Error("Google Maps script failed to load");
      logGoogleMapsDiagnostic(error.message);
      reject(error);
    };

    const previousAuthFailure = googleWindow.gm_authFailure;
    googleWindow.gm_authFailure = () => {
      previousAuthFailure?.();
      const error = new Error("Google Maps authentication failed");
      logGoogleMapsDiagnostic(error.message);
      reject(error);
    };

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", complete, { once: true });
      existingScript.addEventListener("error", fail, { once: true });

      waitForGoogleMapsCore(googleWindow, GOOGLE_MAPS_TIMEOUT_MS)
        .then(resolve)
        .catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = buildGoogleMapsScriptUrl(getGoogleMapsApiKey());
    script.async = true;
    script.defer = true;
    script.onload = complete;
    script.onerror = fail;

    googleWindow.__googleMapsLoading = true;
    document.head.appendChild(script);
  }).finally(() => {
    googleWindow.__googleMapsLoading = false;
  });
}

function ensureGoogleMapsScript() {
  const googleWindow = getGoogleMapsWindow();
  if (googleWindow.google?.maps) {
    return Promise.resolve(googleWindow.google);
  }

  if (!googleWindow.__xioohGoogleMapsScriptPromise) {
    try {
      getGoogleMapsApiKey();
    } catch (error) {
      return Promise.reject(error);
    }

    googleWindow.__xioohGoogleMapsScriptPromise = waitForGoogleMapsScript(googleWindow).catch(
      (error) => {
        googleWindow.__xioohGoogleMapsScriptPromise = null;
        throw error;
      }
    );
  }

  return googleWindow.__xioohGoogleMapsScriptPromise;
}

export async function loadGoogleMaps(features: GoogleMapsFeature[] = []) {
  const googleWindow = getGoogleMapsWindow();
  await ensureGoogleMapsScript();
  return waitForGoogleMapsFeatures(googleWindow, features);
}
