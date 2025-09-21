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
    console.log(data);
    console.log(data.length);
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
        fetchPollutionData(city.lat, city.lon, city.name);
      };
      suggestionsList.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
  }
}
