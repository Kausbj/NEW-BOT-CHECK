// movie.js
const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');

const API_KEY = "FreeMovie";
const BASE_URL = "https://anju-md-api.vercel.app/api/hdhub";

// ========== SEARCH MOVIE ==========
cmd({
    pattern: "movie",
    desc: "Search movies and download",
    category: "movie",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { args, reply }) => {
    if (!args[0]) return reply("*Usage:* .movie <movie name>");

    try {
        let query = args.join(" ");
        let searchUrl = `${BASE_URL}?q=${encodeURIComponent(query)}&apikey=${API_KEY}`;
        let { data } = await axios.get(searchUrl);

        if (!data.result || data.result.length === 0) {
            return reply("❌ No results found!");
        }

        let txt = `*🎬 Search Results for:* ${query}\n\n`;
        data.result.slice(0, 5).forEach((movie, i) => {
            txt += `*${i + 1}. ${movie.title}*\n🔗 Use: *.minfo ${movie.url}*\n\n`;
        });

        reply(txt);

    } catch (e) {
        console.log(e);
        reply("⚠️ Error while searching movies!");
    }
});

// ========== MOVIE INFO ==========
cmd({
    pattern: "minfo",
    desc: "Get movie info + download",
    category: "movie",
    react: "ℹ️",
    filename: __filename
},
async (conn, mek, m, { args, reply }) => {
    if (!args[0]) return reply("*Usage:* .minfo <movie_url>");

    try {
        let url = args[0];
        let infoUrl = `${BASE_URL}?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
        let { data } = await axios.get(infoUrl);

        if (!data.result) return reply("❌ No info found!");

        let movie = data.result;
        let txt = `*🎬 ${movie.title}*\n\n`;
        txt += `📅 Year: ${movie.year}\n`;
        txt += `🌐 Language: ${movie.language}\n`;
        txt += `📦 Quality: ${movie.quality}\n\n`;
        txt += `➡️ Choose quality with:\n*.mdll <dlLink>*`;

        await conn.sendMessage(m.chat, {
            image: { url: movie.image },
            caption: txt
        }, { quoted: mek });

        if (movie.dlLink) {
            await conn.sendMessage(m.chat, { text: `🔗 Download Link:\n*.mdll ${movie.dlLink}*` }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply("⚠️ Error while fetching movie info!");
    }
});

// ========== DOWNLOAD MOVIE ==========
cmd({
    pattern: "mdll",
    desc: "Download movie file",
    category: "movie",
    react: "⬇️",
    filename: __filename
},
async (conn, mek, m, { args, reply }) => {
    if (!args[0]) return reply("*Usage:* .mdll <dlLink>");

    try {
        let dlLink = args[0];
        let dllUrl = `${BASE_URL}?dlLink=${encodeURIComponent(dlLink)}&apikey=${API_KEY}`;
        let { data } = await axios.get(dllUrl);

        if (!data.result || data.result.length === 0) {
            return reply("❌ No download links found!");
        }

        // Pick the first available link
        let file = data.result[0];
        let fileUrl = file.url;
        let quality = file.quality || "Movie";

        reply(`📥 *Downloading...*\n\n🎬 *Quality:* ${quality}`);

        await conn.sendMessage(m.chat, {
            document: { url: fileUrl },
            mimetype: "video/mp4",
            fileName: `${quality}.mp4`,
            caption: `🎬 *Movie Downloaded Successfully*\nQuality: ${quality}`
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("⚠️ Error while downloading movie!");
    }
});
