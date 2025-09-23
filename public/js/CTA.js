async function fetchCitySuggestions(query) {
  if (query.length < 3) {
    document.getElementById("searchResults").innerHTML = "";
    return;
  }
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=6e976d04a47c92a2de198b05560adf59`
    );
    const data = await response.json();
    const suggestionsList = document.getElementById("searchResults");
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "flex";
    data.forEach((city) => {
      const li = document.createElement("li");
      li.classList.add("searchItem");
      li.innerText = `${city.name}, ${city.state || ""}, ${city.country}`;
      li.onclick = () => {
        const searchInput = document.getElementById("Search");
        if (searchInput) {
          searchInput.value = `${city.name}, ${city.state || ""}, ${
            city.country
          }`;
        }

        console.log(city);
        const latitudeInput = document.getElementById("latitude");
        if (latitudeInput) latitudeInput.value = city.lat;
        const longitudeInput = document.getElementById("longitude");
        if (longitudeInput) longitudeInput.value = city.lon;
        suggestionsList.innerHTML = "";
        const locationDisplay = document.getElementById("locationDisplay");
        if (locationDisplay) {
          locationDisplay.innerText = `Latitude: ${city.lat.toFixed(
            4
          )}, Longitude: ${city.lon.toFixed(4)}`;
        }
        const errorMessage = document.getElementById("errorMessage");
        if (errorMessage) errorMessage.innerText = "";
        suggestionsList.style.display = "none";

        window.selectedCityInfo = {
          name: city.name,
          state: city.state || "",
          country: city.country,
          lat: city.lat,
          lon: city.lon,
        };
        console.log("Selected city info:", window.selectedCityInfo);
      };
      suggestionsList.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
  }
}

document.getElementById("getLocationBtn").onclick = async function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        console.log("Geolocation obtained:", lat, lon);

        const latitudeInput = document.getElementById("latitude");
        if (latitudeInput) latitudeInput.value = lat;
        const longitudeInput = document.getElementById("longitude");
        if (longitudeInput) longitudeInput.value = lon;
        const locationDisplay = document.getElementById("locationDisplay");
        if (locationDisplay) {
          locationDisplay.innerText = `Latitude: ${lat.toFixed(
            4
          )}, Longitude: ${lon.toFixed(4)}`;
        }

        const errorMessage = document.getElementById("errorMessage");
        if (errorMessage) errorMessage.innerText = "";

        try {
          // Reverse geocode to get city name
          const res = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=6e976d04a47c92a2de198b05560adf59`
          );
          const data = await res.json();
          let cityName = "Unknown Location";
          let state = "";
          let country = "";

          if (data && data.length > 0) {
            cityName = data[0].name;
            state = data[0].state || "";
            country = data[0].country || "";
          }

          // Fill search bar with detected city
          const searchInput = document.getElementById("Search");
          if (searchInput) {
            searchInput.value = `${cityName}, ${state}, ${country}`;
          }

          // Save city info globally
          window.selectedCityInfo = {
            name: cityName,
            state: state,
            country: country,
            lat: lat,
            lon: lon,
          };

          console.log("Selected city info:", window.selectedCityInfo);
        } catch (e) {
          console.error("Error reverse geocoding:", e);
          document.getElementById("errorMessage").innerText =
            "Couldn't fetch city name. Coordinates only.";
        }
      },
      (error) => {
        document.getElementById("errorMessage").innerText =
          "Error getting location. Please enter your city manually.";
        console.error("Geolocation error:", error);
      }
    );
  } else {
    document.getElementById("errorMessage").innerText =
      "Geolocation is not supported by this browser.";
  }
};

document.getElementById("checkMyCityBtn").onclick = function () {
  const city = window.selectedCityInfo;
  if (!city) {
    document.getElementById("errorMessage").innerText =
      "Please select a city first.";
    return;
  }
  const params = new URLSearchParams({
    name: city.name,
    state: city.state,
    country: city.country,
    lat: city.lat,
    lon: city.lon,
  }).toString();

  console.log("Navigating with params:", params);
  if (city.country === "US") {
    window.location.href = `./app?${params}`;
  } else {
    window.location.href = `./app-global?${params}`;
  }
};
