// Global variables
let map, currentMarker, debounceTimer, groundStationLayer, heatMapLayer;

const dataCache = {
  current: null,
  forecast: null,
  historical: null,
  timestamp: null,
};

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

function initMap() {
  map = L.map("map").setView([39.8283, -98.5795], 4);

  const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenStreetMap contributors" }
  );
  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Tiles © Esri" }
  );
  osmLayer.addTo(map);

  L.control
    .layers({ "Street Map": osmLayer, Satellite: satelliteLayer })
    .addTo(map);

  map.on("click", onMapClick);
  groundStationLayer = L.layerGroup().addTo(map);
  addSimulatedGroundStations();
}

function addSimulatedGroundStations() {
  const stations = [
    {
      name: "NASA GSFC",
      lat: 38.9917,
      lon: -76.84,
      type: "Pandora",
      status: "active",
    },
    {
      name: "EPA RTP",
      lat: 35.8831,
      lon: -78.8414,
      type: "Ground Monitor",
      status: "active",
    },
    {
      name: "NOAA Boulder",
      lat: 40.0274,
      lon: -105.2519,
      type: "TolNet",
      status: "active",
    },
    {
      name: "UCLA",
      lat: 34.0689,
      lon: -118.4452,
      type: "Pandora",
      status: "limited",
    },
    {
      name: "Harvard Forest",
      lat: 42.5378,
      lon: -72.1715,
      type: "Research",
      status: "active",
    },
  ];
  stations.forEach((station) => {
    const color = station.status === "active" ? "#22c55e" : "#f59e0b";
    const marker = L.circleMarker([station.lat, station.lon], {
      radius: 8,
      fillColor: color,
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).bindPopup(`
      <div class="station-popup">
        <h4>${station.name}</h4>
        <p><strong>Type:</strong> ${station.type}</p>
        <p><strong>Status:</strong> ${station.status}</p>
        <button onclick="viewStationData('${station.name}')">View Data</button>
      </div>
    `);
    groundStationLayer.addLayer(marker);
  });
}

function onMapClick(e) {
  fetchLocationData(e.latlng.lat, e.latlng.lng);
}

function handleSearchInput(query) {
  clearTimeout(debounceTimer);
  if (query.length < 3) {
    hideSearchResults();
    return;
  }
  debounceTimer = setTimeout(() => fetchCitySuggestions(query), 300);
}

async function fetchCitySuggestions(query) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        query
      )}&limit=5&appid=6e976d04a47c92a2de198b05560adf59`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    displaySearchResults(data);
  } catch (error) {
    showError("Failed to fetch city suggestions.");
  }
}

function displaySearchResults(cities) {
  const resultsContainer = document.getElementById("searchResults");
  resultsContainer.innerHTML = "";
  if (cities.length === 0) {
    resultsContainer.innerHTML =
      '<div class="search-item">No cities found</div>';
    resultsContainer.style.display = "block";
    return;
  }
  cities.forEach((city) => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `<div>
      <strong>${city.name}</strong>${city.state ? ", " + city.state : ""}, ${
      city.country
    }
      <br><small>Lat: ${city.lat.toFixed(4)}, Lon: ${city.lon.toFixed(
      4
    )}</small>
    </div>`;
    item.onclick = () => selectCity(city);
    resultsContainer.appendChild(item);
  });
  resultsContainer.style.display = "block";
}

function selectCity(city) {
  document.getElementById("searchInput").value = `${city.name}${
    city.state ? ", " + city.state : ""
  }, ${city.country}`;
  hideSearchResults();
  const locationDisplay = document.getElementById("locationDisplay");
  locationDisplay.innerHTML = `📍 <strong>${city.name}${
    city.state ? ", " + city.state : ""
  }</strong><br>
    <small>Coordinates: ${city.lat.toFixed(4)}, ${city.lon.toFixed(4)}</small>`;
  locationDisplay.style.display = "block";
  console.log("Selected city info:", city);
  fetchLocationData(city.lat, city.lon, city.name);
  zoomToLocation(city.lat, city.lon);
}

function hideSearchResults() {
  document.getElementById("searchResults").style.display = "none";
}

async function fetchLocationData(lat, lon, cityName = "") {
  showLoading();
  hideError();
  try {
    const response = await fetch(`/api/data?lat=${lat}&lon=${lon}`);
    if (!response.ok) throw new Error("API error");
    const data = await response.json();

    console.log("Fetched data:", data);

    // Use OpenAQ for city name if available
    if (!cityName) {
      cityName =
        data.airQuality?.city || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }

    console.log("Using city name:", cityName);
    displayIntegratedAirQualityData(data, cityName, lat, lon);
    generateForecast(data);
    updateHistoricalTrends(cityName);
    hideLoading();
  } catch (error) {
    console.error("Error fetching location data:", error);
    showError("Failed to fetch air quality data.");
    hideLoading();
  }
}

function displayIntegratedAirQualityData(data, cityName, lat, lon) {
  if (
    !data.list ||
    !Array.isArray(data.list) ||
    !data.weather
  ) {
    console.log("No pollution data available in response:", data);
    showError("No pollution data available for this location.");
    document.getElementById("pollutionSection").classList.remove("show");
    document.getElementById("healthSection").style.display = "none";
    return;
  }

  const pollution = data.list[0];
  const components = pollution.components;
  const weather = data.weather;

  document.getElementById("cityName").innerHTML = `${cityName} 
    <small style="font-weight: 400; color: #6b7280;">(${lat.toFixed(
      4
    )}, ${lon.toFixed(4)})</small>`;

  console.log("Displaying data for:", cityName, lat, lon);
  console.log("Pollution data:", pollution);

  // Calculate US EPA AQI from the pollutant concentrations
  const aqiData = calculateOverallAQI(components);
  const aqi = aqiData.overall;
  const individualAQIs = aqiData.individual;

  const aqiCategory = getAQICategory(aqi);

  console.log("Calculated EPA AQI:", aqi, "Category:", aqiCategory);
  console.log("Individual AQIs:", individualAQIs);

  // Update AQI display with new EPA values
  document.getElementById("aqiValue").textContent = aqi;
  const categoryElement = document.getElementById("aqiCategory");
  categoryElement.textContent = aqiCategory.label;
  categoryElement.className = `aqi-category aqi-${aqiCategory.class}`;

  // Update pollutant displays with individual AQI values
  document.getElementById("pollutionData").innerHTML =
    createEnhancedPollutantDisplays(components, weather, individualAQIs);

  updateHealthRecommendations(aqi, components, weather);
  document.getElementById("pollutionSection").classList.add("show");
  document.getElementById("healthSection").style.display = "block";
}

/**
 * Calculate individual AQI for a pollutant using US EPA formula
 * I = ((Ihigh - Ilow) / (Chigh - Clow)) * (C - Clow) + Ilow
 */
function calculateIndividualAQI(concentration, pollutant) {
  if (concentration < 0) return 0;

  const breakpoints = AQI_BREAKPOINTS[pollutant];
  if (!breakpoints) return 0;

  // Find the appropriate breakpoint
  let breakpoint = null;
  for (let bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      breakpoint = bp;
      break;
    }
  }

  // If concentration exceeds all breakpoints, use the highest one
  if (
    !breakpoint &&
    concentration > breakpoints[breakpoints.length - 1].cHigh
  ) {
    breakpoint = breakpoints[breakpoints.length - 1];
    // For concentrations above the highest breakpoint, extend the calculation
    const lastBp = breakpoints[breakpoints.length - 1];
    const aqi =
      ((lastBp.iHigh - lastBp.iLow) / (lastBp.cHigh - lastBp.cLow)) *
        (concentration - lastBp.cLow) +
      lastBp.iLow;
    return Math.round(Math.min(aqi, 500)); // Cap at 500
  }

  if (!breakpoint) return 0;

  // Apply the EPA AQI formula
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
    // Use 8-hour ozone standard for general AQI calculation
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

  // Overall AQI is the highest individual AQI
  const aqiValues = Object.values(individualAQIs).filter((val) => val > 0);
  const overallAQI = aqiValues.length > 0 ? Math.max(...aqiValues) : 0;

  return {
    overall: overallAQI,
    individual: individualAQIs,
  };
}

/**
 * Get AQI category based on US EPA standards
 */
function getAQICategory(aqi) {
  if (aqi >= 0 && aqi <= 50)
    return { label: "Good", class: "good", color: "#00e400" };
  if (aqi >= 51 && aqi <= 100)
    return { label: "Moderate", class: "moderate", color: "#ffff00" };
  if (aqi >= 101 && aqi <= 150)
    return {
      label: "Unhealthy for Sensitive Groups",
      class: "unhealthy-sensitive",
      color: "#ff7e00",
    };
  if (aqi >= 151 && aqi <= 200)
    return { label: "Unhealthy", class: "unhealthy", color: "#ff0000" };
  if (aqi >= 201 && aqi <= 300)
    return {
      label: "Very Unhealthy",
      class: "very-unhealthy",
      color: "#8f3f97",
    };
  if (aqi >= 301 && aqi <= 500)
    return { label: "Hazardous", class: "hazardous", color: "#7e0023" };
  if (aqi > 500)
    return {
      label: "Very Hazardous",
      class: "very-hazardous",
      color: "#7e0023",
    };
  return { label: "Unknown", class: "", color: "#999999" };
}

function getColorForPollutant(pollutant, value) {
  let aqi = 0;

  switch (pollutant) {
    case "pm2_5":
      aqi = calculateIndividualAQI(value, "pm2_5");
      break;
    case "pm10":
      aqi = calculateIndividualAQI(value, "pm10");
      break;
    case "o3":
      aqi = calculateIndividualAQI(value / 1.96, "o3_8hr"); // Convert μg/m³ to ppb
      break;
    case "no2":
      aqi = calculateIndividualAQI(value / 1.88, "no2"); // Convert μg/m³ to ppb
      break;
    case "so2":
      aqi = calculateIndividualAQI(value / 2.62, "so2"); // Convert μg/m³ to ppb
      break;
    case "co":
      aqi = calculateIndividualAQI(value / 1145, "co"); // Convert μg/m³ to ppm
      break;
    default:
      // Fallback to old color system for unknown pollutants
      const thresholds = {
        pm2_5: [12, 35, 55],
        pm10: [54, 154, 254],
        o3: [100, 160, 240],
        no2: [40, 80, 120],
        so2: [20, 80, 250],
        co: [4400, 9400, 12400],
      };
      const limits = thresholds[pollutant] || [50, 100, 150];
      if (value <= limits[0]) return "#00e400";
      if (value <= limits[1]) return "#ffff00";
      if (value <= limits[2]) return "#ff7e00";
      return "#ff0000";
  }

  return getAQICategory(aqi).color;
}

function createEnhancedPollutantDisplays(components, weather, individualAQIs) {
  let weatherDesc = "";
  let temp = "";
  let wind = "";

  if (
    weather.weather &&
    Array.isArray(weather.weather) &&
    weather.weather[0]?.description
  ) {
    weatherDesc = weather.weather[0].description;
  }
  if (weather.main && typeof weather.main.temp !== "undefined") {
    temp = `${Math.round(weather.main.temp)}°C`;
  }
  if (weather.wind) {
    wind = `Wind: ${weather.wind.speed || 0} m/s ${
      weather.wind.deg ? `(${getWindDirection(weather.wind.deg)})` : ""
    }`;
  }

  let html = `<div style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #0ea5e9;">
    <small style="color: #0c4a6e;">
      <strong>🌤️ Weather Context:</strong> ${
        weatherDesc ? weatherDesc + ", " : ""
      }${temp}${wind ? ", " + wind : ""}
    </small>
  </div>`;

  const pollutants = [
    {
      key: "pm2_5",
      name: "PM2.5",
      unit: "μg/m³",
      value: components.pm2_5,
      standard: "24-hour average",
    },
    {
      key: "pm10",
      name: "PM10",
      unit: "μg/m³",
      value: components.pm10,
      standard: "24-hour average",
    },
    {
      key: "o3",
      name: "O₃",
      unit: "μg/m³",
      value: components.o3,
      standard: "8-hour average",
    },
    {
      key: "no2",
      name: "NO₂",
      unit: "μg/m³",
      value: components.no2,
      standard: "1-hour average",
    },
    {
      key: "so2",
      name: "SO₂",
      unit: "μg/m³",
      value: components.so2,
      standard: "1-hour average",
    },
    {
      key: "co",
      name: "CO",
      unit: "μg/m³",
      value: components.co,
      standard: "8-hour average",
    },
  ];

  pollutants.forEach((pollutant) => {
    const value = pollutant.value || 0;
    const individualAQI = individualAQIs[pollutant.key] || 0;
    const color = getColorForPollutant(pollutant.key, value);
    const aqiCategory = getAQICategory(individualAQI);

    // Calculate percentage based on AQI (0-500 scale)
    const percentage = Math.min((individualAQI / 500) * 100, 100);

    html += `
      <div class="pollutant" style="border-left-color: ${color};">
        <div class="pollutant-info">
          <div>
            <span class="pollutant-name">${pollutant.name}</span>
            <span class="pollutant-source">EPA Standard (${
              pollutant.standard
            })</span>
          </div>
          <div class="pollutant-bar">
            <div class="pollutant-bar-fill" style="width: ${percentage}%; background: linear-gradient(90deg, ${color}, ${color}aa);"></div>
          </div>
          <span class="info-icon" onclick="showPollutantInfo('${
            pollutant.key
          }')">i</span>
        </div>
        <div class="pollutant-value">
          <div style="font-size: 1.1em; font-weight: bold;">${value.toFixed(
            1
          )} ${pollutant.unit}</div>
          <div style="font-size: 0.85em; color: ${color}; font-weight: 500;">
            AQI: ${individualAQI} (${aqiCategory.label})
          </div>
        </div>
      </div>
    `;
  });

  return html;
}

function getWindDirection(degrees) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return directions[Math.round(degrees / 22.5) % 16];
}

function getColorForPollutant(pollutant, value) {
  const thresholds = {
    pm2_5: [12, 35, 55],
    pm10: [54, 154, 254],
    o3: [100, 160, 240],
    no2: [40, 80, 120],
    so2: [20, 80, 250],
    co: [4400, 9400, 12400],
  };
  const limits = thresholds[pollutant] || [50, 100, 150];
  if (value <= limits[0]) return "#22c55e";
  if (value <= limits[1]) return "#f59e0b";
  if (value <= limits[2]) return "#f97316";
  return "#ef4444";
}

function generateForecast(data) {
  const forecastSection = document.getElementById("forecastSection");
  const forecastTime = document.getElementById("forecastTime");
  const forecastGrid = document.getElementById("forecastGrid");
  const pollution = data.weather.list[0];
  const aqi = pollution.main.aqi || 0;
  const forecasts = [];
  for (let i = 1; i <= 3; i++) {
    const hour = new Date();
    hour.setHours(hour.getHours() + i * 3);
    let forecastAQI = aqi;
    const windSpeed = data.weather.wind?.speed || 0;
    if (windSpeed > 5) forecastAQI = Math.max(1, aqi - 1);
    else if (windSpeed < 2) forecastAQI = Math.min(5, aqi + 1);
    forecasts.push({
      time: hour.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      aqi: forecastAQI,
      trend: i === 1 ? "stable" : Math.random() > 0.5 ? "improving" : "stable",
    });
  }
  forecastTime.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
  forecastGrid.innerHTML = forecasts
    .map(
      (forecast) => `
      <div class="forecast-item">
        <div class="forecast-label">${forecast.time}</div>
        <div class="forecast-value forecast-aqi" style="color: ${getColorForPollutant(
          "aqi",
          forecast.aqi
        )}">${forecast.aqi}</div>
        <small>${getAQICategory(forecast.aqi).label}</small>
      </div>`
    )
    .join("");
  forecastSection.style.display = "block";
}

function updateHealthRecommendations(aqi, components, weather) {
  const healthAlert = document.getElementById("healthAlert");
  const recommendationsList = document.getElementById("recommendationsList");
  let alertHTML = "";
  let recommendations = [];

  // Health alerts based on US EPA AQI levels
  if (aqi >= 301) {
    alertHTML = `
      <div class="health-alert" style="background: linear-gradient(135deg, #7e0023, #8f3f97); color: white;">
        <div class="alert-icon">☠️</div>
        <div class="alert-content">
          <h4>HAZARDOUS Air Quality Emergency</h4>
          <p>AQI: ${aqi}. Health warnings of emergency conditions. Everyone should avoid all outdoor activities.</p>
          <div class="alert-actions">
            <button class="alert-btn" onclick="shareHealthAlert('${aqi}')">Share Emergency Alert</button>
          </div>
        </div>
      </div>
    `;
  } else if (aqi >= 201) {
    alertHTML = `
      <div class="health-alert" style="background: linear-gradient(135deg, #8f3f97, #7e0023); color: white;">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <h4>Very Unhealthy Air Quality Alert</h4>
          <p>AQI: ${aqi}. Health alert: everyone may experience serious health effects.</p>
          <div class="alert-actions">
            <button class="alert-btn" onclick="shareHealthAlert('${aqi}')">Share Alert</button>
          </div>
        </div>
      </div>
    `;
  } else if (aqi >= 151) {
    alertHTML = `
      <div class="health-alert" style="background: linear-gradient(135deg, #ff0000, #ff4444); color: white;">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <h4>Unhealthy Air Quality Alert</h4>
          <p>AQI: ${aqi}. Everyone may experience health effects. Limit outdoor activities.</p>
          <div class="alert-actions">
            <button class="alert-btn" onclick="shareHealthAlert('${aqi}')">Share Alert</button>
          </div>
        </div>
      </div>
    `;
  } else if (aqi >= 101) {
    alertHTML = `
      <div class="health-alert" style="background: linear-gradient(135deg, #ff7e00, #ffaa44); color: white;">
        <div class="alert-icon">⚡</div>
        <div class="alert-content">
          <h4>Unhealthy for Sensitive Groups</h4>
          <p>AQI: ${aqi}. Sensitive individuals should avoid outdoor activities.</p>
        </div>
      </div>
    `;
  } else if (aqi >= 51) {
    alertHTML = `
      <div class="health-alert" style="background: linear-gradient(135deg, #ffff00, #ffff77); color: #333;">
        <div class="alert-icon">ℹ️</div>
        <div class="alert-content">
          <h4>Moderate Air Quality</h4>
          <p>AQI: ${aqi}. Air quality is acceptable for most people.</p>
        </div>
      </div>
    `;
  }

  // Specific recommendations based on pollutant levels and EPA guidelines
  if (components.pm2_5 > 55.5) {
    recommendations.push("🏠 Stay indoors - very unhealthy PM2.5 levels");
    recommendations.push("😷 Wear N95 or P100 mask if you must go outside");
    recommendations.push("💨 Use air purifiers indoors with HEPA filters");
  } else if (components.pm2_5 > 35.5) {
    recommendations.push(
      "🚶‍♀️ Limit outdoor activities, especially for sensitive groups"
    );
    recommendations.push("😷 Consider wearing N95 mask outdoors");
  } else if (components.pm2_5 > 12.1) {
    recommendations.push(
      "⚠️ Unusually sensitive people should limit outdoor activities"
    );
  }

  if (components.no2 / 1.88 > 361) {
    // Convert to ppb and check
    recommendations.push("🚗 Avoid busy roads - very high NO₂ levels");
    recommendations.push("🏠 Keep windows closed near traffic");
  } else if (components.no2 / 1.88 > 101) {
    recommendations.push("🚗 Limit time near busy roads");
  }

  const o3_ppb = components.o3 / 1.96;
  if (o3_ppb > 125) {
    recommendations.push(
      "☀️ Avoid outdoor activities during peak sun hours (10am-4pm)"
    );
    recommendations.push("🏃‍♂️ Postpone outdoor exercise");
  }

  // Weather-based recommendations
  if (weather.wind?.speed < 2) {
    recommendations.push(
      "💨 Low wind may trap pollutants - avoid outdoor activities"
    );
  } else if (weather.wind?.speed > 5) {
    recommendations.push("🌬️ Good wind dispersion may help air quality");
  }

  // General recommendations based on AQI level
  if (aqi >= 101) {
    recommendations.push(
      "👥 Children, elderly, and those with heart/lung conditions should stay indoors"
    );
    recommendations.push(
      "🏥 Seek medical attention if experiencing breathing difficulties"
    );
    recommendations.push("🚭 Avoid smoking and exposure to secondhand smoke");
  }

  recommendations.push("💧 Stay well hydrated");
  recommendations.push("📱 Monitor air quality regularly");

  if (aqi <= 50) {
    recommendations.push("✅ Air quality is good - enjoy outdoor activities");
  }

  healthAlert.innerHTML = alertHTML;
  recommendationsList.innerHTML = recommendations
    .map((rec) => `<li>${rec}</li>`)
    .join("");
}

function updateHistoricalTrends(cityName) {
  const trendsSection = document.getElementById("trendsSection");
  const trendsData = document.getElementById("trendsData");
  const trends = [
    {
      period: "Past 24 hours",
      change: "improving",
      value: "-12%",
      description: "Air quality improved",
    },
    {
      period: "Past week",
      change: "stable",
      value: "+2%",
      description: "Generally stable conditions",
    },
    {
      period: "Past month",
      change: "improving",
      value: "-8%",
      description: "Seasonal improvement",
    },
    {
      period: "Same period last year",
      change: "improving",
      value: "-15%",
      description: "Long-term improvement trend",
    },
  ];
  trendsData.innerHTML = trends
    .map(
      (trend) => `
      <div class="trend-item">
        <div class="trend-period">${trend.period}</div>
        <div class="trend-change trend-${trend.change}">
          ${trend.value} ${trend.description}
        </div>
      </div>`
    )
    .join("");
  trendsSection.style.display = "block";
}

function showPollutantInfo(pollutant) {
  const modal = document.getElementById("pollutantModal");
  const body = document.getElementById("pollutantModalBody");
  const pollutantDetails = {
    pm2_5: {
      title: "PM2.5 - Fine Particulate Matter",
      description:
        "Particles smaller than 2.5 micrometers that can penetrate deep into lungs and bloodstream.",
      sources:
        "Vehicle emissions, industrial processes, wildfires, cooking, secondary formation",
      health:
        "Respiratory and cardiovascular problems, premature death, reduced lung function",
      protection:
        "Use N95 masks, air purifiers, limit outdoor activities during high levels",
    },
    no2: {
      title: "NO₂ - Nitrogen Dioxide",
      description:
        "A reddish-brown gas primarily from combustion processes, key precursor to ozone and PM2.5.",
      sources:
        "Vehicle engines, power plants, industrial boilers, ships, aircraft",
      health:
        "Airway inflammation, reduced lung function, increased respiratory infections",
      protection:
        "Avoid busy roads, ensure proper ventilation, limit outdoor exercise near traffic",
    },
    o3: {
      title: "O₃ - Ground-level Ozone",
      description:
        "Secondary pollutant formed when NOx and VOCs react in sunlight, creating photochemical smog.",
      sources:
        "Vehicle emissions, industrial facilities, chemical solvents reacting in sunlight",
      health:
        "Chest pain, throat irritation, reduced lung function, asthma attacks",
      protection:
        "Avoid outdoor activities during peak sun hours (10am-4pm), stay indoors when levels are high",
    },
    pm10: {
      title: "PM10 - Coarse Particulate Matter",
      description:
        "Particles smaller than 10 micrometers including dust, pollen, mold, and crustal material.",
      sources:
        "Road dust, construction, agriculture, natural sources, sea salt",
      health:
        "Eye, nose, throat irritation, respiratory symptoms, asthma exacerbation",
      protection:
        "Keep windows closed during dusty conditions, use air filters, avoid dusty areas",
    },
  };
  const info = pollutantDetails[pollutant];
  if (info) {
    body.innerHTML = `
      <h2>${info.title}</h2>
      <h4>📋 Description</h4>
      <p>${info.description}</p>
      <h4>🏭 Main Sources</h4>
      <p>${info.sources}</p>
      <h4>🏥 Health Effects</h4>
      <p>${info.health}</p>
      <h4>🛡️ Protection Measures</h4>
      <p>${info.protection}</p>
    `;
  } else {
    body.innerHTML = "<p>Information not available for this pollutant.</p>";
  }
  modal.classList.add("show");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
}

function showAbout() {
  document.getElementById("aboutModal").classList.add("show");
}

function toggleDataSources() {
  document.getElementById("dataSourcesModal").classList.add("show");
}

function toggleSatelliteView() {
  alert("Satellite view toggled!");
}

function toggleGroundStations() {
  if (map.hasLayer(groundStationLayer)) map.removeLayer(groundStationLayer);
  else map.addLayer(groundStationLayer);
}

function showHeatMap() {
  alert("Heat map visualization activated!");
}

function viewStationData(stationName) {
  alert(`Station: ${stationName}`);
}

function zoomToLocation(lat, lon) {
  map.setView([lat, lon], 12);
  if (currentMarker) map.removeLayer(currentMarker);
  currentMarker = L.marker([lat, lon]).addTo(map);
  currentMarker
    .bindPopup(
      `
    <div style="text-align: center; padding: 10px;">
      <h4>📍 Selected Location</h4>
      <p><strong>Coordinates:</strong><br>${lat.toFixed(4)}, ${lon.toFixed(
        4
      )}</p>
      <button onclick="fetchLocationData(${lat}, ${lon})" style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
        Refresh Data
      </button>
    </div>
  `
    )
    .openPopup();
}

function getUserLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by this browser.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      const locationDisplay = document.getElementById("locationDisplay");
      locationDisplay.innerHTML = `📍 <strong>Your Location</strong><br>
        <small>Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}</small><br>
        <small>Accuracy: ±${Math.round(accuracy)}m</small>`;
      locationDisplay.style.display = "block";
      fetchLocationData(lat, lon, "Your Location");
      zoomToLocation(lat, lon);
    },
    (error) => {
      let errorMsg = "Unable to get your location. ";
      if (error.code === error.PERMISSION_DENIED)
        errorMsg += "Location access denied by user.";
      else if (error.code === error.POSITION_UNAVAILABLE)
        errorMsg += "Location information unavailable.";
      else if (error.code === error.TIMEOUT)
        errorMsg += "Location request timed out.";
      else errorMsg += "Unknown error occurred.";
      showError(errorMsg + " Please search for a city instead.");
      hideLoading();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function shareHealthAlert(aqi) {
  const cityName = document
    .getElementById("cityName")
    .textContent.split("(")[0]
    .trim();
  const text = `🚨 Air Quality Alert for ${cityName}!\n\nCurrent AQI: ${aqi} (${
    getAQICategory(aqi).label
  })\n\nStay safe and limit outdoor activities. Check real-time data: ${
    window.location.href
  }`;
  if (navigator.share) {
    navigator
      .share({
        title: "Air Quality Alert - Global TEMPO",
        text: text,
        url: window.location.href,
      })
      .catch(console.error);
  } else {
    const encodedText = encodeURIComponent(text);
    const shareModal = confirm(
      "Share this alert?\n\nOK = Copy to clipboard\nCancel = Open sharing options"
    );
    if (shareModal) {
      navigator.clipboard
        .writeText(text)
        .then(() => alert("✅ Alert copied to clipboard!"))
        .catch(() => showShareOptions(encodedText));
    } else {
      showShareOptions(encodedText);
    }
  }
}

function showShareOptions(encodedText) {
  const options = [
    {
      name: "Twitter",
      url: `https://twitter.com/intent/tweet?text=${encodedText}`,
    },
    { name: "WhatsApp", url: `https://wa.me/?text=${encodedText}` },
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        window.location.href
      )}`,
    },
  ];
  const choice = prompt(
    "Choose sharing platform:\n\n" +
      options.map((opt, i) => `${i + 1}. ${opt.name}`).join("\n") +
      "\n\nEnter number (1-3):"
  );
  const index = parseInt(choice) - 1;
  if (index >= 0 && index < options.length)
    window.open(options[index].url, "_blank");
}

function showLoading() {
  document.getElementById("loadingIndicator").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loadingIndicator").classList.add("hidden");
}
function showError(message) {
  const errorElement = document.getElementById("errorMessage");
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");
}
function hideError() {
  document.getElementById("errorMessage").classList.add("hidden");
}

function initApp() {
  initMap();
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("show");
    });
  });
  document.addEventListener("click", (e) => {
    const searchContainer = document.querySelector(".search-container");
    if (!searchContainer.contains(e.target)) hideSearchResults();
  });
  const params = new URLSearchParams(window.location.search);
  const lat = params.get("lat");
  const lon = params.get("lon");
  const name = params.get("name");
  if (lat && lon) {
    fetchLocationData(parseFloat(lat), parseFloat(lon), name || "");
    zoomToLocation(parseFloat(lat), parseFloat(lon));
  } else {
    map.setView([40.0, -100.0], 4);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document
      .querySelectorAll(".modal.show")
      .forEach((modal) => modal.classList.remove("show"));
    hideSearchResults();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    document.getElementById("searchInput").focus();
  }
});

window.addEventListener("resize", () => {
  if (map) setTimeout(() => map.invalidateSize(), 100);
});

document.addEventListener("DOMContentLoaded", initApp);

// Add some production-ready enhancements

// Performance monitoring (in production)
const performanceObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === "navigation") {
      console.log(
        "Page load time:",
        entry.loadEventEnd - entry.fetchStart,
        "ms"
      );
    }
  });
});

try {
  performanceObserver.observe({ entryTypes: ["navigation"] });
} catch (e) {
  // Performance API not supported in some browsers
}

// Error tracking (in production, integrate with error tracking service)
window.addEventListener("error", (e) => {
  console.error("Application error:", e.error);
  // In production: send to error tracking service
});

// Offline detection
window.addEventListener("online", () => {
  hideError();
  showError("Connection restored. Data will be refreshed.", "success");
  setTimeout(hideError, 3000);
});

window.addEventListener("offline", () => {
  showError(
    "Connection lost. Some features may be limited until connectivity is restored."
  );
});

// Service worker registration for PWA capabilities (in production)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // navigator.serviceWorker.register('/sw.js').catch(console.error);
    // Commented out to avoid 404 errors in demo
  });
}

async function fetchCompleteLocationData(lat, lon, cityName = "") {
  showLoading();
  hideError();

  try {
    // Use the complete endpoint for all data at once
    const response = await fetch(`/api/complete?lat=${lat}&lon=${lon}&days=7`);
    if (!response.ok) throw new Error("API error");
    const data = await response.json();

    console.log("Complete data fetched:", data);

    // Cache the data
    dataCache.current = data.current;
    dataCache.forecast = data.forecast;
    dataCache.historical = data.historical;
    dataCache.timestamp = Date.now();

    // Use city name from various sources
    if (!cityName) {
      cityName =
        data.location ||
        data.current?.weather?.name ||
        data.airQuality?.city ||
        `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }

    console.log("Using city name:", cityName);

    // Display all the integrated data
    displayIntegratedAirQualityData(data.current, cityName, lat, lon);
    generateEnhancedForecast(data.forecast, data.current);
    updateEnhancedHistoricalTrends(data.historical, cityName);

    hideLoading();
  } catch (error) {
    console.error("Error fetching complete location data:", error);
    showError("Failed to fetch air quality data.");
    hideLoading();
  }
}

