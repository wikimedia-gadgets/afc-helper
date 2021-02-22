// Generates certificates in ./certificates/ for `npm start` to use.

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const is_windows = process.platform === 'win32';
const possible_winpty = is_windows ? 'winpty ' : '';

const CERTS_PATH = 'certificates';

if (!fs.existsSync(CERTS_PATH)){
	fs.mkdirSync(CERTS_PATH);
}

// Procedure and comments from https://stackoverflow.com/a/60516812

// Become a Certificate Authority

// Generate private key
console.log('You will be asked for a passphrase. You will not have to use it after this script is done. It must be 4 or more characters long. You will have to enter it four times in total.');
const ca_key = path.join(CERTS_PATH, 'myCA.key');
child_process.execSync(`${possible_winpty}openssl genrsa -des3 -out ${ca_key} 2048`, { 'encoding': 'utf-8', 'stdio': 'inherit' });

// Generate root certificate
const ca_cert = path.join(CERTS_PATH, 'myCA.pem');
const subj = "//C=GB/C=GB/ST=Some-State/L=Test/O=Test/CN=localhost";
child_process.execSync(`${possible_winpty}openssl req -x509 -new -nodes -key ${ca_key} -sha256 -days 825 -out ${ca_cert} -subj '${subj}'`, {
	"encoding": "utf-8",
	"stdio": "inherit"
});

// Create CA-signed Certs

const DOMAIN = 'localhost';

// Generate a private key
const cert_key = path.join(CERTS_PATH, DOMAIN + '.key');
child_process.execSync(`openssl genrsa -out ${cert_key} 2048`, { "encoding": "utf-8" });

// Create a certificate-signing request
const cert_sign_req = path.join(CERTS_PATH, DOMAIN + '.csr');
child_process.execSync(`${possible_winpty}openssl req -new -key ${cert_key} -out ${cert_sign_req} -subj '${subj}'`, {
	"encoding": "utf-8",
	'stdio': 'inherit'
});

// Create a config file for the extensions
const cert_ext = path.join(CERTS_PATH, DOMAIN + '.ext');
fs.writeFileSync(cert_ext, `authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${DOMAIN}`);

// Create the signed certificate
const cert = path.join(CERTS_PATH, DOMAIN + '.crt');
child_process.execSync(`${possible_winpty}openssl x509 -req -in ${cert_sign_req} -CA ${ca_cert} -CAkey ${ca_key} -CAcreateserial -out ${cert} -days 825 -sha256 -extfile ${cert_ext}`, { encoding: "utf-8", stdio: 'inherit' });

console.log(`

Root CA certificate written to ${cert}. Please install the CA certificate, ${ca_cert}, as a trusted root certificate in your browser.
* For Chrome, you can try menu > Preferences > Privacy and security (tab on left) > Security > scroll > Manage certificates > Trusted Root Certification Authorities > Import..., and then select the file at ${ca_cert}, then confirm.
* For Firefox, you can try menu > Preferences > Privacy & Security > scroll all the way down > Security > Certificates > View Certificates... > Authorities (rightmost tab) > Import... , and then select the file at ${ca_cert}, then confirm.
* You may have to search the Internet for the instructions for your browser version.

The command "npm start" (no quotes) should work after that.`);
