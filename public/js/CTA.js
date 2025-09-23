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
  window.location.href = `./app?${params}`;
};

function showResourceModal(resource) {
  const modal = document.getElementById("resourceModal");
  const body = document.getElementById("modalBody");
  let html = "";
  switch (resource) {
    case "WHO":
      html = `<h3>WHO Instructions</h3>
        <p>Official World Health Organization guidelines for protecting yourself from air pollution. <a href="./WHO.html" target="_blank">Read more</a></p>`;
      break;
    case "OpenAQ":
      html = `<h3>OpenAQ</h3>
        <p>Global air quality data from thousands of stations. <a href="https://openaq.org" target="_blank">Visit OpenAQ</a></p>`;
      break;
    case "OpenWeather":
      html = `<h3>OpenWeather</h3>
        <p>Weather and pollution data APIs for developers and researchers. <a href="https://openweathermap.org" target="_blank">Visit OpenWeather</a></p>`;
      break;
    case "TEMPO":
      html = `<h3>NASA TEMPO</h3>
        <p>NASA's mission for real-time air quality monitoring over North America. <a href="https://tempo.si.edu/" target="_blank">Learn more</a></p>`;
      break;
    case "EPA":
      html = `<h3>EPA Air Trends</h3>
        <p>US Environmental Protection Agency air quality trends and reports. <a href="https://www.epa.gov/air-trends/air-quality-national-summary" target="_blank">View EPA Data</a></p>`;
      break;
    default:
      html = `<p>Resource info not found.</p>`;
  }
  body.innerHTML = html;
  modal.style.display = "flex";
}
function closeResourceModal() {
  document.getElementById("resourceModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", function () {
  const text = "From Space to Your Screen –  The World’s Air, Visualized.";
  let i = 0;
  const el = document.querySelector(".typewriter");
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, 40);
    }
  }
  el.textContent = "";
  type();
});

document.getElementById("micBtn").onclick = function () {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Voice search not supported in this browser.");
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById("Search").value = transcript;
    fetchCitySuggestions(transcript);
  };
  recognition.start();
};

document.querySelectorAll("nav a.nav-item").forEach((link) => {
  link.addEventListener("click", function (e) {
    const href = this.getAttribute("href");
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  });
});

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

navToggle.addEventListener("click", function () {
  navToggle.classList.toggle("active");
  navLinks.classList.toggle("open");
});

// Optional: Close nav when a link is clicked (mobile)
document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    navToggle.classList.remove("active");
    navLinks.classList.remove("open");
  });
});
