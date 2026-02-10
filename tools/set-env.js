const fs = require('fs');
const path = require('path');

// Load .env file for local development
// We try to require 'dotenv' if available, otherwise we rely on process.env
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not found, assuming variables are already in process.env (Vercel)
}

const targetPath = path.join(__dirname, '../client/src/environments/environment.ts');
const targetPathDev = path.join(__dirname, '../client/src/environments/environment.development.ts');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Validation
if (!supabaseUrl || !supabaseKey) {
    console.warn('WARNING: SUPABASE_URL or SUPABASE_KEY not found in environment variables.');
    console.warn('Ensure you have a .env file locally or Environment Variables set in Vercel.');
}

const envConfigFile = `export const environment = {
  production: true,
  debug: false,
  supabase: {
    url: '${supabaseUrl}',
    key: '${supabaseKey}',
    anonKey: '${supabaseKey}' // Fallback/Legacy support if needed
  }
};
`;

const envConfigDevFile = `export const environment = {
  production: false,
  debug: true,
  supabase: {
    url: '${supabaseUrl}',
    key: '${supabaseKey}',
    anonKey: '${supabaseKey}' // Fallback/Legacy support if needed
  }
};
`;

// Write file
fs.writeFile(targetPath, envConfigFile, (err) => {
    if (err) {
        console.error(err);
        throw err;
    }
    console.log(`Environment file generated at ${targetPath}`);
});

fs.writeFile(targetPathDev, envConfigDevFile, (err) => {
    if (err) {
        console.error(err);
        throw err;
    }
    console.log(`Environment file generated at ${targetPathDev}`);
});
