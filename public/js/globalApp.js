let map;
let currentMarker;
let debounceTimer;

const API_KEY = "6e976d04a47c92a2de198b05560adf59"; 

function initMap() {
  map = L.map("map").setView([40.7128, -74.006], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  map.on("click", onMapClick);
}

// Handle map clicks
function onMapClick(e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  fetchLocationData(lat, lon);
}

// Handle search input with debouncing
function handleSearchInput(query) {
  clearTimeout(debounceTimer);

  if (query.length < 3) {
    hideSearchResults();
    return;
  }

  debounceTimer = setTimeout(() => {
    fetchCitySuggestions(query);
  }, 300);
}

// Fetch city suggestions from OpenWeather Geocoding API
async function fetchCitySuggestions(query) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        query
      )}&limit=5&appid=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displaySearchResults(data);
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
    showError("Failed to fetch city suggestions");
  }
}

// Display search results
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
    item.textContent = `${city.name}${city.state ? ", " + city.state : ""}, ${
      city.country
    }`;
    item.onclick = () => selectCity(city);
    resultsContainer.appendChild(item);
  });

  resultsContainer.style.display = "block";
}

// Select a city from search results
function selectCity(city) {
  document.getElementById("searchInput").value = `${city.name}${
    city.state ? ", " + city.state : ""
  }, ${city.country}`;
  hideSearchResults();

  const locationDisplay = document.getElementById("locationDisplay");
  locationDisplay.textContent = `Lat: ${city.lat.toFixed(
    4
  )}, Lon: ${city.lon.toFixed(4)}`;
  locationDisplay.style.display = "block";

  fetchLocationData(city.lat, city.lon, city.name);
  zoomToLocation(city.lat, city.lon);
}

// Hide search results
function hideSearchResults() {
  document.getElementById("searchResults").style.display = "none";
}

// Fetch air quality and weather data
async function fetchLocationData(lat, lon, cityName = "") {
  showLoading();
  hideError();

  try {
    // Fetch air pollution data from OpenWeather
    const airResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );

    if (!airResponse.ok) {
      throw new Error(`Air quality API error: ${airResponse.status}`);
    }

    const airData = await airResponse.json();

    // Get city name if not provided
    if (!cityName) {
      try {
        const geoResponse = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoResponse.json();
        cityName = geoData[0]?.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      } catch (error) {
        console.error("Error fetching location name:", error);
        cityName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      }
    }

    displayAirQualityData(airData, cityName);
    hideLoading();
  } catch (error) {
    console.error("Error fetching location data:", error);
    showError("Failed to fetch air quality data. Please try again.");
    hideLoading();
  }
}

// Display air quality data
function displayAirQualityData(data, cityName) {
  const pollution = data.list[0];
  const aqi = pollution.main.aqi;
  const components = pollution.components;

  // Update city name
  document.getElementById("cityName").textContent = cityName;

  // Update AQI display
  document.getElementById("aqiValue").textContent =
    getAQIFromComponents(components);

  // Create pollutant displays
  const pollutionContainer = document.getElementById("pollutionData");
  pollutionContainer.innerHTML = createPollutantDisplays(components);

  // Update health tips
  updateHealthTips(aqi, components);

  // Show data sections
  document.getElementById("pollutionSection").classList.add("show", "fade-in");
  document.getElementById("tipsSection").classList.add("show", "fade-in");
}

// Convert components to AQI-like value for display
function getAQIFromComponents(components) {
  // Simplified AQI calculation based on PM2.5
  const pm25 = components.pm2_5 || 0;
  if (pm25 <= 12) return "Good";
  if (pm25 <= 35) return "Moderate";
  if (pm25 <= 55) return "Unhealthy for Sensitive";
  if (pm25 <= 150) return "Unhealthy";
  if (pm25 <= 250) return "Very Unhealthy";
  return "Hazardous";
}

// Create pollutant display HTML
function createPollutantDisplays(components) {
  const pollutants = [
    { key: "pm2_5", name: "PM2.5", unit: "µg/m³", max: 50 },
    { key: "pm10", name: "PM10", unit: "µg/m³", max: 100 },
    { key: "o3", name: "O3", unit: "µg/m³", max: 200 },
    { key: "no2", name: "NO2", unit: "µg/m³", max: 100 },
    { key: "so2", name: "SO2", unit: "µg/m³", max: 100 },
    { key: "co", name: "CO", unit: "µg/m³", max: 10000 },
  ];

  return pollutants
    .map((pollutant) => {
      const value = components[pollutant.key] || 0;
      const percentage = Math.min((value / pollutant.max) * 100, 100);
      const color = getColorForPollutant(pollutant.key, value);

      return `
                    <div class="pollutant">
                        <div class="pollutant-info">
                            <span class="pollutant-name">${
                              pollutant.name
                            }</span>
                            <div class="pollutant-bar">
                                <div class="pollutant-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                            </div>
                            <span class="info-icon" onclick="showPollutantInfo('${
                              pollutant.key
                            }')">i</span>
                        </div>
                        <div class="pollutant-value">${value.toFixed(1)} ${
        pollutant.unit
      }</div>
                    </div>
                `;
    })
    .join("");
}

