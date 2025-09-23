const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(express.static("public"));
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/api/data", async (req, res) => {
  const { lat, lon,day } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    const currentPollutionResponse = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution`,
      {
        params: {
          lat,
          lon,
          appid: process.env.OPENWEATHER_API_KEY,
        },
      }
    );

    const weatherResponse = await axios.get(
      `http://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat,
          lon,
          appid: process.env.OPENWEATHER_API_KEY,
          units: "metric",
        },
      }
    );

    let airQualityData = null;
    try {
      const airResponse = await axios.get(
        `https://api.openaq.org/v3/locations`,
        {
          headers: { "X-API-Key": process.env.OPENAQ_API_KEY },
          params: {
            coordinates: `${lat},${lon}`,
            radius: 25000,
            limit: 1,
          },
        }
      );
      airQualityData = airResponse.data.results?.[0] || null;
    } catch (airError) {
      console.warn("OpenAQ API error:", airError.message);
    }

    const combinedData = {
      ...currentPollutionResponse.data,
      weather: weatherResponse.data,
    };

    res.json({
      location: weatherResponse.data.name,
      weather: combinedData,
      airQuality: airQualityData,
    });
  } catch (err) {
    console.error("API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch current data" });
  }
});

// Air pollution forecast endpoint
app.get("/api/forecast", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    const forecastResponse = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution/forecast`,
      {
        params: {
          lat,
          lon,
          appid: process.env.OPENWEATHER_API_KEY,
        },
      }
    );

    console.log("Forecast data retrieved:", forecastResponse.data);

    res.json({
      coord: forecastResponse.data.coord,
      forecast: forecastResponse.data.list,
      totalHours: forecastResponse.data.list.length,
    });
  } catch (err) {
    console.error("Forecast API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch forecast data" });
  }
});

// Historical air pollution data endpoint
app.get("/api/historical", async (req, res) => {
  const { lat, lon, days } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    // Default to last 7 days if not specified
    const daysBack = parseInt(days) || 7;
    const endTime = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    const startTime = endTime - daysBack * 24 * 60 * 60; // Days ago

    const historicalResponse = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution/history`,
      {
        params: {
          lat,
          lon,
          start: startTime,
          end: endTime,
          appid: process.env.OPENWEATHER_API_KEY,
        },
      }
    );

    console.log(
      "Historical data retrieved:",
      historicalResponse.data.list.length,
      "data points"
    );

    res.json({
      coord: historicalResponse.data.coord,
      historical: historicalResponse.data.list,
      period: {
        start: startTime,
        end: endTime,
        days: daysBack,
      },
    });
  } catch (err) {
    console.error("Historical API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

// Combined endpoint for dashboard (current + forecast + historical)
app.get("/api/complete", async (req, res) => {
  const { lat, lon, days } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    // Parallel requests for better performance
    const requests = [
      // Current pollution data
      axios.get(`http://api.openweathermap.org/data/2.5/air_pollution`, {
        params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY },
      }),
      // Forecast data
      axios.get(
        `http://api.openweathermap.org/data/2.5/air_pollution/forecast`,
        {
          params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY },
        }
      ),
      // Weather data
      axios.get(`http://api.openweathermap.org/data/2.5/weather`, {
        params: {
          lat,
          lon,
          appid: process.env.OPENWEATHER_API_KEY,
          units: "metric",
        },
      }),
    ];

    // Add historical data request
    const daysBack = parseInt(days) || 7;
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - daysBack * 24 * 60 * 60;

    requests.push(
      axios.get(
        `http://api.openweathermap.org/data/2.5/air_pollution/history`,
        {
          params: {
            lat,
            lon,
            start: startTime,
            end: endTime,
            appid: process.env.OPENWEATHER_API_KEY,
          },
        }
      )
    );

    const [currentRes, forecastRes, weatherRes, historicalRes] =
      await Promise.all(requests);

    // Try to get OpenAQ data (non-blocking)
    let airQualityData = null;
    try {
      const airResponse = await axios.get(
        `https://api.openaq.org/v3/locations`,
        {
          headers: { "X-API-Key": process.env.OPENAQ_API_KEY },
          params: { coordinates: `${lat},${lon}`, radius: 25000, limit: 1 },
        }
      );
      airQualityData = airResponse.data.results?.[0] || null;
    } catch (airError) {
      console.warn("OpenAQ API unavailable");
    }

    // Combine current pollution with weather
    const combinedCurrent = {
      ...currentRes.data,
      weather: weatherRes.data,
    };

    res.json({
      location: weatherRes.data.name,
      current: combinedCurrent,
      forecast: {
        coord: forecastRes.data.coord,
        list: forecastRes.data.list,
      },
      historical: {
        coord: historicalRes.data.coord,
        list: historicalRes.data.list,
        period: { start: startTime, end: endTime, days: daysBack },
      },
      airQuality: airQualityData,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Complete API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch complete data" });
  }
});

app.listen(PORT, () => {
  console.log(`Enhanced server running on port ${PORT}`);
  console.log("Available endpoints:");
  console.log("- GET /api/data - Current air quality");
  console.log("- GET /api/forecast - Air quality forecast");
  console.log("- GET /api/historical?days=7 - Historical data");
  console.log("- GET /api/complete - All data combined");
});
