const pollutantInfo = {
  AQI: "Air Quality Index (1–500), higher is worse. [US EPA]",
  pm2_5: "Fine particulate matter ≤2.5µm. Can penetrate lungs. [WHO]",
  pm10: "Particulate matter ≤10µm. Can irritate eyes and respiratory tract. [WHO]",
  o3: "Ozone. High levels can cause breathing issues. [US EPA]",
  no2: "Nitrogen Dioxide. Can affect lungs and exacerbate asthma. [US EPA]",
  so2: "Sulfur Dioxide. Can trigger respiratory problems. [US EPA]",
  co: "Carbon Monoxide. Reduces oxygen delivery in the body. [US EPA]",
};

const healthTips = {
  AQI: [
    { max: 50, tip: "Air quality is good. Enjoy outdoor activities. [US EPA]" },
    {
      max: 100,
      tip: "Air quality is moderate. Sensitive groups should reduce prolonged outdoor exertion. [US EPA]",
    },
    {
      max: 150,
      tip: "Air quality is unhealthy for sensitive groups. Limit outdoor activities. [US EPA]",
    },
    {
      max: 200,
      tip: "Air quality is unhealthy. Avoid outdoor exertion. [US EPA]",
    },
    {
      max: 300,
      tip: "Air quality is very unhealthy. Stay indoors and keep windows closed. [US EPA]",
    },
    {
      max: Infinity,
      tip: "Air quality is hazardous. Avoid all outdoor activity. [US EPA]",
    },
  ],
  pm2_5: [
    { max: 12, tip: "PM2.5 is low. No precautions needed. [WHO]" },
    {
      max: 35.4,
      tip: "Sensitive groups: consider reducing long outdoor exposure. [WHO]",
    },
    {
      max: Infinity,
      tip: "Everyone: avoid outdoor activities and wear masks if outside. [WHO]",
    },
  ],
  pm10: [
    { max: 54, tip: "PM10 is low. Safe for everyone. [WHO]" },
    { max: 154, tip: "Sensitive individuals: limit outdoor exertion. [WHO]" },
    {
      max: Infinity,
      tip: "High PM10: stay indoors, avoid exercise outdoors. [WHO]",
    },
  ],
  o3: [
    { max: 50, tip: "Ozone levels are safe. [US EPA]" },
    { max: 100, tip: "Sensitive people: limit outdoor activities. [US EPA]" },
    { max: Infinity, tip: "High ozone: avoid outdoor exertion. [US EPA]" },
  ],
  no2: [
    { max: 53, tip: "NO2 levels are safe. [US EPA]" },
    {
      max: 100,
      tip: "Sensitive people: reduce prolonged outdoor activity. [US EPA]",
    },
    { max: Infinity, tip: "High NO2: stay indoors if possible. [US EPA]" },
  ],
  so2: [
    { max: 35, tip: "SO2 levels are safe. [US EPA]" },
    { max: 75, tip: "Sensitive people: limit outdoor activity. [US EPA]" },
    { max: Infinity, tip: "High SO2: stay indoors, avoid exposure. [US EPA]" },
  ],
  co: [
    { max: 4.4, tip: "CO levels are safe. [US EPA]" },
    {
      max: 9.4,
      tip: "Sensitive individuals: reduce heavy outdoor exertion. [US EPA]",
    },
    {
      max: Infinity,
      tip: "High CO: stay indoors, especially people with heart or lung conditions. [US EPA]",
    },
  ],
};

function getTip(pollutant, value) {
  if (!value || !healthTips[pollutant]) return "No tip available.";
  for (const level of healthTips[pollutant]) {
    if (value <= level.max) return level.tip;
  }
  return "No tip available.";
}
