

const { cmd } = require("../command");

// Safety Configuration
const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,  
  EXTRA_DELAY: 4000,  
};

cmd({
  pattern: "forward",
  alias: ["f"],
  desc: "Bulk forward media to groups (newsletter style)",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner }) => {
  try {
    // Owner check
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    
    // Quoted message check
    if (!message.quoted) return await message.reply("*🍁 Please reply to a message*");

    // ===== [BULLETPROOF JID PROCESSING] ===== //
    let jidInput = "";
    if (typeof match === "string") {
      jidInput = match.trim();
    } else if (Array.isArray(match)) {
      jidInput = match.join(" ").trim();
    } else if (match && typeof match === "object") {
      jidInput = match.text || "";
    }
    
    const rawJids = jidInput.split(/[\s,]+/).filter(jid => jid.trim().length > 0);

    const validJids = rawJids
      .map(jid => {
        const cleanJid = jid.replace(/@g\.us$/i, "");
        return /^\d+$/.test(cleanJid) ? `${cleanJid}@g.us` : null;
      })
      .filter(jid => jid !== null)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0) {
      return await message.reply(
        "❌ No valid group JIDs found\n" +
        "Examples:\n" +
        ".fwd 120363411055156472@g.us,120363333939099948@g.us\n" +
        ".fwd 120363411055156472 120363333939099948"
      );
    }

    // ===== [MEDIA / TEXT HANDLING] ===== //
    let messageContent = {};
    const mtype = message.quoted.mtype;

    if (["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(mtype)) {
      const buffer = await message.quoted.download();
      switch (mtype) {
        case "imageMessage":
          messageContent = {
            image: buffer,
            caption: message.quoted.text || '',
            mimetype: message.quoted.mimetype || "image/jpeg"
          };
          break;
        case "videoMessage":
          messageContent = {
            video: buffer,
            caption: message.quoted.text || '',
            mimetype: message.quoted.mimetype || "video/mp4"
          };
          break;
        case "audioMessage":
          messageContent = {
            audio: buffer,
            mimetype: message.quoted.mimetype || "audio/mp4",
            ptt: message.quoted.ptt || false
          };
          break;
        case "stickerMessage":
          messageContent = {
            sticker: buffer,
            mimetype: message.quoted.mimetype || "image/webp"
          };
          break;
        case "documentMessage":
          messageContent = {
            document: buffer,
            mimetype: message.quoted.mimetype || "application/octet-stream",
            fileName: message.quoted.fileName || "document"
          };
          break;
      }
    } else if (mtype === "extendedTextMessage" || mtype === "conversation") {
      messageContent = { text: message.quoted.text };
    } else {
      try {
        messageContent = message.quoted;
      } catch {
        return await message.reply("❌ Unsupported message type");
      }
    }

    // ===== [NEWSLETTER STYLE CONTEXT] ===== //
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

    // ===== [FORWARD LOOP] ===== //
    let successCount = 0;
    const failedJids = [];

    for (const [index, jid] of validJids.entries()) {
      try {
        await client.sendMessage(
          jid,
          {
            ...messageContent,
            contextInfo: {
              isForwarded: true,
              forwardingScore: 999,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363417070951702@newsletter",
                newsletterName: "KAVIDU RASANGA 💀",
                serverMessageId: 143,
              },
            },
          },
          { quoted: newsletterInfo }
        );
        successCount++;

        if ((index + 1) % 10 === 0) {
          await message.reply(`🔄 Sent to ${index + 1}/${validJids.length} groups...`);
        }

        const delayTime = (index + 1) % 10 === 0 ? SAFETY.EXTRA_DELAY : SAFETY.BASE_DELAY;
        await new Promise(resolve => setTimeout(resolve, delayTime));
      } catch (error) {
        failedJids.push(jid.replace("@g.us", ""));
        await new Promise(resolve => setTimeout(resolve, SAFETY.BASE_DELAY));
      }
    }

    // ===== [REPORT] ===== //
    let report = `✅ *Forward Successful*\n\n` +
                 `🌴 Success: ${successCount}/${validJids.length}\n` +
                 `📦 Content Type: ${mtype.replace("Message", "") || "text"}\n`;

    if (failedJids.length > 0) {
      report += `\n❌ Failed (${failedJids.length}): ${failedJids.slice(0, 5).join(", ")}`;
      if (failedJids.length > 5) report += ` +${failedJids.length - 5} more`;
    }

    if (rawJids.length > SAFETY.MAX_JIDS) {
      report += `\n⚠️ Note: Limited to first ${SAFETY.MAX_JIDS} JIDs`;
    }

    await message.reply(report);

  } catch (error) {
    console.error("Forward Error:", error);
    await message.reply(
      `💢 Error: ${error.message.substring(0, 100)}\n\n` +
      `Please try again or check:\n` +
      `1. JID formatting\n` +
      `2. Media type support\n` +
      `3. Bot permissions`
    );
  }
});
