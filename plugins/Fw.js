const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const os = require("os");

const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,
  EXTRA_DELAY: 4000,
};

cmd({
  pattern: "forward",
  alias: ["f", "fwd"],
  desc: "Bulk forward media to groups (newsletter style) - download & reupload as document (memory-safe, supports up to 2GB)",
  category: "owner",
  filename: __filename,
}, async (client, message, match, { isOwner }) => {
  try {
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    if (!message.quoted) return await message.reply("*🍁 Please reply to a media message*");

    // parse JIDs (bulletproof)
    let jidInput = "";
    if (typeof match === "string") jidInput = match.trim();
    else if (Array.isArray(match)) jidInput = match.join(" ").trim();
    else if (match && typeof match === "object") jidInput = match.text || "";

    const rawJids = jidInput.split(/[\s,]+/).filter(j => j.trim().length > 0);
    const validJids = rawJids
      .map(jid => {
        const clean = jid.replace(/@g\.us$/i, "");
        return /^\d+$/.test(clean) ? `${clean}@g.us` : null;
      })
      .filter(Boolean)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0) {
      return await message.reply(
        "❌ No valid group JIDs found\nExamples:\n.fwd 120363411055156472@g.us,120363333939099948@g.us\n.fwd 120363411055156472 120363333939099948"
      );
    }

    // ------ download quoted media to temp file using stream (memory-safe) ------
    const quoted = message.quoted;
    const mtype = quoted.mtype || (quoted.msg && Object.keys(quoted.msg)[0]);
    // Only proceed for media/document types
    if (!["imageMessage","videoMessage","audioMessage","stickerMessage","documentMessage"].includes(mtype)) {
      return await message.reply("❌ Reply to an image/video/audio/sticker/document to forward as a file.");
    }

    await message.reply("⬇️ Downloading media to temporary file (will re-upload as document) — this can take time for large files...");

    // ensure temp dir
    const tmpDir = path.join(os.tmpdir(), "kavi-md-forward");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // generate safe filename
    const origName = quoted.fileName || `media_${Date.now()}`;
    const ext = (quoted.mimetype && quoted.mimetype.split("/")[1]) || (mtype === "stickerMessage" ? "webp" : "");
    const tmpPath = path.join(tmpDir, `${Date.now()}_${origName}${ext ? "." + ext : ""}`);

    // download as stream
    const stream = await quoted.download(); // Baileys may return Buffer/stream depending on lib version
    // handle if buffer
    if (Buffer.isBuffer(stream)) {
      fs.writeFileSync(tmpPath, stream);
    } else if (stream && typeof stream.pipe === "function") {
      await new Promise((resolve, reject) => {
        const write = fs.createWriteStream(tmpPath);
        stream.pipe(write);
        write.on("finish", resolve);
        write.on("error", reject);
      });
    } else {
      // fallback: attempt to convert to Buffer then write
      const buf = await quoted.download();
      fs.writeFileSync(tmpPath, buf);
    }

    // check file size & info
    const stat = fs.statSync(tmpPath);
    const fileSizeBytes = stat.size;
    await message.reply(`✅ Downloaded — ${Math.round(fileSizeBytes / (1024*1024))} MB`);

    // If file exceeds 2GB, abort (WhatsApp limit). 2GB = 2 * 1024 * 1024 * 1024
    const MAX_WHATSAPP_BYTES = 2 * 1024 * 1024 * 1024;
    if (fileSizeBytes > MAX_WHATSAPP_BYTES) {
      // cleanup
      try { fs.unlinkSync(tmpPath); } catch {}
      return await message.reply("❌ File is larger than WhatsApp's maximum allowed document size (2 GB). Split/compress or use external host.");
    }

    // prepare messageContent as document stream (Baileys will chunk/upload)
    const messageContentBase = {
      document: fs.createReadStream(tmpPath),
      fileName: quoted.fileName || path.basename(tmpPath),
      mimetype: quoted.mimetype || "application/octet-stream",
      fileLength: fileSizeBytes
    };

    // optional quoted context (newsletter style)
    const newsletterInfo = {
      key: {
        remoteJid: "status@broadcast",
        participant: "0@s.whatsapp.net",
      },
      message: {
        newsletterAdminInviteMessage: {
          newsletterJid: "120363417070951702@newsletter",
          newsletterName: "MOVIE CIRCLE",
          caption: "𝙺𝙰𝚅𝙸 𝙼𝙳 𝙼𝙾𝚅𝙸𝙴 𝚅𝙴𝚁𝙸𝙵𝙸𝙴𝙳",
          inviteExpiration: 0,
        },
      },
    };

    // ---- forward loop: send document stream to each jid ----
    let successCount = 0;
    const failedJids = [];

    for (const [index, jid] of validJids.entries()) {
      try {
        // Create fresh read stream per send (streams are single-use)
        const docStream = fs.createReadStream(tmpPath);
        await client.sendMessage(
          jid,
          {
            document: docStream,
            fileName: messageContentBase.fileName,
            mimetype: messageContentBase.mimetype,
            fileLength: messageContentBase.fileLength,
            caption: message.quoted && (message.quoted.text || "") // keep caption if any
          },
          {
            quoted: newsletterInfo,
            // optional: timeout / additional send options depending on Baileys version
          }
        );

        successCount++;
        if ((index + 1) % 10 === 0) {
          await message.reply(`🔄 Sent to ${index + 1}/${validJids.length} groups...`);
        }

        const delayTime = (index + 1) % 10 === 0 ? SAFETY.EXTRA_DELAY : SAFETY.BASE_DELAY;
        await new Promise(r => setTimeout(r, delayTime));
      } catch (err) {
        failedJids.push(jid.replace("@g.us",""));
        console.error("Forward send error for", jid, err?.message || err);
        await new Promise(r => setTimeout(r, SAFETY.BASE_DELAY));
      }
    }

    // cleanup temp file
    try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }

    // report
    let report = `✅ *Forward Finished*\n\n🌴 Success: ${successCount}/${validJids.length}\n📦 Type: document\n🧾 Size: ${Math.round(fileSizeBytes / (1024*1024))} MB\n`;
    if (failedJids.length) {
      report += `\n❌ Failed (${failedJids.length}): ${failedJids.slice(0,5).join(", ")}`;
      if (failedJids.length > 5) report += ` +${failedJids.length - 5} more`;
    }
    if (rawJids.length > SAFETY.MAX_JIDS) {
      report += `\n⚠️ Note: Limited to first ${SAFETY.MAX_JIDS} JIDs`;
    }

    await message.reply(report);
  } catch (error) {
    console.error("Forward Error:", error);
    await message.reply(
      `💢 Error: ${String(error?.message || error).substring(0, 200)}\n\nPlease check:\n1. Bot permissions\n2. Quoted media exists\n3. File not > 2GB`
    );
  }
});
