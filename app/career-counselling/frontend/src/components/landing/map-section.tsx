"use client";

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Loader2 } from "lucide-react";

// Define the type for state college data
interface StateWithColleges {
  name: string;
  coordinates: [number, number];
  colleges: number;
}

// Coordinate data for Indian states
const stateCoordinates: { [key: string]: [number, number] } = {
  "Andhra Pradesh": [80.0, 15.9129],
  "Arunachal Pradesh": [93.6167, 28.218],
  Assam: [92.9376, 26.2006],
  Bihar: [85.3131, 25.0961],
  Chandigarh: [76.7794, 30.7333],
  Chhattisgarh: [81.8661, 21.2787],
  Delhi: [77.1025, 28.7041],
  Goa: [74.124, 15.2993],
  Gujarat: [71.1924, 22.2587],
  Haryana: [76.0856, 29.0588],
  "Himachal Pradesh": [77.199, 31.1048],
  "Jammu and Kashmir": [74.7973, 34.0837],
  Jharkhand: [85.2799, 23.6102],
  Karnataka: [75.7139, 15.3173],
  Kerala: [76.2711, 10.8505],
  Ladakh: [77.577, 34.1526],
  "Madhya Pradesh": [78.6569, 22.9734],
  Maharashtra: [75.7139, 19.7515],
  Manipur: [93.9063, 24.6637],
  Meghalaya: [91.3662, 25.467],
  Mizoram: [92.9376, 23.1645],
  Nagaland: [94.5624, 26.1584],
  Odisha: [85.0985, 20.9517],
  Puducherry: [79.8083, 11.9416],
  Punjab: [75.3412, 31.1471],
  Rajasthan: [74.2179, 27.0238],
  Sikkim: [88.5122, 27.533],
  "Tamil Nadu": [78.6569, 11.1271],
  Telangana: [79.0193, 18.1124],
  Tripura: [91.9882, 23.9408],
  "Uttar Pradesh": [80.9462, 26.8467],
  Uttarakhand: [79.0193, 30.0668],
  "West Bengal": [87.855, 22.9868],
};

export default function MapSection() {
  const [statesWithColleges, setStatesWithColleges] = useState<
    StateWithColleges[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the fallback data to prevent recreation on each render
  const fallbackData = useMemo<StateWithColleges[]>(
    () => [
      {
        name: "Delhi",
        coordinates: [77.1025, 28.7041] as [number, number],
        colleges: 45,
      },
      {
        name: "Maharashtra",
        coordinates: [75.7139, 19.7515] as [number, number],
        colleges: 78,
      },
      {
        name: "Karnataka",
        coordinates: [76.1662, 13.1588] as [number, number],
        colleges: 63,
      },
      {
        name: "Tamil Nadu",
        coordinates: [78.6569, 11.1271] as [number, number],
        colleges: 57,
      },
      {
        name: "Uttar Pradesh",
        coordinates: [80.9462, 26.8467] as [number, number],
        colleges: 42,
      },
      {
        name: "West Bengal",
        coordinates: [87.855, 22.9868] as [number, number],
        colleges: 38,
      },
      {
        name: "Telangana",
        coordinates: [79.0193, 17.1124] as [number, number],
        colleges: 31,
      },
      {
        name: "Punjab",
        coordinates: [75.3412, 31.1471] as [number, number],
        colleges: 25,
      },
      {
        name: "Gujarat",
        coordinates: [72.6369, 23.2156] as [number, number],
        colleges: 34,
      },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;
    const fetchCollegesByState = async () => {
      try {
        setLoading(true);
        // Set timeout to cancel the request if it takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Fetch state-wise college counts from the API with the correct endpoint
        const response = await axios.get("/api/colleges-by-state", {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!mounted) return;

        // Process the data to include coordinates
        const processedData = response.data.map(
          (stateData: { state: string; count: number }) => ({
            name: stateData.state,
            coordinates:
              stateCoordinates[stateData.state] ||
              ([78.9629, 20.5937] as [number, number]), // Default to center of India if no coordinates
            colleges: stateData.count,
          })
        );

        // Set the processed data to state
        setStatesWithColleges(processedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching college state data:", err);
        if (mounted) {
          setError("Failed to load college data by state");
          // Use fallback data if API fails
          setStatesWithColleges(fallbackData);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCollegesByState();

    return () => {
      mounted = false;
    };
  }, [fallbackData]);

  // Memoize the geography and composable map to prevent unnecessary rerenders
  const geoUrl = "/india.json";

  // Only render the component if it's not loading or we have fallback data
  if (loading && statesWithColleges.length === 0) {
    return (
      <div className="py-2 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">
            Explore Colleges Across India
          </h2>
          <div className="flex justify-center items-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 bg-gray-50">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">
          Explore Colleges Across India
        </h2>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-2/3">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 650,
                center: [83, 23],
              }}
              width={600}
              height={600}
              className="mx-auto"
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies &&
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#EAEAEC"
                      stroke="#D6D6DA"
                    />
                  ))
                }
              </Geographies>
              {statesWithColleges.map(({ name, coordinates, colleges }) => (
                <Marker key={name} coordinates={coordinates}>
                  <circle
                    r={6}
                    fill="#FF6347"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  <text
                    textAnchor="middle"
                    y={-10}
                    style={{
                      fontFamily: "system-ui",
                      fill: "#5D5A6D",
                      fontSize: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    {colleges}
                  </text>
                </Marker>
              ))}
            </ComposableMap>
          </div>
          <div className="w-full md:w-1/3">
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Colleges Available
            </h3>
            <Card>
              <CardContent className="pt-6">
                <p className="mb-4">
                  Our platform contains detailed information on colleges across
                  multiple states in India. Each marker shows the number of
                  colleges we have in that state.
                </p>
                <Button
                  className="w-full bg-primary-blue text-white hover:bg-blue-600"
                  onClick={() => window.open("/feedback", "_blank")}
                >
                  Request a New College
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Couldn't find the college you were looking for? Fill this
                  feedback form for us to work on it immediately!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
