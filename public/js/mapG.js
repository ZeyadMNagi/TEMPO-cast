const map = L.map("map").setView([0, 0], 3);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const geojsonUrl =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.geojson";
L.geoJSON
  .ajax(geojsonUrl, {
    onEachFeature: function (feature, layer) {
      layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
    },
  })
  .addTo(map);

function mapZoomToLocation(lat, lon) {
  map.setView([lat, lon], 10);

  const highlight = L.circle([lat, lon], {
    radius: 20000,
    color: 'yellow',
    fillColor: 'yellow',
    fillOpacity: 0.3,
  }).addTo(map);

  const overlay = L.rectangle(
    map.getBounds(),
    {
      color: '#000',
      weight: 0,
      fillOpacity: 0.4,
      interactive: false,
    }
  ).addTo(map);

  highlight.bringToFront();
}