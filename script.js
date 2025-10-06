const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

function getWeatherByCoords(lat, lon) {
    const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    fetchWeatherData(url, lat, lon);
}

function getWeatherByCity(cityName) {
    const geoUrl = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

    fetch(geoUrl)
        .then(r => r.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const { latitude, longitude } = data.results[0];
                getWeatherByCoords(latitude, longitude);
            } else {
                displayError('City not found. Please try a different city.');
            }
        })
        .catch(() => displayError('City geocoding failed. Try again.'));
}

function fetchWeatherData(url, lat, lon) {
    fetch(url)
        .then(r => r.json())
        .then(data => getCityName(lat, lon, data))
        .catch(() => displayError('Unable to fetch weather data.'));
}

function getCityName(lat, lon, weatherData) {
    const reverseGeoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    fetch(reverseGeoUrl)
        .then(r => r.json())
        .then(locData => {
            const cityName = locData.city || locData.locality || locData.principalSubdivision || 'Unknown Location';
            const country = locData.countryName || '';
            displayWeatherData(weatherData, cityName, country);
        })
        .catch(() => displayWeatherData(weatherData, 'Your Location', ''));
}

function getWeatherDescription(weatherCode, isDay) {
    // See detailed weather codes: https://open-meteo.com/en/docs
    const w = {
        0: { description: 'Clear sky', icon: isDay ? '☀️' : '🌙' },
        1: { description: 'Mainly clear', icon: isDay ? '🌤️' : '🌙' },
        2: { description: 'Partly cloudy', icon: '⛅' },
        3: { description: 'Overcast', icon: '☁️' },
        45: { description: 'Fog', icon: '🌫️' },
        48: { description: 'Depositing rime fog', icon: '🌫️' },
        51: { description: 'Light drizzle', icon: '🌦️' },
        53: { description: 'Moderate drizzle', icon: '🌦️' },
        55: { description: 'Dense drizzle', icon: '🌧️' },
        56: { description: 'Light freezing drizzle', icon: '🌧️' },
        57: { description: 'Dense freezing drizzle', icon: '🌧️' },
        61: { description: 'Slight rain', icon: '🌦️' },
        63: { description: 'Moderate rain', icon: '🌧️' },
        65: { description: 'Heavy rain', icon: '🌧️' },
        66: { description: 'Light freezing rain', icon: '🌧️' },
        67: { description: 'Heavy freezing rain', icon: '🌧️' },
        71: { description: 'Slight snow', icon: '🌨️' },
        73: { description: 'Moderate snow', icon: '❄️' },
        75: { description: 'Heavy snow', icon: '❄️' },
        77: { description: 'Snow grains', icon: '❄️' },
        80: { description: 'Slight rain showers', icon: '🌦️' },
        81: { description: 'Moderate rain showers', icon: '🌧️' },
        82: { description: 'Violent rain showers', icon: '⛈️' },
        85: { description: 'Slight snow showers', icon: '🌨️' },
        86: { description: 'Heavy snow showers', icon: '❄️' },
        95: { description: 'Thunderstorm', icon: '⛈️' },
        96: { description: 'Thunderstorm w/ slight hail', icon: '⛈️' },
        99: { description: 'Thunderstorm w/ heavy hail', icon: '⛈️' }
    };
    return w[weatherCode] || { description: 'Unknown', icon: '❓' };
}

function displayWeatherData(data, cityName, country) {
    const current = data.current;
    const daily = data.daily;
    const weatherInfo = getWeatherDescription(current.weather_code, current.is_day);

    let dashboardHTML = `
        <div class="weather-header">
            <h1>${cityName}</h1>
            <div class="location">${country}</div>
        </div>
        <div class="weather-main">
            <div class="weather-icon">${weatherInfo.icon}</div>
            <div class="temperature">${Math.round(current.temperature_2m)}°C</div>
        </div>
        <div class="weather-description">${weatherInfo.description}</div>
        <div class="weather-details">
            <div class="detail-item"><span class="icon">🌡️</span>
                <div class="text">Feels like<br><strong>${Math.round(current.apparent_temperature)}°C</strong></div>
            </div>
            <div class="detail-item"><span class="icon">💧</span>
                <div class="text">Humidity<br><strong>${current.relative_humidity_2m || '-'}%</strong></div>
            </div>
            <div class="detail-item"><span class="icon">💨</span>
                <div class="text">Wind<br><strong>${current.wind_speed_10m || '-'} km/h</strong></div>
            </div>
            <div class="detail-item"><span class="icon">📊</span>
                <div class="text">Pressure<br><strong>${Math.round(current.pressure_msl || 0)} hPa</strong></div>
            </div>
        </div>
        <div class="forecast-header"><b>Forecast</b></div>
        <div class="forecast-row">
    `;

    // Show next 4 days of forecast
    for (let i = 1; i < Math.min(5, daily.time.length); i++) {
        const dateStr = new Date(daily.time[i]).toLocaleDateString(undefined, { weekday: 'short' });
        const dayCode = daily.weather_code[i];
        const forecastInfo = getWeatherDescription(dayCode, 1);
        dashboardHTML += `
            <div class="forecast-item">
                <div class="forecast-day">${dateStr}</div>
                <div>${forecastInfo.icon}</div>
                <div style="font-size:0.9rem;">${forecastInfo.description}</div>
                <div class="forecast-temp"><b>${Math.round(daily.temperature_2m_min[i])}° / ${Math.round(daily.temperature_2m_max[i])}°C</b></div>
            </div>
        `;
    }
    dashboardHTML += `</div>`;
    document.getElementById('dashboard').innerHTML = dashboardHTML;
}

function displayError(message) {
    document.getElementById('dashboard').innerHTML = `<div class="error"><h2>Oops!</h2><p>${message}</p></div>`;
}

function getCurrentLocation() {
    showLoading();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
            () => displayError('Unable to access your location. Please enter a city.')
        );
    } else {
        displayError('Geolocation not supported.');
    }
}
function searchCity() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) { alert('Enter a city name first!'); return; }
    showLoading();
    getWeatherByCity(city);
    document.getElementById('cityInput').value = '';
}
function showLoading() {
    document.getElementById('dashboard').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading weather data...</p>
        </div>`;
}
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('cityInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') searchCity();
    });
    getCurrentLocation();
});
