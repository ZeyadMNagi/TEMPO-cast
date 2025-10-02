const express = require("express");
const axios = require("axios");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const NodeCache = require("node-cache");
const serverless = require("serverless-http");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();
const app = express();

app.set("trust proxy", 1);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Subscriber Schema
const SubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    phone: String,
    notificationMethods: Object,
    frequency: String,
    healthProfile: Object,
    threshold: String,
    locations: Object,
    active: { type: Boolean, default: true },
    sensitivityLevel: String,
    lastNotified: Date,
  },
  { timestamps: true }
);

const Subscriber = mongoose.model("Subscriber", SubscriberSchema);
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
const router = express.Router();
const PORT = process.env.PORT || 3000;

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

if (process.env.NODE_ENV === "production") {
  router.use(limiter);
}

// --- GEMS Image Service Integration ---
const GEMS_API_KEY = process.env.OPEN_API_GEMS;
const GEMS_DATA_DIR = path.join(require("os").tmpdir(), "gems_data");
const GEMS_IMAGE_BOUNDS = [
  [-34, 48],
  [58, 168],
];

const gemsImageCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 }); // 1 hour cache

const GEMS_LAYERS = {
  o3: {
    baseUrl: "https://nesc.nier.go.kr:38032/api/GK2/L2/O3T/FOR/image",
  },
  hcho: {
    baseUrl: "https://nesc.nier.go.kr:38032/api/GK2/L2/HCHO/FOR/image",
  },
  no2: {
    baseUrl: "https://nesc.nier.go.kr:38032/api/GK2/L2/NO2_Trop/FOR/image",
  },
};

async function fetchLatestGemsTimestamp(baseUrl) {
  const now = new Date();
  const end = now.toISOString().slice(0, 16).replace(/[-T:]/g, "");
  now.setHours(now.getHours() - 24);
  const start = now.toISOString().slice(0, 16).replace(/[-T:]/g, "");

  const url = `${baseUrl}/getFileDateList.do?sDate=${start}&eDate=${end}&format=json&key=${GEMS_API_KEY}`;

  console.log(`[GEMS] Fetching timestamp from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    console.log(`[GEMS] Timestamp API response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[GEMS] Timestamp API error response:`,
        text.substring(0, 200)
      );
      throw new Error(`GEMS API returned status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.list) || data.list.length === 0) {
      console.error(
        `[GEMS] Invalid data structure:`,
        JSON.stringify(data).substring(0, 200)
      );
      throw new Error(`GEMS API returned no data.`);
    }

    const timestamps = data.list.map((item) => item.item);
    console.log(
      `[GEMS] Found ${timestamps.length} timestamps, latest: ${
        timestamps[timestamps.length - 1]
      }`
    );

    return timestamps.sort().pop();
  } catch (error) {
    console.error(`[GEMS] fetchLatestGemsTimestamp failed:`, error);
    throw error;
  }
}

