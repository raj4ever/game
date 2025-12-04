const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Generate self-signed certificate if it doesn't exist
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

let httpsOptions = {};

// Check if certificates exist, if not, create them
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('Creating self-signed certificate...');
  const { execSync } = require('child_process');
  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/C=IN/ST=State/L=City/O=Organization/CN=localhost"`,
      { stdio: 'inherit' }
    );
    console.log('Certificate created successfully!');
  } catch (error) {
    console.error('Error creating certificate. Make sure OpenSSL is installed.');
    console.error('You can also use: localhost:3000 instead of IP address');
    process.exit(1);
  }
}

try {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
} catch (error) {
  console.error('Error reading certificate files:', error.message);
  process.exit(1);
}

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
    console.log(`> Also accessible via your local network IP on port ${port}`);
    console.log(`> Note: You'll need to accept the self-signed certificate warning in your browser`);
  });
});

