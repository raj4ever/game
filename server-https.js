const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const certDir = path.join(__dirname, '.certs');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

// Function to generate self-signed certificate
function generateCertificates() {
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✓ SSL certificates already exist');
    return;
  }

  console.log('📝 Generating self-signed SSL certificates...');
  try {
    // Check if openssl is available
    execSync('which openssl', { stdio: 'ignore' });
    
    const certCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=IN/ST=State/L=City/O=Development/CN=localhost"`;
    execSync(certCommand, { stdio: 'inherit' });
    console.log('✓ SSL certificates generated successfully');
  } catch (error) {
    console.error('❌ Error generating certificates:', error.message);
    console.log('\n💡 Please install OpenSSL:');
    console.log('   - macOS: Already installed');
    console.log('   - Windows: Install from https://slproweb.com/products/Win32OpenSSL.html');
    console.log('   - Linux: sudo apt-get install openssl');
    process.exit(1);
  }
}

app.prepare().then(() => {
  // Generate certificates if needed
  generateCertificates();

  // Read certificates
  let key, cert;
  try {
    key = fs.readFileSync(keyPath);
    cert = fs.readFileSync(certPath);
  } catch (error) {
    console.error('❌ Error reading SSL certificates:', error.message);
    process.exit(1);
  }

  createServer({ key, cert }, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    
    const protocol = 'https';
    const localUrl = `${protocol}://${hostname}:${port}`;
    
    console.log('\n🚀 Ready!');
    console.log(`\n📍 Local:   ${localUrl}`);
    
    // Get network IP for mobile testing
    try {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            console.log(`📍 Network: ${protocol}://${iface.address}:${port}`);
            console.log(`\n📱 Use the Network URL on your mobile device`);
            console.log(`⚠️  You'll need to accept the security warning for self-signed certificate\n`);
            break;
          }
        }
      }
    } catch (error) {
      // Ignore if network IP cannot be determined
    }
  });
});