// Enhanced forecast generation with real OpenWeatherMap data
function generateEnhancedForecast(forecastData, currentData) {
  const forecastSection = document.getElementById("forecastSection");
  const forecastTime = document.getElementById("forecastTime");
  const forecastGrid = document.getElementById("forecastGrid");

  if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
    forecastSection.style.display = "none";
    return;
  }

  // Take next 8 forecast points (next 2-3 days typically)
  const forecasts = forecastData.list.slice(0, 8).map((item) => {
    const date = new Date(item.dt * 1000);
    const aqiData = calculateOverallAQI(item.components);
    const aqi = aqiData.overall;
    const category = getAQICategory(aqi);

    return {
      time: date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      }),
      fullTime: date,
      aqi: aqi,
      category: category.label,
      color: category.color,
      components: item.components,
      individualAQIs: aqiData.individual,
    };
  });

  forecastTime.textContent = `Updated: ${new Date().toLocaleTimeString()}`;

  // Create enhanced forecast grid
  forecastGrid.innerHTML = forecasts
    .map(
      (forecast, index) => `
      <div class="forecast-item enhanced-forecast" onclick="showForecastDetails(${index})">
        <div class="forecast-label">${forecast.time}</div>
        <div class="forecast-value forecast-aqi" style="color: ${
          forecast.color
        }">${forecast.aqi}</div>
        <small class="forecast-category">${forecast.category}</small>
        <div class="forecast-trend ${
          index > 0
            ? getForecastTrend(forecasts[index - 1].aqi, forecast.aqi)
            : ""
        }">
          ${
            index > 0
              ? getForecastTrendIcon(forecasts[index - 1].aqi, forecast.aqi)
              : ""
          }
        </div>
      </div>`
    )
    .join("");

  // Store forecast data for detailed view
  window.forecastDetails = forecasts;

  forecastSection.style.display = "block";
}

