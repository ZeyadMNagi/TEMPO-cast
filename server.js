const express = require("express");
const axios = require("axios");
const { pipeline } = require("node:stream/promises");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const NodeCache = require("node-cache");
require("dotenv").config();
const app = express();

const compression = require("compression");
app.use(compression());

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

app.use(
  express.static("public", {
    maxAge: "1h",
    etag: true,
  })
);
app.use(express.json());

const PORT = process.env.PORT || 3000;

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// --- GEMS Image Service Integration ---
const GEMS_API_KEY =
  process.env.GEMS_API_KEY || "api-c455c74c0a854d36868021840d32e01f";
const GEMS_DATA_DIR = path.join(__dirname, "microservices", "data");
const GEMS_IMAGE_BOUNDS = [
  [-34, 48],
  [58, 168],
];

const GEMS_LAYERS = {
  o3: {
    baseUrl: "https://nesc.nier.go.kr:38032/api/GK2/L2/O3T/FOR/image",
    latestImageFile: null,
    isReady: false,
  },
  hcho: {
    baseUrl: "https://nesc.nier.go.kr:38032/api/GK2/L2/HCHO/FOR/image",
    latestImageFile: null,
    isReady: false,
  },
  no2: {
    baseUrl: "https://nesc.nier.go.kr:38032/api/GK2/L2/NO2_Trop/FOR/image",
    latestImageFile: null,
    isReady: false,
  },
};

async function fetchLatestGemsTimestamp(baseUrl) {
  const now = new Date();
  const end = now.toISOString().slice(0, 16).replace(/[-T:]/g, "");
  now.setHours(now.getHours() - 24);
  const start = now.toISOString().slice(0, 16).replace(/[-T:]/g, "");

  const url = `${baseUrl}/getFileDateList.do?sDate=${start}&eDate=${end}&format=json&key=${GEMS_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GEMS API returned status: ${response.status}`);
  }
  const data = await response.json();

  if (!data || !Array.isArray(data.list) || data.list.length === 0) {
    throw new Error(`GEMS API for ${baseUrl} returned no data.`);
  }

  return data.list
    .map((item) => item.item)
    .sort()
    .pop();
}

async function refreshGemsLayer(layerName) {
  const layer = GEMS_LAYERS[layerName];
  if (!layer) return;

  console.log(`\n[GEMS-${layerName.toUpperCase()}] Starting image refresh...`);
  try {
    const timestamp = await fetchLatestGemsTimestamp(layer.baseUrl);
    console.log(
      `[GEMS-${layerName.toUpperCase()}] Latest timestamp: ${timestamp}`
    );

    const imagePath = path.join(GEMS_DATA_DIR, `${layerName}-${timestamp}.png`);

    try {
      await fs.access(imagePath);
      console.log(
        `[GEMS-${layerName.toUpperCase()}] Using existing image: ${imagePath}`
      );
    } catch {
      console.log(`[GEMS-${layerName.toUpperCase()}] Downloading image...`);
      const imageUrl = `${layer.baseUrl}/getFileItem.do?date=${timestamp}&key=${GEMS_API_KEY}`;
      const response = await fetch(imageUrl);
      if (!response.ok)
        throw new Error(`Download failed with status ${response.status}`);

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(imagePath, imageBuffer);
      console.log(
        `[GEMS-${layerName.toUpperCase()}] Image saved to ${imagePath}`
      );
    }

    layer.latestImageFile = imagePath;
    layer.isReady = true;
    console.log(
      `[GEMS-${layerName.toUpperCase()}] Refresh successful. Layer is ready.`
    );
  } catch (error) {
    layer.isReady = false;
    console.error(
      `[GEMS-${layerName.toUpperCase()}] Refresh failed:`,
      error.message
    );
  }
}
// --- End GEMS Integration ---

// Cache middleware
const getCacheKey = (lat, lon, endpoint) => `${endpoint}_${lat}_${lon}`;

const cacheMiddleware = (endpoint) => {
  return (req, res, next) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return next();

    const cacheKey = getCacheKey(lat, lon, endpoint);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for ${endpoint}: ${cacheKey}`);
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache the response
    res.json = function (data) {
      cache.set(cacheKey, data);
      console.log(`Cached data for ${endpoint}: ${cacheKey}`);
      originalJson.call(this, data);
    };

    next();
  };
};

// Optimized API endpoints with caching and parallel requests
app.get("/api/data", cacheMiddleware("data"), async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    // Use Promise.allSettled for better error handling
    const [currentPollutionResult, weatherResult, airQualityResult] =
      await Promise.allSettled([
        axios.get(`http://api.openweathermap.org/data/2.5/air_pollution`, {
          params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY },
          timeout: 5000,
        }),
        axios.get(`http://api.openweathermap.org/data/2.5/weather`, {
          params: {
            lat,
            lon,
            appid: process.env.OPENWEATHER_API_KEY,
            units: "metric",
          },
          timeout: 5000,
        }),
        axios
          .get(`https://api.openaq.org/v3/locations`, {
            headers: { "X-API-Key": process.env.OPENAQ_API_KEY },
            params: { coordinates: `${lat},${lon}`, radius: 25000, limit: 1 },
            timeout: 8000,
          })
          .catch(() => null), // Non-blocking failure
      ]);

    // Handle results
    if (
      currentPollutionResult.status === "rejected" ||
      weatherResult.status === "rejected"
    ) {
      throw new Error("Failed to fetch essential data");
    }

    const combinedData = {
      ...currentPollutionResult.value.data,
      weather: weatherResult.value.data,
    };

    const airQualityData =
      airQualityResult.status === "fulfilled" && airQualityResult.value
        ? airQualityResult.value.data.results?.[0] || null
        : null;

    res.json({
      location: weatherResult.value.data.name,
      weather: combinedData,
      airQuality: airQualityData,
    });
  } catch (err) {
    console.error("API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch current data" });
  }
});