async function fetchGemsImage(layerName) {
  const layer = GEMS_LAYERS[layerName];
  if (!layer) {
    throw new Error(`Unknown GEMS layer: ${layerName}`);
  }

  // Check cache first
  const cachedImage = gemsImageCache.get(layerName);
  if (cachedImage) {
    console.log(`[GEMS-${layerName.toUpperCase()}] Using cached image`);
    return cachedImage;
  }

  console.log(`[GEMS-${layerName.toUpperCase()}] Fetching fresh image...`);

  try {
    // Get latest timestamp
    const timestamp = await fetchLatestGemsTimestamp(layer.baseUrl);
    console.log(
      `[GEMS-${layerName.toUpperCase()}] Latest timestamp: ${timestamp}`
    );

    // Download image with timeout
    const imageUrl = `${layer.baseUrl}/getFileItem.do?date=${timestamp}&key=${GEMS_API_KEY}`;
    console.log(`[GEMS-${layerName.toUpperCase()}] Fetching from: ${imageUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);

    console.log(
      `[GEMS-${layerName.toUpperCase()}] Response status: ${response.status}`
    );
    console.log(
      `[GEMS-${layerName.toUpperCase()}] Content-Type: ${response.headers.get(
        "content-type"
      )}`
    );

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(
      `[GEMS-${layerName.toUpperCase()}] Image downloaded (${
        imageBuffer.length
      } bytes, ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB)`
    );

    // Verify it's actually an image
    if (imageBuffer.length < 100) {
      throw new Error(
        `Image too small (${imageBuffer.length} bytes) - likely not a valid image`
      );
    }

    // Check PNG magic bytes
    const isPNG =
      imageBuffer[0] === 0x89 &&
      imageBuffer[1] === 0x50 &&
      imageBuffer[2] === 0x4e &&
      imageBuffer[3] === 0x47;
    if (!isPNG) {
      console.warn(
        `[GEMS-${layerName.toUpperCase()}] Warning: Does not appear to be a PNG file`
      );
      console.log(
        `[GEMS-${layerName.toUpperCase()}] First bytes:`,
        imageBuffer.slice(0, 10)
      );
    }

    // Cache the image buffer in memory
    gemsImageCache.set(layerName, imageBuffer);
    console.log(`[GEMS-${layerName.toUpperCase()}] Image cached successfully`);

    return imageBuffer;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(
        `[GEMS-${layerName.toUpperCase()}] Fetch timeout after 25s`
      );
      throw new Error("GEMS API request timed out");
    }
    console.error(
      `[GEMS-${layerName.toUpperCase()}] Fetch failed:`,
      error.message
    );
    throw error;
  }
}

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
router.get("/data", cacheMiddleware("data"), async (req, res) => {
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
router.get("/forecast", cacheMiddleware("forecast"), async (req, res) => {
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
router.get("/historical", cacheMiddleware("historical"), async (req, res) => {
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
router.get("/complete", cacheMiddleware("complete"), async (req, res) => {
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
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats(),
    },
    gems: {
      cachedLayers: gemsImageCache.keys(),
      cacheStats: gemsImageCache.getStats(),
    },
  });
});

// GEMS image endpoint - fetch on demand
router.get("/gems/:layer/image", async (req, res) => {
  const layerName = req.params.layer;

  if (!GEMS_LAYERS[layerName]) {
    return res.status(404).json({ error: "Unknown GEMS layer" });
  }

  try {
    console.log(`[GEMS-${layerName}] Image request received`);
    const imageBuffer = await fetchGemsImage(layerName);
    console.log(
      `[GEMS-${layerName}] Sending image (${imageBuffer.length} bytes)`
    );

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.set("Content-Length", imageBuffer.length);
    res.send(imageBuffer);
  } catch (error) {
    console.error(`[GEMS-${layerName}] Error:`, error);
    res.status(503).json({
      error: "Failed to fetch GEMS image",
      message: error.message,
      layer: layerName,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Debug endpoint to test GEMS API connectivity
router.get("/gems/:layer/debug", async (req, res) => {
  const layerName = req.params.layer;
  const layer = GEMS_LAYERS[layerName];

  if (!layer) {
    return res.status(404).json({ error: "Unknown GEMS layer" });
  }

  const debugInfo = {
    layer: layerName,
    baseUrl: layer.baseUrl,
    apiKey: GEMS_API_KEY ? `${GEMS_API_KEY.substring(0, 10)}...` : "NOT SET",
    cached: gemsImageCache.has(layerName),
    cacheStats: gemsImageCache.getStats(),
    steps: [],
  };

  try {
    // Step 1: Get timestamp
    debugInfo.steps.push({ step: 1, action: "Fetching timestamp list..." });
    const now = new Date();
    const end = now.toISOString().slice(0, 16).replace(/[-T:]/g, "");
    now.setHours(now.getHours() - 24);
    const start = now.toISOString().slice(0, 16).replace(/[-T:]/g, "");

    const listUrl = `${layer.baseUrl}/getFileDateList.do?sDate=${start}&eDate=${end}&format=json&key=${GEMS_API_KEY}`;
    debugInfo.listUrl = listUrl;

    const listResponse = await fetch(listUrl);
    debugInfo.steps.push({
      step: 1,
      status: listResponse.status,
      ok: listResponse.ok,
    });

    if (!listResponse.ok) {
      throw new Error(`Timestamp API returned ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    debugInfo.steps.push({
      step: 1,
      result: "success",
      dataReceived: listData.list?.length || 0,
    });

    if (!listData.list || listData.list.length === 0) {
      throw new Error("No timestamps available");
    }

    const timestamp = listData.list
      .map((item) => item.item)
      .sort()
      .pop();
    debugInfo.timestamp = timestamp;
    debugInfo.steps.push({
      step: 2,
      action: "Latest timestamp",
      value: timestamp,
    });

    // Step 2: Try to fetch image
    const imageUrl = `${layer.baseUrl}/getFileItem.do?date=${timestamp}&key=${GEMS_API_KEY}`;
    debugInfo.imageUrl = imageUrl;
    debugInfo.steps.push({ step: 3, action: "Fetching image..." });

    const imageResponse = await fetch(imageUrl);
    debugInfo.steps.push({
      step: 3,
      status: imageResponse.status,
      ok: imageResponse.ok,
      contentType: imageResponse.headers.get("content-type"),
      contentLength: imageResponse.headers.get("content-length"),
    });

    if (imageResponse.ok) {
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      debugInfo.steps.push({
        step: 3,
        result: "success",
        imageSize: imageBuffer.length,
        imageSizeMB: (imageBuffer.length / 1024 / 1024).toFixed(2),
      });
      debugInfo.success = true;
    } else {
      debugInfo.success = false;
      debugInfo.error = `Image fetch returned ${imageResponse.status}`;
    }

    res.json(debugInfo);
  } catch (error) {
    debugInfo.success = false;
    debugInfo.error = error.message;
    debugInfo.errorStack =
      process.env.NODE_ENV === "development" ? error.stack : undefined;
    res.status(500).json(debugInfo);
  }
});

