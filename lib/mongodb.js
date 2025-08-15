const mongoose = require('mongoose');
const config = require('../config');
const EnvVar = require('./mongodbenv');

const defaultEnvVariables = [
    { key: 'ALIVE_IMG', value: 'https://files.catbox.moe/sq9tvu.jpg' },
    { key: 'MENU_IMG', value: 'https://files.catbox.moe/sq9tvu.jpg' },
    { key: 'PREFIX', value: '.' },
    { key: 'MODE', value: 'private' },
    { key: 'AUTO_STATUS_SEEN', value: 'true' },
    { key: 'AUTO_STATUS_REPLY', value: 'false' },
    { key: 'AUTO_STATUS_MSG', value: '*_your status auto seen by KAVI-MD 🏮_*' },
    { key: 'AUTO_STATUS_REACT', value: 'true' },
    { key: 'AUTO_STICKER', value: 'false' }, 
    { key: 'ANTI_DEL_PATH', value: 'inbox' },
    { key: 'WELCOME', value: 'true' },
    { key: 'ADMIN_EVENTS', value: 'false' },
    { key: 'MENTION_REPLY', value: 'false' },
    { key: 'STICKER_NAME', value: 'KAVI MD STICKER ☻' },
    { key: 'CUSTOM_REACT', value: 'false' },
    { key: 'CUSTOM_REACT_EMOJIS', value: '💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍' },
    { key: 'DELETE_LINKS', value: 'false' },
    { key: 'DESCRIPTION', value: '*⎠👨‍💻 ᴋᴀᴠɪ ᴍᴅ ʙʏ ᴋᴀᴠɪᴅᴜ ʀᴀꜱᴀɴɢᴀ 👨‍💻⎝*' },
    { key: 'PUBLIC_MODE', value: 'true' }, 
    { key: 'LANGUAGE', value: 'sinhala' },
    { key: 'AUTO_REACT', value: 'false' }, 
    { key: 'AUTO_RECORDING', value: 'false' },
    { key: 'AUTO_TYPING', value: 'false' },
    { key: 'ANTI_LINK', value: 'false' },
    { key: 'AUTO_VOICE', value: 'false' },
    { key: 'AUTO_REPLY', value: 'false' },
    { key: 'ANTI_BAD', value: 'false' },
    { key: 'READ_MESSAGE', value: 'false' },
    { key: 'READ_CMD', value: 'false' }, 
    { key: 'ALWAYS_ONLINE', value: 'true' },
    { key: 'ANTI_VV', value: 'true' }, 
    { key: 'ANTI_DELETE', value: 'true' },
    { key: 'DELETEMSGSENDTO', value: 'none' },
    { key: 'INBOX_BLOCK', value: 'false' },
    { key: 'ANTI_BOT', value: 'false' },
    { key: 'AUTO_TIKTOK', value: 'false' },
    { key: 'AUTO_NEWS_ENABLED', value: 'false' },
    { key: 'SEND_START_NEWS', value: 'false' },
    { key: 'MOVIE_FOOTER', value: '> *ᴋᴀᴠɪ ᴍᴏᴠɪᴇꜱ 🍃*' },
    { key: 'DEV', value: '94774391560' },
    { key: 'AUTO_REACT', value: 'false' },  
    { key: 'OWNER_REACT', value: 'true' },
    { key: 'FOOTER', value: '> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴋᴀᴠɪᴅᴜ ʀᴀꜱᴀɴɢᴀ 👨‍💻*' },
    { key: 'ALIVE_MSG', value: 'ᴀʟɪᴠᴇ ɴᴏᴡ. . .' },
    { key: 'OWNER_NAME', value: 'Kavidu rasanga' },
    { key: 'OWNER_EMOJI', value: '☣️' },
    { key: 'HEART_REACT', value: 'false' },
    { key: 'OWNER_NUMBER', value: '94774391560' }
];

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB);
        console.log('〽️ MongoDB Connected ✅');

        // Create default values if missing
        for (const envVar of defaultEnvVariables) {
            const existingVar = await EnvVar.findOne({ key: envVar.key });
            if (!existingVar) {
                await EnvVar.create(envVar);
                console.log(`➕ Created default env var: ${envVar.key}`);
            }
        }

        // Override config.js values from database
        const allVars = await EnvVar.find({});
        allVars.forEach(env => {
            config[env.key] = env.value;
        });

        console.log('🔄 Config synced from database ✅');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;