// Get color based on pollutant level
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

  if (value <= limits[0]) return "#4CAF50"; // Green
  if (value <= limits[1]) return "#FFC107"; // Yellow
  if (value <= limits[2]) return "#FF9800"; // Orange
  return "#F44336"; // Red
}

function updateHealthTips(aqi, components) {
  const tipsContainer = document.getElementById("healthTips");
  let tips = [];
  let warning = "";

  if (aqi >= 4) {
    warning = `
                    <div class="aqi-warning">
                        ⚠️ Air quality is unhealthy! Limit outdoor activities, especially if you have respiratory conditions.
                        <button class="warning-btn" onclick="shareAlert()">Share Alert</button>
                    </div>
                `;
  }

  // Generate specific tips based on pollutant levels
  const pm25 = components.pm2_5 || 0;
  const pm10 = components.pm10 || 0;
  const o3 = components.o3 || 0;

  if (pm25 > 35) {
    tips.push("High PM2.5: Wear a mask outdoors and keep windows closed");
  } else if (pm25 > 12) {
    tips.push(
      "Moderate PM2.5: Sensitive individuals should limit prolonged outdoor activities"
    );
  } else {
    tips.push("PM2.5 levels are good - safe for outdoor activities");
  }

  if (pm10 > 150) {
    tips.push("High PM10: Avoid outdoor exercise and consider air purifiers");
  } else if (pm10 > 50) {
    tips.push("Moderate PM10: Reduce intensive outdoor activities");
  } else {
    tips.push("PM10 levels are acceptable");
  }

  if (o3 > 160) {
    tips.push("High Ozone: Avoid outdoor activities during midday");
  } else if (o3 > 100) {
    tips.push(
      "Moderate Ozone: Limit outdoor exertion, especially for sensitive groups"
    );
  }

  // General tips
  tips.push("Stay hydrated and monitor air quality regularly");
  tips.push("Consider indoor activities during peak pollution hours");

  const tipsHTML = `
                ${warning}
                <h3>Recommendations:</h3>
                <ul>
                    ${tips.map((tip) => `<li>${tip}</li>`).join("")}
                </ul>
                <div style="margin-top: 15px; font-style: italic; color: #666;">
                    💡 Tip: Air quality typically improves in the evening and after rain
                </div>
            `;

  tipsContainer.innerHTML = tipsHTML;
}

function showPollutantInfo(pollutant) {
  const modal = document.getElementById("pollutantModal");
  const body = document.getElementById("pollutantModalBody");

  const pollutantInfo = {
    pm2_5: {
      title: "PM2.5 (Fine Particulate Matter)",
      description:
        "Particles smaller than 2.5 micrometers that can penetrate deep into lungs and bloodstream.",
      sources: "Vehicle emissions, industrial processes, wildfires, cooking",
      health:
        "Can cause respiratory and cardiovascular problems, especially in children and elderly",
      protection:
        "Use N95 masks, air purifiers, limit outdoor activities during high levels",
    },
    pm10: {
      title: "PM10 (Coarse Particulate Matter)",
      description:
        "Particles smaller than 10 micrometers including dust, pollen, and mold.",
      sources: "Road dust, construction sites, agriculture, natural sources",
      health: "Can irritate eyes, nose, throat and worsen asthma",
      protection: "Keep windows closed, use air filters, avoid dusty areas",
    },
    o3: {
      title: "O3 (Ground-level Ozone)",
      description:
        "A gas formed when pollutants react with sunlight, creating smog.",
      sources: "Vehicle emissions, industrial facilities, chemical solvents",
      health: "Can cause breathing difficulties, chest pain, throat irritation",
      protection:
        "Avoid outdoor activities during peak sun hours, stay indoors when levels are high",
    },
    no2: {
      title: "NO2 (Nitrogen Dioxide)",
      description:
        "A reddish-brown gas that contributes to smog and acid rain.",
      sources: "Vehicle engines, power plants, industrial boilers",
      health:
        "Can inflame airways, reduce lung function, increase respiratory infections",
      protection:
        "Avoid busy roads, ensure proper ventilation, limit outdoor exercise",
    },
    so2: {
      title: "SO2 (Sulfur Dioxide)",
      description: "A colorless gas with a sharp odor that can form acid rain.",
      sources: "Coal and oil combustion, industrial processes, volcanoes",
      health: "Can cause breathing problems, especially for people with asthma",
      protection:
        "Stay indoors during high levels, use bronchodilators if prescribed",
    },
    co: {
      title: "CO (Carbon Monoxide)",
      description:
        "A colorless, odorless gas that reduces oxygen delivery in the body.",
      sources: "Vehicle exhaust, faulty heating systems, generators",
      health:
        "Can cause headaches, dizziness, and in high concentrations, death",
      protection:
        "Ensure proper ventilation, install CO detectors, avoid idling vehicles",
    },
  };

  const info = pollutantInfo[pollutant];
  if (info) {
    body.innerHTML = `
                    <h3>${info.title}</h3>
                    <p><strong>What it is:</strong> ${info.description}</p>
                    <p><strong>Main sources:</strong> ${info.sources}</p>
                    <p><strong>Health effects:</strong> ${info.health}</p>
                    <p><strong>Protection measures:</strong> ${info.protection}</p>
                `;
  } else {
    body.innerHTML = "<p>Information not available for this pollutant.</p>";
  }

  modal.classList.add("show");
}

