const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "XMVD2LZI#Vr9gFXF92uS5I3KQhxiUV0zPJNIEDi1jdJ6B91jfWMU",

MONGODB: process.env.MONGODB || "mongodb://mongo:TdlccGBRitoynUsOmnyGJwfFwCVhdBbd@nozomi.proxy.rlwy.net:35163",
};

