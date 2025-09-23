# 🌍 Global TEMPO

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey?logo=express)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-blue.svg)](#-contributing)

**Global TEMPO** is a comprehensive web application that delivers **real-time air quality** and **weather data** worldwide.  
It aggregates information from multiple trusted sources — including **NASA's TEMPO satellite** for North America and **OpenAQ** & **OpenWeather** for global coverage — to give users a complete picture of their environment.

---

## ✨ Features

- **📊 Real-Time Data** – Up-to-the-minute Air Quality Index (AQI) and weather information.
- **🗺️ Interactive Maps** – Visualize air pollution levels and weather patterns on a responsive, user-friendly map.
- **🩺 Health Recommendations** – Actionable advice to protect yourself and your family based on current AQI.
- **📚 Educational Resources** – Learn about air pollution, its sources, and its effects on health and the environment.
- **🎙️ Voice Search** – Quickly search for locations using voice input.

---

## 🖼️ Screenshots

| Landing Page | Interactive Map |
|-------------|----------------|
| ![Landing Page Screenshot](./public/assets/Global-TEMPO-Home.png)  | ![Map Screenshot](./public/assets/Global-TEMPO-NASA-Air-Quality-Forecasting.png) |


---

## 🛠️ Technology Stack

### **Frontend**
- **HTML5** – Page structure.
- **CSS3** – Mobile-first, responsive design.
- **JavaScript** – API calls, map rendering, and interactive functionality.

### **Backend**
- **Node.js** – Runtime environment.
- **Express.js** – Web framework for API routing and serving static files.
- **Axios** – HTTP client for external API calls.
- **Dotenv** – Securely loads environment variables.

---

## 🌐 Data Sources

- **NASA TEMPO** – *Tropospheric Emissions: Monitoring of Pollution*, providing air quality data for North America.
- **OpenAQ** – Global open-source air quality data aggregator.
- **OpenWeatherMap** – Global weather and forecast data.

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/global-tempo.git
cd global-tempo
```
### 2️⃣ Install Dependencies
```node
npm install
```
### 3️⃣ Configure Environment Variables

Create a .env file in the project root and add your API keys:
```.env
OPENWEATHER_API_KEY=your_openweather_api_key
OPENAQ_API_KEY=your_openaq_api_key
```
### 4️⃣ Run the Application
```node
node server.js
```
### 5️⃣ Access the App

Open your browser and navigate to:

http://localhost:3000

##  👤 Author

Zeyad M. Khattab