function closeModal() {
  document.getElementById("pollutantModal").classList.remove("show");
}

function zoomToLocation(lat, lon) {
  map.setView([lat, lon], 12);

  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  currentMarker = L.marker([lat, lon]).addTo(map);

  const highlight = L.circle([lat, lon], {
    radius: 5000,
    color: "#274375",
    fillColor: "#4a90e2",
    fillOpacity: 0.2,
    weight: 2,
  }).addTo(map);

  setTimeout(() => {
    if (map.hasLayer(highlight)) {
      map.removeLayer(highlight);
    }
  }, 3000);
}

function shareAlert() {
  const cityName = document.getElementById("cityName").textContent;
  const text = `⚠️ Air quality alert for ${cityName}! Air quality is currently unhealthy. Check current conditions and stay safe. ${window.location.href}`;

  if (navigator.share) {
    navigator
      .share({
        title: "Air Quality Alert",
        text: text,
      })
      .catch(console.error);
  } else {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Alert copied to clipboard! You can now paste and share it.");
      })
      .catch(() => {
        const options = confirm("Share on Twitter? (Cancel for WhatsApp)");
        const encodedText = encodeURIComponent(text);

        if (options) {
          window.open(
            `https://twitter.com/intent/tweet?text=${encodedText}`,
            "_blank"
          );
        } else {
          window.open(`https://wa.me/?text=${encodedText}`, "_blank");
        }
      });
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
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

function getUserLocation() {
  if (navigator.geolocation) {
    showLoading();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchLocationData(lat, lon);
        zoomToLocation(lat, lon);
      },
      (error) => {
        console.error("Geolocation error:", error);
        showError("Unable to get your location. Please search for a city.");
        hideLoading();
      }
    );
  } else {
    showError("Geolocation is not supported by this browser.");
  }
}

// Initialize app
function initApp() {
  initMap();

  // Add get location button
  const searchSection = document.querySelector(".search-section");
  const locationButton = document.createElement("button");
  locationButton.innerHTML = "📍 Use My Location";
  locationButton.className = "nav-btn";
  locationButton.style.width = "100%";
  locationButton.style.marginTop = "10px";
  locationButton.onclick = getUserLocation;
  searchSection.appendChild(locationButton);

  // Close modal when clicking outside
  document.getElementById("pollutantModal").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal();
    }
  });

  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    const searchContainer = document.querySelector(".search-container");
    if (!searchContainer.contains(e.target)) {
      hideSearchResults();
    }
  });

  // Handle URL parameters for direct links
  const params = new URLSearchParams(window.location.search);
  const lat = params.get("lat");
  const lon = params.get("lon");
  const name = params.get("name");

  if (lat && lon) {
    fetchLocationData(parseFloat(lat), parseFloat(lon), name);
    zoomToLocation(parseFloat(lat), parseFloat(lon));
  } else {
    // Try to get user's location on load
    getUserLocation();
  }
}

// Handle keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    hideSearchResults();
  }
});

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);

// Handle window resize for responsive behavior
window.addEventListener("resize", () => {
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
});

// Add PWA-like behavior
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  // Could add install app prompt here in production
});