// GEMS bounds endpoint - always returns bounds immediately
router.get("/gems/:layer/bounds", async (req, res) => {
  const layerName = req.params.layer;

  if (!GEMS_LAYERS[layerName]) {
    return res.status(404).json({ error: "Unknown GEMS layer" });
  }

  // Always return bounds immediately - no "ready" check needed
  res.json({
    bounds: GEMS_IMAGE_BOUNDS,
    layer: layerName,
    cached: gemsImageCache.has(layerName),
  });
});

router.get("/cache-stats", (req, res) => {
  res.json({
    weather: cache.getStats(),
    gems: gemsImageCache.getStats(),
  });
});

app.use("/api/", router);

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

router.post("/notifications/subscribe", async (req, res) => {
  try {
    const {
      email,
      phone,
      notificationMethods,
      frequency,
      healthProfile,
      threshold,
      locations,
    } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    // Check if subscriber already exists
    let subscriber = await Subscriber.findOne({ email });
    if (subscriber) {
      // Update existing subscriber
      subscriber.set({
        email,
        phone: phone || null,
        notificationMethods: notificationMethods || { email: true },
        frequency: frequency || "daily",
        healthProfile: {
          conditions: healthProfile?.conditions || [],
          ageGroup: healthProfile?.ageGroup || null,
          pregnant: healthProfile?.pregnant || false,
          outdoorWorker: healthProfile?.outdoorWorker || false,
          athlete: healthProfile?.athlete || false,
        },
        threshold: threshold || "standard",
        locations: {
          home: locations?.home || null,
          work: locations?.work || null,
        },
        active: true, // Re-activate if they unsubscribed
      });
    } else {
      // Create new subscriber
      subscriber = new Subscriber({
        email,
        phone: phone || null,
        notificationMethods: notificationMethods || { email: true },
        frequency: frequency || "daily",
        healthProfile: {
          conditions: healthProfile?.conditions || [],
          ageGroup: healthProfile?.ageGroup || null,
          pregnant: healthProfile?.pregnant || false,
          outdoorWorker: healthProfile?.outdoorWorker || false,
          athlete: healthProfile?.athlete || false,
        },
        threshold: threshold || "standard",
        locations: {
          home: locations?.home || null,
          work: locations?.work || null,
        },
      });
    }

    subscriber.sensitivityLevel = calculateSensitivityLevel(
      subscriber.healthProfile
    );
    await subscriber.save();

    console.log(
      `[Notifications] Subscriber saved: ${email} (ID: ${subscriber._id})`
    );

    res.json({
      success: true,
      subscriberId: subscriber._id,
      message: "Successfully subscribed to air quality notifications",
      subscriber: {
        email: subscriber.email,
        frequency: subscriber.frequency,
        sensitivityLevel: subscriber.sensitivityLevel,
      },
    });
  } catch (error) {
    console.error("[Notifications] Subscription error:", error);
    res.status(500).json({ error: "Failed to subscribe to notifications" });
  }
});

