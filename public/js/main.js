document.getElementById("getLocationBtn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        document.getElementById("latitude").value = lat;
        document.getElementById("longitude").value = lon;
        document.getElementById(
          "locationDisplay"
        ).innerText = `Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(
          4
        )}`;
        document.getElementById("errorMessage").innerText = "";
      },
      (error) => {
        document.getElementById("errorMessage").innerText =
          "Error getting location. Please allow location access.";
      }
    );
  } else {
    document.getElementById("errorMessage").innerText =
      "Geolocation is not supported by this browser.";
  }
});

async function fetchCitySuggestions(query) {
  if (query.length < 3) {
    document.getElementById("suggestions").innerHTML = "";
    return;
  }
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=6e976d04a47c92a2de198b05560adf59`
    );
    const data = await response.json();
    const suggestionsList = document.getElementById("suggestions");
    suggestionsList.innerHTML = "";
    data.forEach((city) => {
      const li = document.createElement("li");
      li.innerText = `${city.name}, ${city.country}`;
      li.onclick = () => {
        document.getElementById(
          "city-input"
        ).value = `${city.name}, ${city.country}`;
        document.getElementById("latitude").value = city.lat;
        document.getElementById("longitude").value = city.lon;
        suggestionsList.innerHTML = "";
        document.getElementById(
          "locationDisplay"
        ).innerText = `Latitude: ${city.lat.toFixed(
          4
        )}, Longitude: ${city.lon.toFixed(4)}`;
        document.getElementById("errorMessage").innerText = "";
      };
      suggestionsList.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
  }
}

// Calculate distance between two lat/lon points (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

document.getElementById("get-data").addEventListener("click", async () => {
  const lat = parseFloat(document.getElementById("latitude").value) || 30.0444;
  const lon = parseFloat(document.getElementById("longitude").value) || 31.2357;

  try {
    const response = await fetch(`/api/data?lat=${lat}&lon=${lon}`);
    const data = await response.json();
    console.log(data);

    const openWeatherPM25 = data.weather.list[0].components.pm2_5;
    const openAqData = data.airQuality;

    let chosenSource = "OpenWeather";
    let chosenValue = openWeatherPM25;

    if (openAqData && openAqData.coordinates) {
      const stationLat = openAqData.coordinates.latitude;
      const stationLon = openAqData.coordinates.longitude;
      const distance = getDistance(lat, lon, stationLat, stationLon);
      console.log(`OpenAQ station is ${distance.toFixed(1)} km away`);

      if (distance <= 50) {
        chosenSource = "OpenAQ";
        chosenValue = openAqData.value;
      }
    }

    document.getElementById("openweather-result").innerHTML = `
      <strong>Air Quality Index:</strong> ${data.weather.list[0].main.aqi} (0=Good, 5=Very Poor)<br>
      <strong>Chosen PM2.5:</strong> ${chosenValue} µg/m³ <small>(Source: ${chosenSource})</small><br>
      <strong>PM10:</strong> ${data.weather.list[0].components.pm10} µg/m³<br>
      <strong>O₃:</strong> ${data.weather.list[0].components.o3} µg/m³
    `;

    document.getElementById("openaq-result").innerHTML = `
      <strong>PM2.5 (OpenAQ):</strong> ${
        openAqData ? openAqData.value : "N/A"
      } µg/m³
      <small>${
        openAqData
          ? `(Station: ${openAqData.coordinates.latitude.toFixed(
              2
            )}, ${openAqData.coordinates.longitude.toFixed(2)})`
          : ""
      }</small>
    `;

    document.getElementById("results").style.display = "block";
  } catch (err) {
    console.error("Error fetching data:", err);
  }
});
