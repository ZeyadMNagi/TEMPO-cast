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
document.getElementById("get-data").addEventListener("click", async () => {
  const lat = document.getElementById("latitude").value || 30.0444;
  const lon = document.getElementById("longitude").value || 31.2357;
  try {
    const response = await fetch(`/api/data?lat=${lat}&lon=${lon}`);
    const data = await response.json();
    console.log(data);
    document.getElementById("openweather-result").innerText = JSON.stringify(
      data.weather,
      null,
      2
    );
    document.getElementById("openaq-result").innerText = JSON.stringify(
      data.airQuality,
      null,
      2
    );
    document.getElementById("results").style.display = "block";
  } catch (err) {
    console.error("Error fetching data:", err);
  }
});
