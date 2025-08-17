const config = require('../config');
const { cmd, commands } = require('../command');
const os = require("os");
const fs = require('fs');
const { runtime } = require('../lib/functions');
const EnvVar = require('../lib/mongodbenv');

const botname = "𝙺𝙰𝚅𝙸 𝙼𝙳";
const ownername = "𝙺𝙰𝚅𝙸𝙳𝚄 𝚁𝙰𝚂𝙰𝙽𝙶𝙰";

const Supunwa = {
    key: {
        remoteJid: 'status@broadcast',
        participant: '0@s.whatsapp.net'
    },
    message: {
        newsletterAdminInviteMessage: {
            newsletterJid: '120363417070951702',
            newsletterName: "MOVIE CIRCLE",
            caption: botname + ` 𝚅𝙴𝚁𝙸𝙵𝙸𝙴𝙳 𝙱𝚈 ` + ownername,
            inviteExpiration: 0
        }
    }
};

cmd({
    pattern: "system",
    alias: ["status", "s"],
    desc: "Check uptime, RAM usage, and more",
    category: "main",
    filename: __filename
},
async (conn, mek, m, {
    from, reply
}) => {
    try {
        let status = `~🔰 *SYSTEM INFO*🔰~
        
*📅 TODAY :-*  ${new Date().toLocaleDateString("en-GB", {
      timeZone: "Asia/Colombo",
    })}
*⏰ TIME :-* ${new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Colombo",
    })}

*📈 UPTIME :-*  ${runtime(process.uptime())}
*📊 RAM USEAGE :-* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)}MB
*📜 PREFIX :-* ${config.PREFIX}
*🚀 HOST NAME :-* ${os.hostname()}
*👨‍💻 OWNER NAME :-* ${config.OWNER_NAME}

${config.FOOTER}`;

        await conn.sendMessage(from, {
    image: `${config.ALIVE_IMG}`,
    caption: status
}, { quoted: Supunwa });

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});
