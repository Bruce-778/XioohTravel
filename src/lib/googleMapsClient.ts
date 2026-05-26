type GoogleMapsFeature = "places" | "distanceMatrix";

type GoogleMapsWindow = Window & {
  google?: any;
  __googleMapsLoading?: boolean;
  __xioohGoogleMapsScriptPromise?: Promise<any> | null;
  __xioohGoogleMapsScriptReject?: (error: Error) => void;
  __xioohGoogleMapsScriptLoadId?: number;
  __xioohGoogleMapsRequestedLanguage?: GoogleMapsLanguage;
  __xioohGoogleMapsScriptLanguage?: GoogleMapsLanguage;
  gm_authFailure?: () => void;
};

type GoogleMapsLanguage = "en" | "zh-CN";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
const GOOGLE_MAPS_TIMEOUT_MS = 10000;
const GOOGLE_MAPS_REGION = "JP";
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

function getGoogleMapsLanguage(locale: string | undefined): GoogleMapsLanguage {
  return locale?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function buildGoogleMapsScriptUrl(apiKey: string, language: GoogleMapsLanguage) {
  const url = new URL("https://maps.googleapis.com/maps/api/js");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("libraries", "places");
  url.searchParams.set("loading", "async");
  url.searchParams.set("language", language);
  url.searchParams.set("region", GOOGLE_MAPS_REGION);
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

function resetGoogleMapsScript(googleWindow: GoogleMapsWindow) {
  googleWindow.__xioohGoogleMapsScriptReject?.(
    new Error("Google Maps script load was superseded")
  );
  document.getElementById(GOOGLE_MAPS_SCRIPT_ID)?.remove();
  googleWindow.__xioohGoogleMapsScriptPromise = null;
  googleWindow.__xioohGoogleMapsScriptReject = undefined;
  googleWindow.__xioohGoogleMapsScriptLoadId = (googleWindow.__xioohGoogleMapsScriptLoadId ?? 0) + 1;
  googleWindow.__xioohGoogleMapsRequestedLanguage = undefined;
  googleWindow.__xioohGoogleMapsScriptLanguage = undefined;
  delete googleWindow.google;
}

function waitForGoogleMapsScript(googleWindow: GoogleMapsWindow, language: GoogleMapsLanguage) {
  return new Promise<any>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      if (
        googleWindow.__xioohGoogleMapsScriptLanguage !== language &&
        googleWindow.__xioohGoogleMapsRequestedLanguage !== language
      ) {
        resetGoogleMapsScript(googleWindow);
      } else {
        waitForGoogleMapsCore(googleWindow, GOOGLE_MAPS_TIMEOUT_MS)
          .then(resolve)
          .catch(reject);
        return;
      }
    }

    const loadId = (googleWindow.__xioohGoogleMapsScriptLoadId ?? 0) + 1;
    googleWindow.__xioohGoogleMapsScriptLoadId = loadId;
    googleWindow.__xioohGoogleMapsScriptReject = reject;

    const complete = () => {
      if (googleWindow.__xioohGoogleMapsScriptLoadId !== loadId) {
        return;
      }

      const google = googleWindow.google;
      if (google?.maps) {
        googleWindow.__xioohGoogleMapsScriptReject = undefined;
        googleWindow.__xioohGoogleMapsScriptLanguage = language;
        resolve(google);
      } else {
        const error = new Error("Google Maps failed to load");
        logGoogleMapsDiagnostic(error.message);
        reject(error);
      }
    };

    const fail = () => {
      if (googleWindow.__xioohGoogleMapsScriptLoadId !== loadId) {
        return;
      }

      const error = new Error("Google Maps script failed to load");
      logGoogleMapsDiagnostic(error.message);
      googleWindow.__xioohGoogleMapsScriptReject = undefined;
      reject(error);
    };

    const previousAuthFailure = googleWindow.gm_authFailure;
    googleWindow.gm_authFailure = () => {
      if (googleWindow.__xioohGoogleMapsScriptLoadId !== loadId) {
        previousAuthFailure?.();
        return;
      }

      previousAuthFailure?.();
      const error = new Error("Google Maps authentication failed");
      logGoogleMapsDiagnostic(error.message);
      googleWindow.__xioohGoogleMapsScriptReject = undefined;
      reject(error);
    };

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = buildGoogleMapsScriptUrl(getGoogleMapsApiKey(), language);
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

function ensureGoogleMapsScript(locale?: string) {
  const googleWindow = getGoogleMapsWindow();
  const language = getGoogleMapsLanguage(locale);

  if (
    googleWindow.google?.maps &&
    googleWindow.__xioohGoogleMapsScriptLanguage === language
  ) {
    return Promise.resolve(googleWindow.google);
  }

  if (
    googleWindow.__xioohGoogleMapsScriptPromise &&
    googleWindow.__xioohGoogleMapsRequestedLanguage !== language
  ) {
    resetGoogleMapsScript(googleWindow);
  }

  if (
    googleWindow.google?.maps &&
    googleWindow.__xioohGoogleMapsScriptLanguage !== language
  ) {
    resetGoogleMapsScript(googleWindow);
  }

  if (!googleWindow.__xioohGoogleMapsScriptPromise) {
    try {
      getGoogleMapsApiKey();
    } catch (error) {
      return Promise.reject(error);
    }

    googleWindow.__xioohGoogleMapsRequestedLanguage = language;
    googleWindow.__xioohGoogleMapsScriptPromise = waitForGoogleMapsScript(googleWindow, language).catch(
      (error) => {
        googleWindow.__xioohGoogleMapsScriptPromise = null;
        googleWindow.__xioohGoogleMapsScriptReject = undefined;
        googleWindow.__xioohGoogleMapsRequestedLanguage = undefined;
        googleWindow.__xioohGoogleMapsScriptLanguage = undefined;
        throw error;
      }
    );
  }

  return googleWindow.__xioohGoogleMapsScriptPromise;
}

export async function loadGoogleMaps(features: GoogleMapsFeature[] = [], locale?: string) {
  const googleWindow = getGoogleMapsWindow();
  await ensureGoogleMapsScript(locale);
  return waitForGoogleMapsFeatures(googleWindow, features);
}
