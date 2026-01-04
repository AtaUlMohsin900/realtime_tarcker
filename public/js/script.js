// Connect to the server
const socket = io();
console.log("Socket connection established");

// Initialize map
let map;
let markers = {};
let myMarker = null;
let accuracyCircle = null;
let watchId = null;

// Initialize the application
function init() {
    // Check if browser supports geolocation
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser. Please use Chrome, Firefox, or Safari.");
        return;
    }
    
    // Initialize map centered at (0, 0) with zoom level 15
    map = L.map("map").setView([0, 0], 15);
    
    // Add OpenStreetMap tiles to the map
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add scale control
    L.control.scale().addTo(map);
    
    // Request geolocation with options
    requestGeolocation();
    
    // Setup socket event listeners
    setupSocketListeners();
}

// Request geolocation with options
function requestGeolocation() {
    const options = {
        enableHighAccuracy: true,   // High accuracy
        timeout: 5000,              // 5-second timeout
        maximumAge: 0              // No caching
    };
    
    // Get initial position
    navigator.geolocation.getCurrentPosition(
        (position) => {
            updateMyLocation(position);
        },
        (error) => {
            handleGeolocationError(error);
        },
        options
    );
    
    // Use watchPosition to track continuously
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            updateMyLocation(position);
        },
        (error) => {
            handleGeolocationError(error);
        },
        options
    );
}

// Update my location and emit via socket
function updateMyLocation(position) {
    const { latitude, longitude, accuracy } = position.coords;
    
    console.log("My location:", { latitude, longitude, accuracy: accuracy + "m" });
    
    // Center map on new coordinates
    map.setView([latitude, longitude], 15);
    
    // Create or update my marker
    if (!myMarker) {
        // Create a custom icon for myself
        const myIcon = L.divIcon({
            html: '<div style="background-color: #FF0000; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
            className: 'my-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });
        
        myMarker = L.marker([latitude, longitude], { icon: myIcon })
            .addTo(map)
            .bindPopup("<b>You are here</b><br>Lat: " + latitude.toFixed(6) + "<br>Lng: " + longitude.toFixed(6))
            .openPopup();
    } else {
        myMarker.setLatLng([latitude, longitude]);
        myMarker.getPopup().setContent("<b>You are here</b><br>Lat: " + latitude.toFixed(6) + "<br>Lng: " + longitude.toFixed(6));
    }
    
    // Update accuracy circle
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
    }
    
    accuracyCircle = L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#FF0000',
        fillColor: '#FF0000',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);
    
    // Emit the latitude and longitude via socket with "send-location"
    socket.emit("send-location", { 
        latitude, 
        longitude,
        accuracy: accuracy,
        timestamp: new Date().toISOString()
    });
}

// Handle geolocation errors
function handleGeolocationError(error) {
    console.error("Geolocation error:", error);
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("Location permission denied. Please enable location services.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable. Check your GPS/WiFi connection.");
            break;
        case error.TIMEOUT:
            console.warn("Location request timed out. Trying again...");
            // Retry after 2 seconds
            setTimeout(() => {
                requestGeolocation();
            }, 2000);
            break;
        default:
            alert("An unknown error occurred while getting your location.");
    }
}

