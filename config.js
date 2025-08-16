const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "KQ0zlDjK#uVQ9SywHOTCA7Ux0HclbwHlziND0Yi90LeoeG2RvtyU",

MONGODB: process.env.MONGODB || "mongodb://mongo:TdlccGBRitoynUsOmnyGJwfFwCVhdBbd@nozomi.proxy.rlwy.net:35163",
};

