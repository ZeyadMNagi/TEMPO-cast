export async function handler(event) {
  const { httpMethod, path, queryStringParameters } = event;
  const { lat, lon, days } = queryStringParameters || {};

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (!lat || !lon) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing lat/lon parameters" }),
    };
  }

  try {
    // Determine which endpoint based on path or query parameter
    const endpoint = event.queryStringParameters.endpoint || "data";

    switch (endpoint) {
      case "forecast":
        return await handleForecast(lat, lon, headers);

      case "historical":
        return await handleHistorical(lat, lon, days, headers);

      case "complete":
        return await handleComplete(lat, lon, days, headers);

      default:
        return await handleCurrent(lat, lon, headers);
    }
  } catch (error) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to fetch data",
        details: error.message,
      }),
    };
  }
}

// Handle current air quality data
// ...
async function handleComplete(lat, lon, days, headers) {
  const daysBack = parseInt(days, 10);
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - daysBack * 24 * 60 * 60;

  const [currentRes, forecastRes, historicalRes] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${startTime}&end=${endTime}&appid=${process.env.OPENWEATHER_API_KEY}`
    ),
  ]);

  if (!currentRes.ok || !forecastRes.ok || !historicalRes.ok) {
    throw new Error("Failed to fetch data from OpenWeatherMap");
  }

  const [currentData, forecastData, historicalData] = await Promise.all([
    currentRes.json(),
    forecastRes.json(),
    historicalRes.json(),
  ]);

  // Try to get OpenAQ data (non-blocking)
  let airQualityData = null;
  try {
    const airRes = await fetch(
      `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=25000&limit=1`,
      { headers: { "X-API-Key": process.env.OPENAQ_API_KEY || "" } }
    );
    if (airRes.ok) {
      const airData = await airRes.json();
      airQualityData = airData.results?.[0] || null;
    }
  } catch (airError) {
    console.warn("OpenAQ API unavailable");
  }

  // Combine pollution with weather
  const combinedCurrent = {
    ...currentData,
    weather: currentData,
  };

  const responseBody = {
    location: currentData.name,
    current: combinedCurrent,
    forecast: {
      coord: forecastData.coord,
      list: forecastData.list,
    },
    historical: {
      coord: historicalData.coord,
      list: historicalData.list,
      period: { start: startTime, end: endTime, days: daysBack },
    },
    airQuality: airQualityData,
    timestamp: Date.now(),
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(responseBody),
  };
}
