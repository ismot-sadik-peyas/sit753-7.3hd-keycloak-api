// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 5000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