// Update subscription preferences
router.put("/notifications/update/:subscriberId", async (req, res) => {
  try {
    const { subscriberId } = req.params;
    // Add a check for a valid ObjectId format
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
      return res.status(400).json({ error: "Invalid subscriber ID format" });
    }

    const subscriber = await Subscriber.findById(subscriberId);

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    // Update fields
    const allowedUpdates = [
      "notificationMethods",
      "frequency",
      "healthProfile",
      "threshold",
      "locations",
      "phone",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        subscriber[field] = req.body[field];
      }
    });

    subscriber.sensitivityLevel = calculateSensitivityLevel(
      subscriber.healthProfile
    );
    await subscriber.save();

    console.log(`[Notifications] Preferences updated for ${subscriber.email}`);

    res.json({
      success: true,
      message: "Preferences updated successfully",
      subscriber: {
        email: subscriber.email,
        frequency: subscriber.frequency,
        sensitivityLevel: subscriber.sensitivityLevel,
      },
    });
  } catch (error) {
    console.error("[Notifications] Update error:", error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// Unsubscribe endpoint
router.delete("/notifications/unsubscribe/:subscriberId", async (req, res) => {
  try {
    const { subscriberId } = req.params;
    const subscriber = await Subscriber.findByIdAndUpdate(
      subscriberId,
      { active: false, unsubscribedAt: new Date() },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    console.log(`[Notifications] Unsubscribed: ${subscriber.email}`);

    res.json({
      success: true,
      message: "Successfully unsubscribed from notifications",
    });
  } catch (error) {
    console.error("[Notifications] Unsubscribe error:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Get subscriber preferences
router.get("/notifications/preferences/:subscriberId", async (req, res) => {
  try {
    const { subscriberId } = req.params;
    const subscriber = await Subscriber.findById(subscriberId);

    if (!subscriber || !subscriber.active) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    res.json({
      success: true,
      subscriber,
    });
  } catch (error) {
    console.error("[Notifications] Get preferences error:", error);
    res.status(500).json({ error: "Failed to retrieve preferences" });
  }
});

// Helper function to calculate sensitivity level
function calculateSensitivityLevel(healthProfile) {
  let score = 0;

  // Age-based sensitivity
  if (
    healthProfile.ageGroup === "child" ||
    healthProfile.ageGroup === "senior"
  ) {
    score += 2;
  }

  // Conditions
  const highRiskConditions = ["asthma", "copd", "heart"];
  healthProfile.conditions.forEach((condition) => {
    if (highRiskConditions.includes(condition)) {
      score += 3;
    } else {
      score += 1;
    }
  });

  // Other factors
  if (healthProfile.pregnant) score += 2;
  if (healthProfile.outdoorWorker) score += 1;
  if (healthProfile.athlete) score += 1;

  // Determine level
  if (score >= 5) return "high";
  if (score >= 2) return "moderate";
  return "low";
}

const AQI_BREAKPOINTS = {
  pm2_5: [
    { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
    { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
  ],
  o3_8hr: [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 70, iLow: 51, iHigh: 100 },
    { cLow: 71, cHigh: 85, iLow: 101, iHigh: 150 },
    { cLow: 86, cHigh: 105, iLow: 151, iHigh: 200 },
    { cLow: 106, cHigh: 200, iLow: 201, iHigh: 300 },
  ],
  o3_1hr: [
    { cLow: 125, cHigh: 164, iLow: 101, iHigh: 150 },
    { cLow: 165, cHigh: 204, iLow: 151, iHigh: 200 },
    { cLow: 205, cHigh: 404, iLow: 201, iHigh: 300 },
    { cLow: 405, cHigh: 504, iLow: 301, iHigh: 400 },
    { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
  ],
  co: [
    { cLow: 0.0, cHigh: 4.4, iLow: 0, iHigh: 50 },
    { cLow: 4.5, cHigh: 9.4, iLow: 51, iHigh: 100 },
    { cLow: 9.5, cHigh: 12.4, iLow: 101, iHigh: 150 },
    { cLow: 12.5, cHigh: 15.4, iLow: 151, iHigh: 200 },
    { cLow: 15.5, cHigh: 30.4, iLow: 201, iHigh: 300 },
    { cLow: 30.5, cHigh: 40.4, iLow: 301, iHigh: 400 },
    { cLow: 40.5, cHigh: 50.4, iLow: 401, iHigh: 500 },
  ],
  so2: [
    { cLow: 0, cHigh: 35, iLow: 0, iHigh: 50 },
    { cLow: 36, cHigh: 75, iLow: 51, iHigh: 100 },
    { cLow: 76, cHigh: 185, iLow: 101, iHigh: 150 },
    { cLow: 186, cHigh: 304, iLow: 151, iHigh: 200 },
    { cLow: 305, cHigh: 604, iLow: 201, iHigh: 300 },
    { cLow: 605, cHigh: 804, iLow: 301, iHigh: 400 },
    { cLow: 805, cHigh: 1004, iLow: 401, iHigh: 500 },
  ],
  no2: [
    { cLow: 0, cHigh: 53, iLow: 0, iHigh: 50 },
    { cLow: 54, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 360, iLow: 101, iHigh: 150 },
    { cLow: 361, cHigh: 649, iLow: 151, iHigh: 200 },
    { cLow: 650, cHigh: 1249, iLow: 201, iHigh: 300 },
    { cLow: 1250, cHigh: 1649, iLow: 301, iHigh: 400 },
    { cLow: 1650, cHigh: 2049, iLow: 401, iHigh: 500 },
  ],
};

function calculateIndividualAQI(concentration, pollutant) {
  if (concentration < 0) return 0;

  const breakpoints = AQI_BREAKPOINTS[pollutant];
  if (!breakpoints) return 0;

  let breakpoint = breakpoints.find(
    (bp) => concentration >= bp.cLow && concentration <= bp.cHigh
  );

  if (!breakpoint) {
    if (concentration > breakpoints[breakpoints.length - 1].cHigh) {
      breakpoint = breakpoints[breakpoints.length - 1];
    } else {
      return 0;
    }
  }

  const aqi =
    ((breakpoint.iHigh - breakpoint.iLow) /
      (breakpoint.cHigh - breakpoint.cLow)) *
      (concentration - breakpoint.cLow) +
    breakpoint.iLow;

  return Math.round(aqi);
}

function calculateOverallAQI(components) {
  const individualAQIs = {};

  // PM2.5 (μg/m³) - direct use
  if (components.pm2_5) {
    individualAQIs.pm2_5 = calculateIndividualAQI(components.pm2_5, "pm2_5");
  }

  // PM10 (μg/m³) - direct use
  if (components.pm10) {
    individualAQIs.pm10 = calculateIndividualAQI(components.pm10, "pm10");
  }

  // O3 (μg/m³) - convert to ppb (μg/m³ / 1.96 ≈ ppb for O3)
  if (components.o3) {
    const o3_ppb = components.o3 / 1.96; // Convert μg/m³ to ppb
    individualAQIs.o3 = calculateIndividualAQI(o3_ppb, "o3_8hr");
  }

  // CO (μg/m³) - convert to ppm (μg/m³ / 1145 ≈ ppm for CO)
  if (components.co) {
    const co_ppm = components.co / 1145; // Convert μg/m³ to ppm
    individualAQIs.co = calculateIndividualAQI(co_ppm, "co");
  }

  // SO2 (μg/m³) - convert to ppb (μg/m³ / 2.62 ≈ ppb for SO2)
  if (components.so2) {
    const so2_ppb = components.so2 / 2.62; // Convert μg/m³ to ppb
    individualAQIs.so2 = calculateIndividualAQI(so2_ppb, "so2");
  }

  // NO2 (μg/m³) - convert to ppb (μg/m³ / 1.88 ≈ ppb for NO2)
  if (components.no2) {
    const no2_ppb = components.no2 / 1.88; // Convert μg/m³ to ppb
    individualAQIs.no2 = calculateIndividualAQI(no2_ppb, "no2");
  }

  const aqiValues = Object.values(individualAQIs).filter((val) => val > 0);
  return { overall: aqiValues.length > 0 ? Math.max(...aqiValues) : 0 };
}

// Check air quality and send notifications (scheduled job)
async function checkAndNotifySubscribers() {
  console.log(
    `[Notifications] Checking AQ for ${notificationSubscribers.size} subscribers`
  );

  const subscribers = await Subscriber.find({ active: true });
  console.log(
    `[Notifications] Checking AQ for ${subscribers.length} active subscribers`
  );

  for (const subscriber of subscribers) {
    if (!subscriber.active) continue;

    try {
      const coords = parseLocationCoordinates(subscriber.locations.home);
      if (!coords) continue;

      const aqResponse = await axios.get(
        `http://api.openweathermap.org/data/2.5/air_pollution`,
        {
          params: {
            lat: coords.lat,
            lon: coords.lon,
            appid: process.env.OPENWEATHER_API_KEY,
          },
          timeout: 5000,
        }
      );

      const pollution = aqResponse.data.list[0];
      const components = pollution.components;

      const aqi = calculateOverallAQI(components).overall;

      if (shouldNotify(subscriber, aqi)) {
        await sendNotification(subscriber, aqi, components);
        subscriber.lastNotified = new Date().toISOString();
        await subscriber.save();
      }
    } catch (error) {
      console.error(
        `[Notifications] Error checking AQ for ${subscriber.email}:`,
        error.message
      );
    }
  }
}

function shouldNotify(subscriber, currentAQI) {
  const thresholds = {
    sensitive: 51,
    standard: 101,
    high: 151,
  };

  const threshold = thresholds[subscriber.threshold] || 101;

  if (currentAQI < threshold) return false;

  if (!subscriber.lastNotified) return true;

  const lastNotifiedTime = new Date(subscriber.lastNotified).getTime();
  const now = Date.now();
  const hoursSinceLastNotification =
    (now - lastNotifiedTime) / (1000 * 60 * 60);

  const frequencyHours = {
    realtime: 1,
    hourly: 1,
    daily: 24,
    weekly: 168,
  };

  const requiredHours = frequencyHours[subscriber.frequency] || 24;

  return hoursSinceLastNotification >= requiredHours;
}

// Send notification to subscriber
async function sendNotification(subscriber, aqi, components) {
  const aqiCategory = getAQICategoryForNotification(aqi);
  const healthAdvice = getPersonalizedHealthAdvice(
    subscriber.healthProfile,
    aqi,
    components
  );

  console.log(
    `[Notifications] Sending alert to ${subscriber.email} - AQI: ${aqi}`
  );

  // Only send email notifications
  await sendEmailNotification(subscriber, aqi, aqiCategory, healthAdvice);

  // The subscriber.notificationMethods.email check is now implicit
}

function parseLocationCoordinates(location) {
  if (!location) return null;

  const coordMatch = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lon: parseFloat(coordMatch[2]),
    };
  }

  return null;
}

// Get AQI category for notifications
function getAQICategoryForNotification(aqi) {
  if (aqi >= 301) return { level: "Hazardous", color: "#7e0023", emoji: "☠️" };
  if (aqi >= 201)
    return { level: "Very Unhealthy", color: "#8f3f97", emoji: "⚠️" };
  if (aqi >= 151) return { level: "Unhealthy", color: "#ff0000", emoji: "⚠️" };
  if (aqi >= 101)
    return {
      level: "Unhealthy for Sensitive Groups",
      color: "#ff7e00",
      emoji: "⚡",
    };
  if (aqi >= 51) return { level: "Moderate", color: "#ffff00", emoji: "ℹ️" };
  return { level: "Good", color: "#00e400", emoji: "✅" };
}

// Generate personalized health advice
function getPersonalizedHealthAdvice(healthProfile, aqi, components) {
  const advice = [];

  // High-risk conditions
  if (
    healthProfile.conditions.includes("asthma") ||
    healthProfile.conditions.includes("copd")
  ) {
    if (aqi >= 101) {
      advice.push("⚠️ IMPORTANT: Stay indoors and avoid all outdoor activity");
      advice.push("💊 Keep your rescue inhaler accessible");
    } else if (aqi >= 51) {
      advice.push("⚠️ Limit outdoor activities and watch for symptoms");
    }
  }

  if (healthProfile.conditions.includes("heart")) {
    if (aqi >= 101) {
      advice.push(
        "❤️ Avoid strenuous activities - increased cardiovascular risk"
      );
    }
  }

  // Age-based advice
  if (healthProfile.ageGroup === "child") {
    if (aqi >= 101) {
      advice.push(
        "👶 Keep children indoors - their lungs are still developing"
      );
    }
  }

  if (healthProfile.ageGroup === "senior") {
    if (aqi >= 101) {
      advice.push("👴 Seniors: Stay indoors and monitor health closely");
    }
  }

  // Pregnancy
  if (healthProfile.pregnant) {
    if (aqi >= 101) {
      advice.push("🤰 Pregnant: Avoid outdoor exposure to protect your baby");
    }
  }

  // Outdoor workers
  if (healthProfile.outdoorWorker) {
    if (aqi >= 101) {
      advice.push("👷 Work outdoors? Wear N95 mask and take frequent breaks");
    }
  }

  // Athletes
  if (healthProfile.athlete) {
    if (aqi >= 101) {
      advice.push("🏃 Cancel outdoor exercise - move workout indoors");
    } else if (aqi >= 51) {
      advice.push("🏃 Reduce exercise intensity outdoors");
    }
  }

  // Pollutant-specific advice
  if (components.pm2_5 > 55.5) {
    advice.push("😷 Wear N95/KN95 mask if going outside");
    advice.push("🏠 Use air purifier indoors");
  }

  if (components.o3 / 1.96 > 125) {
    advice.push("☀️ Avoid outdoor activities during peak sun hours (10am-4pm)");
  }

  // General advice
  if (aqi >= 151) {
    advice.push("🚪 Close windows and doors");
    advice.push("💧 Stay well hydrated");
    advice.push("📞 Contact doctor if experiencing symptoms");
  }

  return advice;
}

async function sendEmailNotification(
  subscriber,
  aqi,
  aqiCategory,
  healthAdvice
) {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .aqi-badge { display: inline-block; padding: 15px 30px; background: ${
          aqiCategory.color
        }; color: white; font-size: 24px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
        .advice { background: #f9fafb; padding: 15px; border-left: 4px solid ${
          aqiCategory.color
        }; margin: 15px 0; }
        .advice ul { margin: 10px 0; padding-left: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${aqiCategory.emoji} Air Quality Alert</h1>
          <p>Personalized notification for ${subscriber.locations.home}</p>
        </div>
        <div class="content">
          <h2>Current Air Quality</h2>
          <div class="aqi-badge">AQI ${aqi} - ${aqiCategory.level}</div>
          
          <div class="advice">
            <h3>Your Personalized Health Recommendations:</h3>
            <ul>
              ${healthAdvice.map((advice) => `<li>${advice}</li>`).join("")}
            </ul>
          </div>
          
          <p><strong>What does this mean for you?</strong></p>
          <p>Based on your health profile (${
            subscriber.healthProfile.conditions.join(", ") ||
            "no specific conditions"
          }${
    subscriber.healthProfile.ageGroup
      ? `, ${subscriber.healthProfile.ageGroup}`
      : ""
  }), current air quality conditions may affect your health.</p>
          
          <a href="https://globaltempo.netlify.app/app?lat=${
            subscriber.locations.home
          }" class="button">
            View Detailed Forecast →
          </a>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 14px; color: #6b7280;">
            <strong>Stay Updated:</strong> We'll continue monitoring air quality in your area and send you updates based on your preferences (${
              subscriber.frequency
            } notifications).
          </p>
        </div>
        <div class="footer">
          <p>Global TEMPO Air Quality Monitoring</p>
          <p>Powered by NASA TEMPO Satellite Data</p>
          <p><a href="https://globaltempo.netlify.app/unsubscribe/${
            subscriber.id
          }" style="color: #6b7280;">Unsubscribe</a> | <a href="https://globaltempo.netlify.app/preferences/${
    subscriber.id
  }" style="color: #6b7280;">Update Preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    // Ensure email credentials are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error(
        "[Email] Error: EMAIL_USER and EMAIL_PASSWORD must be set in .env file."
      );
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: '"Global TEMPO Alerts" <alerts@globaltempo.com>',
      to: subscriber.email,
      subject: `${aqiCategory.emoji} Air Quality Alert - AQI ${aqi}`,
      html: emailHTML,
    });

    console.log(
      `[Email] Notification sent successfully to ${subscriber.email}`
    );
    return true;
  } catch (error) {
    console.error(
      `[Email] Failed to send notification to ${subscriber.email}:`,
      error
    );
    return false;
  }
}