// Setup socket event listeners
function setupSocketListeners() {
    // When receiving location data via the socket
    socket.on("receive-location", (data) => {
        const { id, latitude, longitude, accuracy } = data;
        console.log("Received location from", id.substring(0, 8) + "...", { latitude, longitude });
        
        // Center the map on the new coordinates (optional - you might want to remove this)
        // map.setView([latitude, longitude], 15);
        
        // If a marker for the id exists, update its position
        if (markers[id]) {
            markers[id].setLatLng([latitude, longitude]);
            
            // Update popup
            markers[id].getPopup().setContent(
                `<b>User: ${id.substring(0, 8)}...</b><br>` +
                `Lat: ${latitude.toFixed(6)}<br>` +
                `Lng: ${longitude.toFixed(6)}<br>` +
                `Accuracy: ${accuracy ? Math.round(accuracy) + 'm' : 'Unknown'}`
            );
        } else {
            // Otherwise, create a new marker at the given coordinates
            const icon = L.divIcon({
                html: '<div style="background-color: #2196F3; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                className: 'user-marker',
                iconSize: [19, 19],
                iconAnchor: [9.5, 9.5]
            });
            
            markers[id] = L.marker([latitude, longitude], { icon })
                .addTo(map)
                .bindPopup(
                    `<b>User: ${id.substring(0, 8)}...</b><br>` +
                    `Lat: ${latitude.toFixed(6)}<br>` +
                    `Lng: ${longitude.toFixed(6)}<br>` +
                    `Accuracy: ${accuracy ? Math.round(accuracy) + 'm' : 'Unknown'}`
                );
            
            console.log("Created new marker for user:", id);
        }
        
        // Update marker count display
        updateMarkerCount();
    });
    
    // Handle existing users when connecting
    socket.on("existing-users", (users) => {
        console.log("Received existing users:", users.length);
        
        users.forEach(user => {
            const { id, latitude, longitude, accuracy } = user;
            
            const icon = L.divIcon({
                html: '<div style="background-color: #2196F3; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                className: 'user-marker',
                iconSize: [19, 19],
                iconAnchor: [9.5, 9.5]
            });
            
            markers[id] = L.marker([latitude, longitude], { icon })
                .addTo(map)
                .bindPopup(
                    `<b>User: ${id.substring(0, 8)}...</b><br>` +
                    `Lat: ${latitude.toFixed(6)}<br>` +
                    `Lng: ${longitude.toFixed(6)}<br>` +
                    `Accuracy: ${accuracy ? Math.round(accuracy) + 'm' : 'Unknown'}`
                );
        });
        
        updateMarkerCount();
    });
    
    // When a user disconnect, remove their marker from the map
    socket.on("user-disconnected", (userId) => {
        console.log("User disconnected:", userId);
        
        if (markers[userId]) {
            map.removeLayer(markers[userId]);
            delete markers[userId];
            console.log("Removed marker for user:", userId);
            
            // Update marker count display
            updateMarkerCount();
        }
    });
    
    // Connection status
    socket.on("connect", () => {
        console.log("Connected to server with ID:", socket.id);
        document.getElementById("connection-status").textContent = "Connected";
        document.getElementById("connection-status").className = "connected";
        document.getElementById("user-id").textContent = socket.id.substring(0, 8) + "...";
    });
    
    socket.on("disconnect", () => {
        console.log("Disconnected from server");
        document.getElementById("connection-status").textContent = "Disconnected";
        document.getElementById("connection-status").className = "disconnected";
    });
    
    socket.on("welcome", (data) => {
        console.log("Server welcome:", data.message);
    });
}

// Update marker count display
function updateMarkerCount() {
    const count = Object.keys(markers).length;
    const countElement = document.getElementById("marker-count");
    if (countElement) {
        countElement.textContent = count;
    }
    console.log("Active markers:", count);
}

// Cleanup function
function cleanup() {
    // Stop watching position
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log("Stopped geolocation tracking");
    }
    
    // Clear accuracy circle
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
    }
    
    // Clear all markers
    Object.keys(markers).forEach(id => {
        map.removeLayer(markers[id]);
    });
    
    // Clear my marker
    if (myMarker) {
        map.removeLayer(myMarker);
    }
    
    // Disconnect socket
    if (socket) {
        socket.disconnect();
    }
}

// Add some utility functions
function centerOnMyLocation() {
    if (myMarker) {
        const latLng = myMarker.getLatLng();
        map.setView([latLng.lat, latLng.lng], 15);
    }
}

function refreshLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            updateMyLocation,
            handleGeolocationError,
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing application...");
    init();
});

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);

// Export for debugging (optional)
window.app = {
    socket,
    map,
    markers,
    myMarker,
    centerOnMyLocation,
    refreshLocation,
    cleanup
};