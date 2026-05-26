const PIPELINE_MODE = process.env.PIPELINE_MODE === "true";

const express = require("express");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors()); // Allow frontend to call this API

// -------------------------------------------------------
// CONFIGURATION
// -------------------------------------------------------
const KEYCLOAK_REALM = "iam-lab";
const KEYCLOAK_URL = "http://localhost:8080"; 
const CONTACTS_FILE = path.join(__dirname, "contact.json");

// -------------------------------------------------------
// Token verification
// -------------------------------------------------------
const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function authenticate(req, res, next) {
  if (PIPELINE_MODE) return next(); // Skip auth in Jenkins

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing Token" });

  const token = auth.split(" ")[1];

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid Token" });
    req.user = decoded;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (PIPELINE_MODE) return next(); // Skip role check in Jenkins

    const roles = req.user.realm_access?.roles || [];
    if (!roles.includes(role)) {
      return res.status(403).json({ error: "Access Denied: Missing Role" });
    }
    next();
  };
}


function getContactsData() {
    try {
        const rawData = fs.readFileSync(CONTACTS_FILE);
        return JSON.parse(rawData);
    } catch (err) {
        return [];
    }
}

// -------------------------------------------------------
// THE API ENDPOINT (Return contact list)
// -------------------------------------------------------
//Added health endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


app.get("/api/categories", authenticate, (req, res) => {
    const data = getContactsData();
    const uniqueCategories = [...new Set(data.map(item => item.type))];
    res.json(uniqueCategories);
});


// GET /api/contacts/friends  OR  /api/contacts/colleagues
app.get("/api/contacts/:type", authenticate, requireRole("api-user"), (req, res) => {
    const requestedType = req.params.type; // 'friend' or 'colleague'

    // 1. Read the file
    fs.readFile(CONTACTS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return res.status(500).json({ error: "Server Error: Could not read contacts." });
        }

        try {
            // 2. Parse JSON
            const allContacts = JSON.parse(data);

            // 3. Filter the list
            // (e.g., Keep only items where type === "friend")
            const filteredContacts = allContacts.filter(
                c => c.type === requestedType.toLowerCase() // normalize to lowercase
            );

            // 4. Send response
            res.json({
                requester: req.user.preferred_username,
                category: requestedType,
                count: filteredContacts.length,
                data: filteredContacts
            });

        } catch (parseError) {
            res.status(500).json({ error: "Server Error: Corrupt Data File." });
        }
    });
});

app.listen(3030, () => {
  console.log("Contact Service running on http://localhost:3030");
});
