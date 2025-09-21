import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function handler(event, context) {
  const { lat, lon } = event.queryStringParameters || {};

  if (!lat || !lon) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing lat/lon" }),
    };
  }

  try {
    // Fetch weather data from OpenWeather
    const weatherResponse = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution`,
      {
        params: {
          lat,
          lon,
          appid: process.env.OPENWEATHER_API_KEY,
        },
      }
    );

    const airResponse = await axios.get(`https://api.openaq.org/v3/locations`, {
      headers: { "X-API-Key": process.env.OPENAQ_API_KEY },
      params: {
        coordinates: `${lat},${lon}`,
        radius: 25000,
        limit: 1,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        location: weatherResponse.data.name,
        weather: weatherResponse.data,
        airQuality: airResponse.data.results?.[0] || null,
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error(err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch data" }),
    };
  }
}
