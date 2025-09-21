function fetchPollutionData(lat, lon,city) {
  console.log("Fetching pollution data for:", lat, lon);
  fetch(`http://localhost:8080/api/data?lat=${lat}&lon=${lon}`)
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      if (data.error) {
        document.getElementById("cityName").textContent = "Unknown City";
        document.getElementById("pollutionData").textContent =
          "Failed to fetch air pollution data.";
        return;
      }
      const airQuality = data.airQuality.sensors[0] || {};
      const components = data.weather.list[0].components || {};
      const aqi = data.weather.list[0].main.aqi ?? "N/A";
      console.log("Final components:", components, "AQI:", aqi);

      document.getElementById("cityName").textContent =
        city|| "Unknown City";
      document.getElementById("pollutionData").innerHTML = `
          <strong>AQI:</strong> ${aqi}<br>
          <strong>PM2.5:</strong> ${components.pm2_5 ?? "N/A"} µg/m³<br>
          <strong>PM10:</strong> ${components.pm10 ?? "N/A"} µg/m³<br>
          <strong>O3:</strong> ${components.o3 ?? "N/A"} ppb<br>
          <strong>NO2:</strong> ${components.no2 ?? "N/A"} ppb<br>
          <strong>SO2:</strong> ${components.so2 ?? "N/A"} ppb<br>
          <strong>CO:</strong> ${components.co ?? "N/A"} ppb
        `;
    })
    .catch(() => {
      document.getElementById("pollutionData").textContent =
        "Failed to fetch air pollution data.";
    });
}