// Schedule notifications check (run every hour)
// In production, use a proper job scheduler like node-cron or Bull
/*
const cron = require('node-cron');

// Run every hour
cron.schedule('0 * * * *', () => {
  console.log('[Notifications] Running scheduled check...');
  checkAndNotifySubscribers().catch(console.error);
});
 
// For realtime alerts, run every 15 minutes
cron.schedule('15 * * * *', async () => {
  // Only check subscribers with realtime frequency
  const realtimeSubscribers = await Subscriber.find({ active: true, frequency: 'realtime' });
  for (const subscriber of realtimeSubscribers) {
    // Check their locations
    const coords = parseLocationCoordinates(subscriber.locations.home);
    if (coords) {
      try {
        const aqResponse = await axios.get(
          `http://api.openweathermap.org/data/2.5/air_pollution`,
          {
            params: {
              lat: coords.lat,
              lon: coords.lon,
              appid: process.env.OPENWEATHER_API_KEY,
            },
            timeout: 5000,
          }
        );
        
        const aqi = calculateOverallAQI(aqResponse.data.list[0].components).overall;
        
        if (shouldNotify(subscriber, aqi)) {
          await sendNotification(subscriber, aqi, aqResponse.data.list[0].components);
          subscriber.lastNotified = new Date().toISOString();
          await subscriber.save();
        }
      } catch (error) {
        console.error(`[Realtime] Error for ${subscriber.email}:`, error.message);
      }
    }
  }
});
*/

