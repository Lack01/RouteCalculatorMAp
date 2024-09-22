import axios from "axios";
import { MAPBOX_TOKEN } from "../config";

export default async function getPlaces(query) {
  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json`,
      {
        params: {
          access_token: MAPBOX_TOKEN,
        },
      }
    );

    return response.data.features;
  } catch (error) {
    console.error("There was an error while fetching places:", error);
  }
}