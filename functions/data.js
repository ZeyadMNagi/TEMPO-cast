export async function handler(event) {
  const { lat, lon } = event.queryStringParameters || {};
  if (!lat || !lon)
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing lat/lon" }),
    };

  try {
    const weatherRes = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`
    );
    const weatherData = await weatherRes.json();

    const airRes = await fetch(
      `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=25000&limit=1`
    );
    const airData = await airRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        location: weatherData.name || null,
        weather: weatherData,
        airQuality: airData.results?.[0] || null,
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch data" }),
    };
  }
}
