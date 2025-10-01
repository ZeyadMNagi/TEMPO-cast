// Netlify Scheduled Function to pre-warm GEMS cache
// This runs every hour to keep GEMS data fresh

const { schedule } = require("@netlify/functions");

const GEMS_API_KEY =
  process.env.GEMS_API_KEY || "api-c455c74c0a854d36868021840d32e01f";

const GEMS_LAYERS = {
  o3: "https://nesc.nier.go.kr:38032/api/GK2/L2/O3T/FOR/image",
  hcho: "https://nesc.nier.go.kr:38032/api/GK2/L2/HCHO/FOR/image",
  no2: "https://nesc.nier.go.kr:38032/api/GK2/L2/NO2_Trop/FOR/image",
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
    throw new Error(`GEMS API returned no data.`);
  }

  return data.list
    .map((item) => item.item)
    .sort()
    .pop();
}

async function warmGems(layerName, baseUrl) {
  try {
    console.log(`[Scheduled] Warming GEMS ${layerName}...`);

    const timestamp = await fetchLatestGemsTimestamp(baseUrl);
    console.log(`[Scheduled] Latest timestamp for ${layerName}: ${timestamp}`);

    // Trigger the main API to fetch and cache the image
    const siteUrl = process.env.URL || "http://localhost:3000";
    const response = await fetch(`${siteUrl}/api/gems/${layerName}/image`);

    if (response.ok) {
      const size = response.headers.get("content-length");
      console.log(
        `[Scheduled] Successfully warmed ${layerName} (${size} bytes)`
      );
      return { layer: layerName, status: "success", size };
    } else {
      console.error(
        `[Scheduled] Failed to warm ${layerName}: ${response.status}`
      );
      return { layer: layerName, status: "failed", code: response.status };
    }
  } catch (error) {
    console.error(`[Scheduled] Error warming ${layerName}:`, error.message);
    return { layer: layerName, status: "error", message: error.message };
  }
}

const handler = async (event) => {
  console.log("[Scheduled] Starting GEMS cache warming...");

  const results = await Promise.all(
    Object.entries(GEMS_LAYERS).map(([name, url]) => warmGems(name, url))
  );

  console.log("[Scheduled] Cache warming complete:", results);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "GEMS cache warming complete",
      timestamp: new Date().toISOString(),
      results,
    }),
  };
};

// Run every hour
module.exports.handler = schedule("@hourly", handler);

// For manual testing
module.exports.manualHandler = handler;