// Get forecast trend
function getForecastTrend(prevAqi, currentAqi) {
  const diff = currentAqi - prevAqi;
  if (Math.abs(diff) <= 5) return "stable";
  return diff > 0 ? "worsening" : "improving";
}

function getForecastTrendIcon(prevAqi, currentAqi) {
  const diff = currentAqi - prevAqi;
  if (Math.abs(diff) <= 5) return "→";
  return diff > 0 ? "↗️" : "↘️";
}

// Show detailed forecast information
function showForecastDetails(index) {
  const forecast = window.forecastDetails[index];
  if (!forecast) return;

  const modal = document.getElementById("pollutantModal");
  const body = document.getElementById("pollutantModalBody");

  const pollutants = [
    { key: "pm2_5", name: "PM2.5", unit: "μg/m³" },
    { key: "pm10", name: "PM10", unit: "μg/m³" },
    { key: "o3", name: "O₃", unit: "μg/m³" },
    { key: "no2", name: "NO₂", unit: "μg/m³" },
    { key: "so2", name: "SO₂", unit: "μg/m³" },
    { key: "co", name: "CO", unit: "μg/m³" },
  ];

  let pollutantDetails = pollutants
    .map((p) => {
      const value = forecast.components[p.key] || 0;
      const individualAQI = forecast.individualAQIs[p.key] || 0;
      const category = getAQICategory(individualAQI);

      return `
      <div class="forecast-pollutant-detail">
        <span class="pollutant-name">${p.name}</span>
        <span class="pollutant-values">
          ${value.toFixed(1)} ${p.unit} 
          <small style="color: ${
            category.color
          }">(AQI: ${individualAQI})</small>
        </span>
      </div>
    `;
    })
    .join("");

  body.innerHTML = `
    <h2>Forecast Details - ${forecast.time}</h2>
    <div class="forecast-summary">
      <div class="forecast-aqi-big" style="color: ${forecast.color}">
        AQI ${forecast.aqi}
      </div>
      <div class="forecast-category-big">${forecast.category}</div>
    </div>
    <h3>Individual Pollutants</h3>
    <div class="forecast-pollutants">
      ${pollutantDetails}
    </div>
    <div class="forecast-health-advice">
      <h4>Health Recommendations</h4>
      ${generateForecastHealthAdvice(forecast.aqi, forecast.components)}
    </div>
  `;

  modal.classList.add("show");
}

