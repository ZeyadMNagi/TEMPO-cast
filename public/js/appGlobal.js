async function fetchCitySuggestions(query) {
  if (query.length < 3) {
    document.getElementById("searchResults").innerHTML = "";
    return;
  }
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${query},US&limit=5&appid=YOUR_API_KEY`
    );
    const data = await response.json();
    const suggestionsList = document.getElementById("searchResults");
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "flex";
    data.forEach((city) => {
      const li = document.createElement("li");
      li.classList.add("searchItem");
      li.innerText = `${city.name}, ${city.state}, ${city.country}`;
      li.onclick = () => {
        document.getElementById("Search").value = `${city.name}, ${city.state}, ${city.country}`;
        document.getElementById("latitude").value = city.lat;
        document.getElementById("longitude").value = city.lon;
        suggestionsList.innerHTML = "";
        mapZoomToLocation(city.lat, city.lon);
        fetchPollutionData(city.lat, city.lon, city.name);
      };
      suggestionsList.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
  }
}

document.getElementById("searchInput").addEventListener("input", (event) => {
  fetchCitySuggestions(event.target.value);
});