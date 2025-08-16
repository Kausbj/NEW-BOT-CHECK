const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "PBdlSIpJ#H8-_lM_4Lg0wXxl_tLopuV7xBHkAiOr-K4telFJsJWo",

MONGODB: process.env.MONGODB || "mongodb://mongo:TdlccGBRitoynUsOmnyGJwfFwCVhdBbd@nozomi.proxy.rlwy.net:35163",
};

