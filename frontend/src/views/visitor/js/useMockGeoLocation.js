import { useEffect, useRef, useState } from "react";

/**
 * Hook to simulate geolocation updates from a static JSON series.
 *
 * @param {Array<{lat:number,lng:number}>} points - Series of mock locations.
 * @param {number} intervalMs - Delay between updates (default 2000 ms).
 * @returns {{ location: {lat:number,lng:number}|null, index: number }}
 */
export default function useMockGeolocation(points = [], intervalMs = 2000) {
  const [index, setIndex] = useState(0);
  const [location, setLocation] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!points.length) return;

    // Start from the first point
    setLocation(points[0]);
    setIndex(0);

    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % points.length;
        setLocation(points[next]);
        console.log(
          `[MockGeo] Update #${next}: ${points[next].lat}, ${points[next].lng} @ ${new Date().toISOString()}`
        );
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [points, intervalMs]);

  return { location, index };
}
