// Global variables
let map, currentMarker, debounceTimer, groundStationLayer, heatMapLayer;

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
    !data.weather ||
    !Array.isArray(data.weather.list) ||
    !data.weather.list[0]
  ) {
    showError("No pollution data available for this location.");
    document.getElementById("pollutionSection").classList.remove("show");
    document.getElementById("healthSection").style.display = "none";
    return;
  }
  const pollution = data.weather.list[0];
  const components = pollution.components;
  const weather = data.weather;
  document.getElementById("cityName").innerHTML = `${cityName} 
    <small style="font-weight: 400; color: #6b7280;">(${lat.toFixed(
      4
    )}, ${lon.toFixed(4)})</small>`;
  const aqi = pollution.main.aqi || 0;
  const aqiCategory = getAQICategory(aqi);
  document.getElementById("aqiValue").textContent = aqi;
  const categoryElement = document.getElementById("aqiCategory");
  categoryElement.textContent = aqiCategory.label;
  categoryElement.className = `aqi-category aqi-${aqiCategory.class}`;
  document.getElementById("pollutionData").innerHTML =
    createEnhancedPollutantDisplays(components, weather);
  updateHealthRecommendations(aqi, components, weather);
  document.getElementById("pollutionSection").classList.add("show");
  document.getElementById("healthSection").style.display = "block";
}

function getAQICategory(aqi) {
  if (aqi <= 1) return { label: "Good", class: "good" };
  if (aqi === 2) return { label: "Fair", class: "moderate" };
  if (aqi === 3) return { label: "Moderate", class: "unhealthy-sensitive" };
  if (aqi === 4) return { label: "Poor", class: "unhealthy" };
  if (aqi === 5) return { label: "Very Poor", class: "hazardous" };
  return { label: "Unknown", class: "" };
}

function createEnhancedPollutantDisplays(components, weather) {
  let weatherDesc = "";
  let temp = "";
  let wind = "";
  if (weather.weather && Array.isArray(weather.weather) && weather.weather[0]?.description) {
    weatherDesc = weather.weather[0].description;
  }
  if (weather.main && typeof weather.main.temp !== "undefined") {
    temp = `${Math.round(weather.main.temp)}°C`;
  }
  if (weather.wind) {
    wind = `Wind: ${weather.wind.speed || 0} m/s ${weather.wind.deg ? `(${getWindDirection(weather.wind.deg)})` : ""}`;
  }

  let html = `<div style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #0ea5e9;">
    <small style="color: #0c4a6e;">
      <strong>🌤️ Weather Context:</strong> ${weatherDesc ? weatherDesc + ", " : ""}${temp}${wind ? ", " + wind : ""}
    </small>
  </div>`;
  const pollutants = [
    {
      key: "pm2_5",
      name: "PM2.5",
      unit: "µg/m³",
      max: 50,
      value: components.pm2_5,
    },
    { key: "no2", name: "NO₂", unit: "µg/m³", max: 100, value: components.no2 },
    { key: "o3", name: "O₃", unit: "µg/m³", max: 200, value: components.o3 },
    {
      key: "pm10",
      name: "PM10",
      unit: "µg/m³",
      max: 100,
      value: components.pm10,
    },
  ];
  pollutants.forEach((pollutant) => {
    const value = pollutant.value || 0;
    const percentage = Math.min((value / pollutant.max) * 100, 100);
    const color = getColorForPollutant(pollutant.key, value);
    html += `
      <div class="pollutant" style="border-left-color: ${color};">
        <div class="pollutant-info">
          <div>
            <span class="pollutant-name">${pollutant.name}</span>
            <span class="pollutant-source">Ground Monitor</span>
          </div>
          <div class="pollutant-bar">
            <div class="pollutant-bar-fill" style="width: ${percentage}%; background: linear-gradient(90deg, ${color}, ${color}aa);"></div>
          </div>
          <span class="info-icon" onclick="showPollutantInfo('${
            pollutant.key
          }')">i</span>
        </div>
        <div class="pollutant-value">
          ${value.toFixed(1)} ${pollutant.unit}
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
  if (aqi > 3) {
    alertHTML = `
      <div class="health-alert">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <h4>Unhealthy Air Quality Alert</h4>
          <p>Current AQI: ${aqi}. Limit outdoor activities.</p>
          <div class="alert-actions">
            <button class="alert-btn" onclick="shareHealthAlert('${aqi}')">Share Alert</button>
          </div>
        </div>
      </div>
    `;
  } else if (aqi > 2) {
    alertHTML = `
      <div class="health-alert" style="background: linear-gradient(135deg, #fef3c7, #fed7aa); color: #92400e;">
        <div class="alert-icon">⚡</div>
        <div class="alert-content">
          <h4>Sensitive Groups Advisory</h4>
          <p>AQI: ${aqi}. Sensitive individuals should consider reducing outdoor activities.</p>
        </div>
      </div>
    `;
  }
  if (components.pm2_5 > 35) {
    recommendations.push("🏠 Stay indoors - high PM2.5 detected");
    recommendations.push("😷 Wear N95 mask outdoors");
  } else if (components.pm2_5 > 12) {
    recommendations.push("🚶‍♀️ Limit outdoor activities for sensitive groups");
  }
  if (components.no2 > 80) {
    recommendations.push("🚗 Avoid busy roads - elevated NO₂");
  }
  if (weather.wind?.speed < 2) {
    recommendations.push("💨 Low wind may trap pollutants");
  } else if (weather.wind?.speed > 5) {
    recommendations.push("🌬️ Good wind dispersion expected");
  }
  recommendations.push(
    "👥 Children, elderly, and those with respiratory conditions should take extra precautions"
  );
  recommendations.push("💧 Stay hydrated");
  recommendations.push("📱 Check air quality regularly");
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
