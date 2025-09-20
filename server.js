const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(express.static("public"));
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/api/data", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
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
    console.log(weatherResponse.data);
    // Fetch air quality data from OpenAQ
    const airResponse = await axios.get(
      `https://api.openaq.org/v3/parameters/2/latest`,
      {
        headers: { "X-API-Key": process.env.OPENAQ_API_KEY },
        params: {
          coordinates: `${lat},${lon}`,
          radius: 25000,
          limit: 1,
        },
      }
    );

    console.log(airResponse.data);

    res.json({
      location: weatherResponse.data.name,
      weather: weatherResponse.data,
      airQuality: airResponse.data.results?.[0] || null,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
