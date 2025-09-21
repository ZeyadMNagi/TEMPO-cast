function fetchPollutionData(lat, lon, city) {
  console.log("Fetching pollution data for:", lat, lon);
  fetch(`https://globaltempo.netlify.app//api/data?lat=${lat}&lon=${lon}`)
    .then((res) => res.json())
    .then((data) => {
      console.log(data);

      if (data.error) {
        document.getElementById("cityName").textContent = "Unknown City";
        document.getElementById("pollutionData").textContent =
          "Failed to fetch air pollution data.";
        console.error("Error fetching data:", data.error);
        return;
      }

      const airQuality = data.airQuality ? data.airQuality.sensors?.[0] : {};
      const components = data.weather.list?.[0]?.components || {};
      const aqi = data.weather.list?.[0]?.main?.aqi ?? "N/A";
      const cityName = data.airQuality
        ? data.airQuality.city
        : city || "Unknown City";
      console.log("City:", cityName);

      document.getElementById("cityName").textContent = cityName;
      console.log("Air Quality Data:", airQuality);
      console.log("Weather Components:", components);
      console.log("AQI:", aqi);
      console.log("City:", city);

      // Info for tooltips
      const pollutantInfo = {
        pm2_5:
          "PM2.5: Fine particles that can penetrate lungs and cause health issues.",
        pm10: "PM10: Coarse particles causing respiratory irritation.",
        o3: "O3: Ozone, high levels can cause breathing problems.",
        no2: "NO2: Nitrogen Dioxide, affects lung function, worsens asthma.",
        so2: "SO2: Sulfur Dioxide, can trigger asthma and other respiratory issues.",
        co: "CO: Carbon Monoxide, reduces oxygen delivery in body.",
      };

      // Severity colors (low=green, moderate=yellow, high=red)
      function getBarColor(value, pollutant) {
        if (!value) return "#ccc";
        switch (pollutant) {
          case "pm2_5":
            if (value <= 12) return "green";
            if (value <= 35.4) return "yellow";
            return "red";
          case "pm10":
            if (value <= 54) return "green";
            if (value <= 154) return "yellow";
            return "red";
          case "o3":
            if (value <= 50) return "green";
            if (value <= 100) return "yellow";
            return "red";
          case "no2":
            if (value <= 53) return "green";
            if (value <= 100) return "yellow";
            return "red";
          case "so2":
            if (value <= 35) return "green";
            if (value <= 75) return "yellow";
            return "red";
          case "co":
            if (value <= 4.4) return "green";
            if (value <= 9.4) return "yellow";
            return "red";
          default:
            return "#ccc";
        }
      }

      function createPollutantHTML(name, value, unit) {
        const color = getBarColor(value, name);
        return `
          <div class="pollutant">
            <span class="pollutant-name">${name.toUpperCase()} <span class="info-mark" title="${
          pollutantInfo[name]
        }">ℹ</span>:</span>
            <div class="pollutant-bar">
              <div class="pollutant-bar-fill" style="width: ${Math.min(
                value * 2,
                100
              )}%; background-color: ${color}"></div>
            </div>
            <span class='value'>${value ?? "N/A"} ${unit}</span>
          </div>
        `;
      }

      document.getElementById("cityName").textContent = city || "Unknown City";

      document.getElementById("pollutionData").innerHTML = `
        <div style="display: flex; justify-content: space-around; margin: 20px; font-size: 26px; font-weight: bolder;">
          <strong>AQI:</strong> ${aqi} <span class="info-mark" title="Air Quality Index. Lower is better.">ℹ️</span>
        </div>
        ${createPollutantHTML("pm2_5", components.pm2_5, "µg/m³")}
        ${createPollutantHTML("pm10", components.pm10, "µg/m³")}
        ${createPollutantHTML("o3", components.o3, "ppb")}
        ${createPollutantHTML("no2", components.no2, "ppb")}
        ${createPollutantHTML("so2", components.so2, "ppb")}
        ${createPollutantHTML("co", components.co, "ppb")}
      `;

      document.getElementById("tips").innerHTML = `
        <h3>Health Tips:</h3>
        <ul>
          <li>${getTip("pm2_5", components.pm2_5)}</li>
          <li>${getTip("pm10", components.pm10)}</li>
          <li>${getTip("o3", components.o3)}</li>
          <li>${getTip("no2", components.no2)}</li>
          <li>${getTip("so2", components.so2)}</li>
          <li>${getTip("co", components.co)}</li>
        </ul>
      `;

      function getTip(pollutant, value) {
        if (!value) return `No data for ${pollutant.toUpperCase()}.`;
        switch (pollutant) {
          case "pm2_5":
            if (value <= 12)
              return "Air quality is good. Enjoy outdoor activities.";
            if (value <= 35.4)
              return "Moderate air quality. Sensitive groups should reduce outdoor exertion.";
            return "Unhealthy air quality. Limit outdoor activities, especially if you have respiratory issues.";
          case "pm10":
            if (value <= 54)
              return "Air quality is good. Enjoy outdoor activities.";
            if (value <= 154)
              return "Moderate air quality. Sensitive groups should reduce outdoor exertion.";
            return "Unhealthy air quality. Limit outdoor activities, especially if you have respiratory issues.";
          case "o3":
            if (value <= 50)
              return "Air quality is good. Enjoy outdoor activities.";
            if (value <= 100)
              return "Moderate ozone levels. Sensitive groups should reduce outdoor exertion.";
            return "High ozone levels. Limit outdoor activities, especially if you have respiratory issues.";
          case "no2":
            if (value <= 53)
              return "Air quality is good. Enjoy outdoor activities.";
            if (value <= 100)
              return "Moderate NO2 levels. Sensitive groups should reduce outdoor exertion.";
            return "High NO2 levels. Limit outdoor activities, especially if you have respiratory issues.";
          case "so2":
            if (value <= 35)
              return "Air quality is good. Enjoy outdoor activities.";
            if (value <= 75)
              return "Moderate SO2 levels. Sensitive groups should reduce outdoor exertion.";
            return "High SO2 levels. Limit outdoor activities, especially if you have respiratory issues.";
          case "co":
            if (value <= 4.4)
              return "Air quality is good. Enjoy outdoor activities.";
            if (value <= 9.4)
              return "Moderate CO levels. Sensitive groups should reduce outdoor exertion.";
            return "High CO levels. Limit outdoor activities, especially if you have respiratory issues.";
          default:
            return "";
        }
      }

      // Show results section and hide form
      document.getElementById("side").style.flexDirection = "column";
      document.getElementById("side").style.width = "50%";

      document.getElementById("form").style.display = "none";
      document.getElementById("pollutionSection").style.display = "block";
      document.getElementById("tips").style.display = "block";
    })
    .catch((error) => {
      console.error("Error fetching pollution data:", error);
      document.getElementById("pollutionData").textContent =
        "Failed to fetch air pollution data.";
    });
}
