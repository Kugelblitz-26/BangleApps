// File: sleeplog.boot.js
// Purpose: Background service to log Heart Rate and Movement data.

(function() {
  const STORAGE_FILE = 'sleeplog.json';
  const LOG_INTERVAL_MS = 60000; // Log every 1 minute

  let logInterval;
  let lastMovement = { x: 0, y: 0, z: 0 };
  let currentMovement = 0;

  // Listen to accelerometer to accumulate movement data
  Bangle.on('accel', (acc) => {
    // Calculate magnitude of movement change since last reading
    let m = Math.abs(acc.x - lastMovement.x) + 
            Math.abs(acc.y - lastMovement.y) + 
            Math.abs(acc.z - lastMovement.z);
    currentMovement += m;
    lastMovement = acc;
  });

  // This function is called every minute to save one data point
  function logData() {
    let hr = Bangle.getHRM();

    // Only log if we have a good heart rate reading (confidence > 80)
    if (hr.confidence > 80) {
      // Get existing data from storage
      let data = require("Storage").readJSON(STORAGE_FILE, true) || [];
      
      // Add the new record
      data.push({
        time: Math.round(Date.now() / 1000), // Unix timestamp in seconds
        hr: hr.bpm,
        movement: parseFloat(currentMovement.toFixed(2))
      });

      // To save storage space, keep only the last 12 hours of data (12 * 60 = 720 points)
      while (data.length > 720) {
        data.shift(); // Remove the oldest entry
      }

      // Write data back to storage
      require("Storage").writeJSON(STORAGE_FILE, data);
    }
    // Reset movement counter for the next minute
    currentMovement = 0;
  }

  // --- Automatic Start/Stop Logic ---
  Bangle.on('lock', isLocked => {
    if (isLocked) {
      if (logInterval) return; // Already running
      // Screen is locked, user is likely inactive/sleeping. Start logging.
      Bangle.setHRMPower(1, "sleeplog");
      lastMovement = Bangle.getAccel(); // Initialize movement reading
      currentMovement = 0;
      logInterval = setInterval(logData, LOG_INTERVAL_MS);
      console.log("Sleep logging started.");
    } else {
      if (!logInterval) return; // Already stopped
      // Screen is unlocked, user is awake. Stop logging.
      clearInterval(logInterval);
      logInterval = undefined;
      Bangle.setHRMPower(0, "sleeplog");
      console.log("Sleep logging stopped.");
    }
  });
})();