// Manual trigger endpoint for testing
router.post("/notifications/test", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required in the request body" });
    }

    // Create a mock subscriber object for the test
    const subscriber = {
      email: email,
      locations: { home: "Test Location" },
      healthProfile: {
        conditions: ["asthma"],
        ageGroup: "adult",
        pregnant: false,
        outdoorWorker: true,
        athlete: false,
      },
    };
    // Send test notification
    const testAQI = 125;
    const testComponents = {
      pm2_5: 45,
      pm10: 80,
      o3: 200,
      no2: 60,
      so2: 30,
      co: 500,
    };

    const aqiCategory = getAQICategoryForNotification(testAQI);
    const healthAdvice = getPersonalizedHealthAdvice(
      subscriber.healthProfile,
      testAQI,
      testComponents
    );

    const emailSent = await sendEmailNotification(
      subscriber,
      testAQI,
      aqiCategory,
      healthAdvice
    );
    if (!emailSent) throw new Error("sendEmailNotification returned false.");

    res.json({
      success: true,
      message: "Test notification sent",
      details: {
        aqi: testAQI,
        category: aqiCategory.level,
        adviceCount: healthAdvice.length,
      },
    });
  } catch (error) {
    console.error("[Notifications] Test error:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

// Admin endpoint to list all subscribers (add authentication in production)
router.get("/notifications/admin/subscribers", async (req, res) => {
  const subscribers = await Subscriber.find({}).select(
    "id email frequency sensitivityLevel active createdAt lastNotified"
  );

  res.json({
    success: true,
    total: subscribers.length,
    active: subscribers.filter((s) => s.active).length,
    subscribers,
  });
});

module.exports.checkAndNotifySubscribers = checkAndNotifySubscribers;
module.exports.calculateOverallAQI = calculateOverallAQI;

module.exports.handler = serverless(app);

// This part is for local development only
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Local server running on port ${PORT}`));
}