// Generate health advice for forecast
function generateForecastHealthAdvice(aqi, components) {
  let advice = [];

  if (aqi >= 151) {
    advice.push("🏠 Plan to stay indoors during this period");
    advice.push("😷 Wear N95 masks if outdoor activity is necessary");
  } else if (aqi >= 101) {
    advice.push("⚠️ Sensitive individuals should limit outdoor activities");
    advice.push("🏃‍♀️ Consider rescheduling outdoor exercise");
  } else if (aqi >= 51) {
    advice.push("ℹ️ Air quality is moderate - acceptable for most people");
    advice.push("👥 Sensitive groups should monitor symptoms");
  } else {
    advice.push("✅ Air quality is good - enjoy outdoor activities");
  }

  return advice.map((a) => `<li>${a}</li>`).join("");
}

// Enhanced historical trends with real data
function updateEnhancedHistoricalTrends(historicalData, cityName) {
  const trendsSection = document.getElementById("trendsSection");
  const trendsData = document.getElementById("trendsData");

  if (
    !historicalData ||
    !historicalData.list ||
    historicalData.list.length === 0
  ) {
    trendsSection.style.display = "none";
    return;
  }

  // Process historical data into meaningful trends
  const historical = historicalData.list.map((item) => ({
    timestamp: item.dt,
    date: new Date(item.dt * 1000),
    aqi: calculateOverallAQI(item.components).overall,
    components: item.components,
  }));

  // Calculate trend periods
  const trends = calculateHistoricalTrends(historical);

  trendsData.innerHTML = trends
    .map(
      (trend) => `
      <div class="trend-item enhanced-trend">
        <div class="trend-period">${trend.period}</div>
        <div class="trend-change trend-${trend.changeType}">
          <span class="trend-value">${trend.value}</span>
          <span class="trend-description">${trend.description}</span>
        </div>
        <div class="trend-details">
          <small>Avg AQI: ${trend.avgAqi} | Range: ${trend.minAqi}-${trend.maxAqi}</small>
        </div>
      </div>`
    )
    .join("");

  // Add historical chart if we have enough data
  if (historical.length > 24) {
    addHistoricalChart(historical);
  }

  trendsSection.style.display = "block";
}