// Optimized forecast endpoint with caching
app.get("/api/forecast", cacheMiddleware("forecast"), async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    const forecastResponse = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution/forecast`,
      {
        params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY },
        timeout: 8000,
      }
    );

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

// Optimized historical endpoint with caching
app.get("/api/historical", cacheMiddleware("historical"), async (req, res) => {
  const { lat, lon, days } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    const daysBack = Math.min(parseInt(days) || 7, 30); // Limit to 30 days max
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - daysBack * 24 * 60 * 60;

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
        timeout: 10000,
      }
    );

    res.json({
      coord: historicalResponse.data.coord,
      historical: historicalResponse.data.list,
      period: { start: startTime, end: endTime, days: daysBack },
    });
  } catch (err) {
    console.error("Historical API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

// Optimized complete endpoint with intelligent caching and parallel processing
app.get("/api/complete", cacheMiddleware("complete"), async (req, res) => {
  const { lat, lon, days } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    const daysBack = Math.min(parseInt(days) || 7, 30);
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - daysBack * 24 * 60 * 60;

    // Use Promise.allSettled for better error handling
    const [currentRes, forecastRes, weatherRes, historicalRes, airQualityRes] =
      await Promise.allSettled([
        axios.get(`http://api.openweathermap.org/data/2.5/air_pollution`, {
          params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY },
          timeout: 5000,
        }),
        axios.get(
          `http://api.openweathermap.org/data/2.5/air_pollution/forecast`,
          {
            params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY },
            timeout: 8000,
          }
        ),
        axios.get(`http://api.openweathermap.org/data/2.5/weather`, {
          params: {
            lat,
            lon,
            appid: process.env.OPENWEATHER_API_KEY,
            units: "metric",
          },
          timeout: 5000,
        }),
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
            timeout: 10000,
          }
        ),
        axios
          .get(`https://api.openaq.org/v3/locations`, {
            headers: { "X-API-Key": process.env.OPENAQ_API_KEY },
            params: { coordinates: `${lat},${lon}`, radius: 25000, limit: 1 },
            timeout: 8000,
          })
          .catch(() => null), // Non-blocking failure
      ]);

    // Check essential requests
    const essentialFailed = [currentRes, weatherRes].some(
      (result) => result.status === "rejected"
    );
    if (essentialFailed) {
      throw new Error("Failed to fetch essential data");
    }

    // Get air quality data (non-blocking)
    let airQualityData = null;
    if (airQualityRes.status === "fulfilled" && airQualityRes.value) {
      airQualityData = airQualityRes.value.data.results?.[0] || null;
    }

    // Combine current pollution with weather
    const combinedCurrent = {
      ...currentRes.value.data,
      weather: weatherRes.value.data,
    };

    res.json({
      location: weatherRes.value.data.name,
      current: combinedCurrent,
      forecast:
        forecastRes.status === "fulfilled"
          ? {
              coord: forecastRes.value.data.coord,
              list: forecastRes.value.data.list,
            }
          : null,
      historical:
        historicalRes.status === "fulfilled"
          ? {
              coord: historicalRes.value.data.coord,
              list: historicalRes.value.data.list,
              period: { start: startTime, end: endTime, days: daysBack },
            }
          : null,
      airQuality: airQualityData,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Complete API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch complete data" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats(),
    },
  });
});

app.get("/api/gems/:layer/image", async (req, res) => {
  const layerName = req.params.layer;
  const layer = GEMS_LAYERS[layerName];

  if (!layer || !layer.isReady || !layer.latestImageFile) {
    return res
      .status(503)
      .json({
        status: "initializing",
        message: "GEMS image is not ready yet.",
      });
  }
  res.sendFile(layer.latestImageFile);
});

app.get("/api/gems/:layer/bounds", async (req, res) => {
  res.json({ bounds: GEMS_IMAGE_BOUNDS });
});

app.get("/api/cache-stats", (req, res) => {
  res.json(cache.getStats());
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  // Ensure the GEMS data directory exists
  fsSync.mkdirSync(GEMS_DATA_DIR, { recursive: true });
  // Run the initial GEMS image refresh for all layers in the background
  for (const layerName in GEMS_LAYERS) {
    refreshGemsLayer(layerName);
  }
  console.log(`Optimized server running on port ${PORT}`);
  console.log("Available endpoints:");
  console.log("- GET /api/data - Current air quality");
  console.log("- GET /api/forecast - Air quality forecast");
  console.log("- GET /api/historical?days=7 - Historical data");
  console.log("- GET /api/complete - All data combined");
  console.log("- GET /api/health - Server health check");
  console.log("- GET /api/cache-stats - Cache statistics");
  console.log("\nOptimizations enabled:");
  console.log("- Response compression");
  console.log("- 5-minute data caching");
  console.log("- Rate limiting (100 req/15min)");
  console.log("- Parallel API requests");
  console.log("- Static file caching");
  console.log("- Error resilience with Promise.allSettled");
});
