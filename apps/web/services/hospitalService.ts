export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  distance?: number; // km from user
}

export interface GPSLocation {
  lat: number;
  lng: number;
}

/** Prompts the browser for the user's GPS coordinates. */
export async function getUserGPSLocation(): Promise<GPSLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err)
    );
  });
}

/** Returns the distance in km between two lat/lng points (Haversine formula). */
export function getHospitalDistanceFromUser(
  userLat: number,
  userLng: number,
  hospital: Hospital
): number {
  const R = 6371;
  const dLat = ((hospital.lat - userLat) * Math.PI) / 180;
  const dLng = ((hospital.lng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((hospital.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds nearby medical facilities using the Google Maps Places API.
 * Requires the Maps JS API to be loaded on the page.
 */
export async function findAllNearbyMedicalFacilitiesFromGPS(
  location: GPSLocation,
  radiusMeters = 5000
): Promise<Hospital[]> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !(window as any).google) {
      reject(new Error("Google Maps API not loaded."));
      return;
    }
    const service = new (window as any).google.maps.places.PlacesService(
      document.createElement("div")
    );
    service.nearbySearch(
      {
        location,
        radius: radiusMeters,
        type: "hospital",
      },
      (
        results: any[],
        status: string
      ) => {
        if (status !== "OK" && status !== "ZERO_RESULTS") {
          reject(new Error(`Places API error: ${status}`));
          return;
        }
        const hospitals: Hospital[] = (results || []).map((r: any) => ({
          id: r.place_id,
          name: r.name,
          address: r.vicinity || "",
          lat: r.geometry?.location?.lat() ?? 0,
          lng: r.geometry?.location?.lng() ?? 0,
          distance: getHospitalDistanceFromUser(
            location.lat,
            location.lng,
            {
              id: r.place_id,
              name: r.name,
              address: r.vicinity || "",
              lat: r.geometry?.location?.lat() ?? 0,
              lng: r.geometry?.location?.lng() ?? 0,
            }
          ),
        }));
        resolve(hospitals);
      }
    );
  });
}
