const config = require('../config');
const { cmd, commands } = require('../command');
const os = require("os");
const { runtime } = require('../lib/functions');

// Categories with names, icons, and display numbers
const menuCategories = [
    { key: 'download', icon: '📥', title: 'Download Menu' },
    { key: 'group', icon: '👥', title: 'Group Menu' },
    { key: 'fun', icon: '😄', title: 'Fun Menu' },
    { key: 'owner', icon: '👑', title: 'Owner Menu' },
    { key: 'ai', icon: '🤖', title: 'AI Menu' },
    { key: 'anime', icon: '🎎', title: 'Anime Menu' },
    { key: 'convert', icon: '🔄', title: 'Convert Menu' },
    { key: 'other', icon: '📌', title: 'Other Menu' },
    { key: 'reactions', icon: '💞', title: 'Reactions Menu' },
    { key: 'main', icon: '🏠', title: 'Main Menu' }
];

// Helper to get commands by category
function getCommandsByCategory(cat) {
    return commands
        .filter(c => c.category === cat && !c.dontAddCommandList)
        .map(c => `*◉ :* ${c.pattern}`)
        .join("\n") || "_No commands available_";
}

cmd({
    pattern: "menu",
    desc: "Show interactive menu system",
    category: "menu",
    react: "🏛️",
    filename: __filename
}, async (conn, mek, m, { from, pushname }) => {
    try {
        // Main Menu Caption
        let menuCaption = `👋 Hellow ${pushname}
╭━❲ 🌴𝘛𝘖𝘋𝘈𝘠 🌴 ❳━━┄►
┃ 📅 Date Today : *${new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Colombo" })}*
┃ 🕜 Time Now : *${new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo" })}*
╰━━━━━━━━━━━┄►
╭━━━〔 *🏛️ 𝘒𝘈𝘝𝘐 -𝘔𝘋 🏛️* 〕━━━╼◈
> 🤤 Owner : *${config.OWNER_NAME}*
> ☘️ Mode : *❲ ${config.MODE} ❳*
> 🫟 Prefix : *❲ ${config.PREFIX} ❳*
> ♻️ Version : *0.0.1 Beta*
> 👾 Commands : *${commands.length}*
╰━━━━━━━━━━━━━━━╼◈
_*ᴛʜɪꜱ ᴋᴀᴠɪ ᴍᴅ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ɪꜱ ᴍᴀᴅᴇ ꜰᴏʀ ʏᴏᴜʀ ᴇᴀꜱʏ ᴛᴏ ᴜꜱᴇ. ᴛʜɪꜱ ʙᴏᴛ ɪꜱ ᴄᴜʀʀᴇɴᴛʟʏ ᴀᴄᴛɪᴠᴇ 🍇*_
  
╭━━〔 *🌴 Menu List 🌴* 〕━━┈⊷`;

        menuCategories.forEach((cat, index) => {
            menuCaption += `\n│ *➤ ${index + 1} ${cat.title}*`;
        });

        menuCaption += `\n╰──────────────┈⊷\n*_🔢 Reply with a number (1-${menuCategories.length}) to see commands_*\n\n*☘️ ꜰᴏʟʟᴏᴡ ᴍʏ ᴄʜᴀɴɴᴇʟ :* https://whatsapp.com/channel/0029Vb5xFPHGE56jTnm4ZD2k/246\n\n*⎠👨‍💻 ᴋᴀᴠɪ ᴍᴅ ʙʏ ᴋᴀᴠɪᴅᴜ ʀᴀꜱᴀɴɢᴀ 👨‍💻⎝*`;

        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        };

        // Send Menu Image
        const sentMsg = await conn.sendMessage(
            from,
            {
                image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/p8knwg.jpg' },
                caption: menuCaption,
                contextInfo
            },
            { quoted: mek }
        );

        const messageID = sentMsg.key.id;

        // Build dynamic menu data
        const menuData = {};
        menuCategories.forEach((cat, idx) => {
            menuData[(idx + 1).toString()] = {
                title: `${cat.icon} *${cat.title}* ${cat.icon}`,
                content: `╭━━━〔 *🪺 ${cat.title} 🪺* 〕━━━┈⊷\n${getCommandsByCategory(cat.key)}\n╰━━━━━━━━━━━━━━━┈⊷\n\n> ${config.FOOTER}`,
                image: true
            };
        });

        // Listen for replies
        const handler = async (msgData) => {
            try {
                const receivedMsg = msgData.messages[0];
                if (!receivedMsg?.message) return;

                const isReplyToMenu = receivedMsg.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;
                if (isReplyToMenu) {
                    const replyText = receivedMsg.message.conversation || receivedMsg.message.extendedTextMessage?.text;
                    const selectedMenu = menuData[replyText];
                    const senderID = receivedMsg.key.remoteJid;

                    if (selectedMenu) {
                        // Newsletter style info
                        const newsletterInfo = {
                            key: {
                                remoteJid: 'status@broadcast',
                                participant: '0@s.whatsapp.net'
                            },
                            message: {
                                newsletterAdminInviteMessage: {
                                    newsletterJid: '120363417070951702@newsletter',
                                    newsletterName: "KAVIDU RASANGA ツ",
                                    caption: "𝙺𝙰𝚅𝙸-𝙼𝙳 𝚅𝙴𝚁𝙸𝙵𝙸𝙴𝙳 𝙱𝚈 𝙺𝙰𝚅𝙸𝙳𝚄 𝚁𝙰𝚂𝙰𝙽𝙶𝙰",
                                    inviteExpiration: 0
                                }
                            }
                        };

                        // Send menu reply with newsletter style
                        await conn.sendMessage(senderID, {
                            image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/p8knwg.jpg' },
                            caption: selectedMenu.content,
                            contextInfo: {
                                isForwarded: true,
                                forwardingScore: 999,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363417070951702@newsletter',
                                    newsletterName: 'KAVIDU RASANGA ツ',
                                    serverMessageId: 143
                                }
                            }
                        }, { quoted: newsletterInfo });

                        await conn.sendMessage(senderID, { react: { text: '✅', key: receivedMsg.key } });
                    } else {
                        await conn.sendMessage(senderID, {
                            text: `❌ Invalid Option!\nReply with a number between 1-${menuCategories.length}.\n\n◆ᴋᴀᴠɪ ᴍᴅ◆`,
                            contextInfo
                        }, { quoted: receivedMsg });
                    }
                }
            } catch (e) {
                console.error('Reply Handler Error:', e);
            }
        };

        conn.ev.on("messages.upsert", handler);
        setTimeout(() => conn.ev.off("messages.upsert", handler), 300000);

    } catch (e) {
        console.error('Menu Error:', e);
    }
});