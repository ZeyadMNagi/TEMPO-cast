async function fetchUSACitySuggestions(query) {
  if (query.length < 3) {
    document.getElementById("searchResults").innerHTML = "";
    return;
  }
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${query},US&limit=5&appid=6e976d04a47c92a2de198b05560adf59`
    );
    const data = await response.json();
    const suggestionsList = document.getElementById("searchResults");
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "flex";
    console.log(data);
    data.forEach((city) => {
      const li = document.createElement("li");
      li.classList.add("searchItem");
      li.innerText = `${city.name}, ${city.state}, ${city.country}`;
      li.onclick = () => {
        document.getElementById(
          "Search"
        ).value = `${city.name}, ${city.state}, ${city.country}`;
        document.getElementById("latitude").value = city.lat;
        document.getElementById("longitude").value = city.lon;
        suggestionsList.innerHTML = "";
        document.getElementById(
          "locationDisplay"
        ).innerText = `Latitude: ${city.lat.toFixed(
          4
        )}, Longitude: ${city.lon.toFixed(4)}`;
        document.getElementById("errorMessage").innerText = "";
        suggestionsList.style.display = "none";
        mapZoomToLocation(city.lat, city.lon);
      };
      suggestionsList.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
  }
}

document.getElementById("getLocationBtn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
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

        // Check if user is in the USA
        try {
          const res = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=6e976d04a47c92a2de198b05560adf59`
          );
          const locData = await res.json();
          const country = locData[0]?.country;
          if (country !== "US") {
            alert(
              "You are outside the USA. Redirecting you to the global app."
            );
            window.location.href = `../app-global/index.html?lat=${lat}&lon=${lon}`;
            return;
          }
        } catch (err) {
          document.getElementById("errorMessage").innerText =
            "Could not verify your location.";
          return;
        }

        mapZoomToLocation(lat, lon);
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