// Calculate meaningful historical trends
function calculateHistoricalTrends(historical) {
  const trends = [];
  const now = new Date();

  // Last 24 hours
  const last24h = historical.filter((h) => now - h.date <= 24 * 60 * 60 * 1000);
  if (last24h.length > 0) {
    const avg = Math.round(
      last24h.reduce((sum, h) => sum + h.aqi, 0) / last24h.length
    );
    const min = Math.min(...last24h.map((h) => h.aqi));
    const max = Math.max(...last24h.map((h) => h.aqi));
    trends.push({
      period: "Past 24 hours",
      avgAqi: avg,
      minAqi: min,
      maxAqi: max,
      value: `Range: ${min}-${max}`,
      description: `Average: ${avg}`,
      changeType: avg <= 50 ? "improving" : avg <= 100 ? "stable" : "worsening",
    });
  }

  // Last 3 days vs previous 3 days
  const last3days = historical.filter(
    (h) => now - h.date <= 3 * 24 * 60 * 60 * 1000
  );
  const prev3days = historical.filter(
    (h) =>
      now - h.date > 3 * 24 * 60 * 60 * 1000 &&
      now - h.date <= 6 * 24 * 60 * 60 * 1000
  );

  if (last3days.length > 0 && prev3days.length > 0) {
    const lastAvg =
      last3days.reduce((sum, h) => sum + h.aqi, 0) / last3days.length;
    const prevAvg =
      prev3days.reduce((sum, h) => sum + h.aqi, 0) / prev3days.length;
    const change = ((lastAvg - prevAvg) / prevAvg) * 100;

    trends.push({
      period: "Past 3 days",
      avgAqi: Math.round(lastAvg),
      minAqi: Math.min(...last3days.map((h) => h.aqi)),
      maxAqi: Math.max(...last3days.map((h) => h.aqi)),
      value: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
      description:
        change > 0 ? "vs previous 3 days" : "improvement vs previous 3 days",
      changeType:
        Math.abs(change) <= 5
          ? "stable"
          : change > 0
          ? "worsening"
          : "improving",
    });
  }

  // Weekly average
  const avgWeekly = Math.round(
    historical.reduce((sum, h) => sum + h.aqi, 0) / historical.length
  );
  const minWeekly = Math.min(...historical.map((h) => h.aqi));
  const maxWeekly = Math.max(...historical.map((h) => h.aqi));

  trends.push({
    period: "7-day average",
    avgAqi: avgWeekly,
    minAqi: minWeekly,
    maxAqi: maxWeekly,
    value: `AQI ${avgWeekly}`,
    description: getAQICategory(avgWeekly).label,
    changeType:
      avgWeekly <= 50 ? "improving" : avgWeekly <= 100 ? "stable" : "worsening",
  });

  return trends;
}

