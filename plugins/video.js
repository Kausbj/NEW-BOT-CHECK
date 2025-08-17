const { cmd } = require('../command');
const { ytmp4 } = require('ruhend-scraper');
const axios = require('axios');
const yts = require('yt-search');
const config = require('../config');

cmd({
    pattern: "video",
    alias: "vid",
    desc: "To download MP4 video or document from YouTube by searching for video names.",
    react: "🎥",
    category: "download",
    use: ".video <video name>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("*`Please provide a video name to search for.`*");

        reply("*Video found, uploading please wait...*");
        const search = await yts(q);
        if (!search.videos || search.videos.length === 0) {
            return reply("❌ No results found for \"" + q + "\".");
        }

        const data = search.videos[0];
        const url = data.url;

        // Message description
        const desc = 
`🎬 *KAVI-MD VIDEI DL* 🎬\n
🏮 *Title:* ${data.title}
⏳ *Duration:* ${data.timestamp}
👀 *Views:* ${data.views}
🌏 *Release Ago:* ${data.ago}
🔢 *_Reply with your choice:-_*\n
1 *Video Type* 🎬
2 *Document Type* 📁\n
${config.FOOTER}`;

        // Send menu
        const sentMsg = await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: desc,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363417070951702@newsletter',
                    newsletterName: "ᴠɪᴇᴡ ᴄʜᴀɴɴᴇʟ",
                    serverMessageId: 999
                }
            }
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        // Wait for reply (60 seconds)
        const listener = async (update) => {
            const msg = update.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReply && (text === '1' || text === '2')) {
                conn.ev.off('messages.upsert', listener); // remove listener after use
                await conn.sendMessage(from, { react: { text: '⬇️', key: msg.key } });

                // Download video
                const apiUrl = "https://api.giftedtech.web.id/api/download/dlmp4?apikey=gifted&url=" + encodeURIComponent(url);
                const response = await axios.get(apiUrl);

                if (!response.data.success) {
                    return reply("❌ Failed to fetch video for \"" + q + "\".");
                }

                const { download_url: downloadUrl } = response.data.result;

                if (text === '1') {
                    await conn.sendMessage(from, {
                        video: { url: downloadUrl },
                        mimetype: "video/mp4",
                        caption: data.title
                    }, { quoted: msg });
                } else {
                    await conn.sendMessage(from, {
                        document: { url: downloadUrl },
                        mimetype: "video/mp4",
                        fileName: `${data.title}.mp4`,
                        caption: `*${config.FOOTER}*`
                    }, { quoted: msg });
                }

                await conn.sendMessage(from, { react: { text: '⬆️', key: msg.key } });
            }
        };

        conn.ev.on('messages.upsert', listener);

        // Auto-remove listener after 60s
        setTimeout(() => conn.ev.off('messages.upsert', listener), 60000);

    } catch (e) {
        console.log(e);
        reply("❌ An error occurred while processing your request.");
    }
});
