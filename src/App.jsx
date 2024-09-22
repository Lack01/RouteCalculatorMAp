import { useState, useEffect } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import axios from "axios";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "./config";
import AddressForm from "./components/AddressForm";
import "/src/index.css";

function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [closestRoute, setClosestRoute] = useState(null);
  const [farthestRoute, setFarthestRoute] = useState(null);
  const zoomMapa = 12;

  const [viewState, setViewState] = useState({
    longitude: -100.445882,
    latitude: 39.78373,
    zoom: 3.5,
  });

  const [address, setAddress] = useState({
    streetAndNumber: "",
    place: "",
    region: "",
    postcode: "",
    country: "",
    latitude: "",
    longitude: "",
  });

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      const fullAddress = `${address.streetAndNumber}, ${address.place}, ${address.region}, ${address.postcode}, ${address.country}`;
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          fullAddress
        )}.json`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            limit: 1,
          },
        }
      );
      const [longitude, latitude] = response.data.features[0].center;

      // Agregar el nuevo marcador
      setMarkers([...markers, { lng: longitude, lat: latitude }]);

      setViewState({
        longitude,
        latitude,
        zoom: zoomMapa,
      });
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
  };

  useEffect(() => {
    // Obtener la ubicación actual
    navigator.geolocation.getCurrentPosition((position) => {
      const { longitude, latitude } = position.coords;
      setCurrentLocation({ longitude, latitude });
      setViewState({
        longitude,
        latitude,
        zoom: zoomMapa, // Ajusta el nivel de zoom según tus necesidades
      });
    });
  }, []);

  useEffect(() => {
    if (currentLocation && markers.length > 0) {
      calculateRoutes();
    }
  }, [currentLocation, markers]);

  const addMarker = (event) => {
    const { lng, lat } = event.lngLat;
    setMarkers([...markers, { lng, lat }]);
  };

  const calculateRoutes = async () => {
    let closestPoint = null;
    let farthestPoint = null;
    let minDistance = Infinity;
    let maxDistance = 0;

    markers.forEach((marker) => {
      const from = turf.point([
        currentLocation.longitude,
        currentLocation.latitude,
      ]);
      const to = turf.point([marker.lng, marker.lat]);
      const distance = turf.distance(from, to);

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = marker;
      }

      if (distance > maxDistance) {
        maxDistance = distance;
        farthestPoint = marker;
      }
    });

    if (closestPoint) {
      const route = await getRoute(currentLocation, closestPoint);
      setClosestRoute(route);
    }

    if (farthestPoint) {
      const route = await getRoute(currentLocation, farthestPoint);
      setFarthestRoute(route);
    }
  };

  const getRoute = async (from, to) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.lng},${to.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      return {
        type: "Feature",
        geometry: data.routes[0].geometry,
      };
    } catch (error) {
      console.error("Error getting route:", error);
      return null;
    }
  };

  const resetMap = () => {
    // Restablece el estado del mapa a la ubicación actual y borra los marcadores y rutas
    setMarkers([]);
    setClosestRoute(null);
    setFarthestRoute(null);
    setViewState({
      longitude: currentLocation.longitude,
      latitude: currentLocation.latitude,
      zoom: zoomMapa,
    });
  };

  return (
    <div className="App">
      <h1 className="title">Route Calculator</h1>
      <AddressForm
        address={address}
        onSubmit={handleFormSubmit}
        setAddress={setAddress}
        setMarkers={setMarkers}
        resetMap={resetMap}
      />
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "60vw", height: "50vh" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={addMarker}
      >
        {currentLocation && (
          <Marker
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
            color="blue"
          />
        )}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            longitude={marker.lng}
            latitude={marker.lat}
            color="red"
          />
        ))}
        {closestRoute && (
          <Source id="closestRoute" type="geojson" data={closestRoute}>
            <Layer
              id="closestRouteLayer"
              type="line"
              paint={{ "line-color": "green", "line-width": 4 }}
            />
          </Source>
        )}
        {farthestRoute && (
          <Source id="farthestRoute" type="geojson" data={farthestRoute}>
            <Layer
              id="farthestRouteLayer"
              type="line"
              paint={{ "line-color": "red", "line-width": 4 }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}

export default App;
