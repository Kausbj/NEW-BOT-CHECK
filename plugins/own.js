
const { cmd } = require('../command');
const config = require('../config'); // Make sure FOOTER exists here or set manually

cmd({
    pattern: "owner",
    react: "👨‍💻",
    alias: ["own", "Kavidu"],
    desc: "Get owner number",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from }) => {
    try {
        const ownerNumber = '+94727487353';
        const ownerName = '𝐌𝐑 𝐊𝐀𝐕𝐈𝐃𝐔 🍂';
        const organization = 'MASTER';

        // ✅ Send vCard Contact
        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      `FN:${ownerName}\n` +
                      `ORG:${organization}\n` +
                      `TEL;type=CELL;type=VOICE;waid=${ownerNumber.replace('+', '')}:${ownerNumber}\n` +
                      'END:VCARD';

        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        });

        // ✅ Owner Info with Buttons
        const infoText = `*🔰 OWNER INFOMATION 🔰*\n` +
                         `━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `*_🍃 NAME      :-_* *KAVIDU RASANGA*\n` +
                         `*_🌎 LIVE         :-_* *ANURADHAPURA / SL*\n` +
                         `*_🌪️ AGE         :-_* *19*\n` +
                         `*_🎭 GENDER  :-_* *MALE*\n` +
                         `*_🌩️ CONTACT   :-_* \`\`\`${ownerNumber.replace('+', '')}\`\`\`\n\n` +
                         `${config.FOOTER || ''}`;

        await conn.sendMessage(from, {
            text: infoText,
            footer: '📞 Choose an option below:',
            buttons: [
                {
                    buttonId: 'callowner',
                    buttonText: { displayText: '📞 CALL OWNER' },
                    type: 1
                },
                {
                    buttonId: 'menu',
                    buttonText: { displayText: '📋 BOT MENU' },
                    type: 1
                }
            ],
            headerType: 1,
            contextInfo: {
                mentionedJid: [`${ownerNumber.replace('+', '')}@s.whatsapp.net`]
            }
        }, { quoted: mek });

    } catch (err) {
        console.error('Error in owner command:', err);
        await conn.sendMessage(from, { text: '❌ Error sending owner information.' }, { quoted: mek });
    }
});