// Add simple historical chart
function addHistoricalChart(historical) {
  // Create a simple chart container if it doesn't exist
  let chartContainer = document.getElementById("historicalChart");
  if (!chartContainer) {
    chartContainer = document.createElement("div");
    chartContainer.id = "historicalChart";
    chartContainer.className = "historical-chart";
    document.getElementById("trendsData").appendChild(chartContainer);
  }

  // Create simple ASCII-style chart for last 24 hours
  const last24h = historical.slice(-24);
  const maxAqi = Math.max(...last24h.map((h) => h.aqi));
  const minAqi = Math.min(...last24h.map((h) => h.aqi));

  let chartHTML = '<h4>24-Hour AQI Trend</h4><div class="mini-chart">';

  last24h.forEach((point, index) => {
    const height =
      maxAqi > minAqi
        ? ((point.aqi - minAqi) / (maxAqi - minAqi)) * 40 + 10
        : 20;
    const color = getAQICategory(point.aqi).color;

    chartHTML += `
      <div class="chart-bar" style="height: ${height}px; background: ${color}" 
           title="${point.date.toLocaleTimeString()}: AQI ${point.aqi}">
      </div>
    `;
  });

  chartHTML += "</div>";
  chartContainer.innerHTML = chartHTML;
}

// Update the main fetch function to use the enhanced version
async function fetchLocationData(lat, lon, cityName = "") {
  return fetchCompleteLocationData(lat, lon, cityName);
}


