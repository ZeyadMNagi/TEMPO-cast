async function handleComplete(lat, lon, days, headers) {
  const daysBack = parseInt(days, 10);
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - daysBack * 24 * 60 * 60;

  const [currentWeatherRes, currentPollutionRes, forecastRes, historicalRes] =
    await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${startTime}&end=${endTime}&appid=${process.env.OPENWEATHER_API_KEY}`
      ),
    ]);

  // Check if all responses are OK
  if (
    !currentWeatherRes.ok ||
    !currentPollutionRes.ok ||
    !forecastRes.ok ||
    !historicalRes.ok
  ) {
    throw new Error("Failed to fetch data from OpenWeatherMap");
  }

  // Parse all JSON responses concurrently
  const [
    currentWeatherData,
    currentPollutionData,
    forecastData,
    historicalData,
  ] = await Promise.all([
    currentWeatherRes.json(),
    currentPollutionRes.json(),
    forecastRes.json(),
    historicalRes.json(),
  ]);

  // Try to get OpenAQ data (non-blocking)
  let airQualityData = null;
  try {
    const airRes = await fetch(
      `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=50000&limit=1`,
      { headers: { "X-API-Key": process.env.OPENAQ_API_KEY || "" } }
    );
    if (airRes.ok) {
      const airData = await airRes.json();
      airQualityData = airData.results?.[0] || null;
    }
  } catch (airError) {
    console.warn("OpenAQ API unavailable");
  }

  // Combine current pollution with weather
  const combinedCurrent = {
    ...currentWeatherData,
    pollution: currentPollutionData,
  };

  const responseBody = {
    location: currentWeatherData.name,
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

