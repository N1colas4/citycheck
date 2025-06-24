require("dotenv").config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000; // <- důležité pro Render

// Web server, aby Render neuspával aplikaci
app.get('/', (req, res) => {
  res.send('Bot je aktivní ✅');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server běží na portu ${PORT}`);
});

// Discord část
const {
  Client,
  GatewayIntentBits,
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Přihlášen jako ${client.user.tag}`);
});

async function createCityEmbed(guild) {
  const roleOn = guild.roles.cache.get(process.env.ROLE_CITY_ON);
  const roleOff = guild.roles.cache.get(process.env.ROLE_CITY_OFF);

  const allMembers = await guild.members.fetch();
  const countOn = allMembers.filter(m => m.roles.cache.has(roleOn.id)).size;
  const countOff = allMembers.filter(m => m.roles.cache.has(roleOff.id)).size;
  const countNeither = allMembers.filter(
    m => !m.roles.cache.has(roleOn.id) && !m.roles.cache.has(roleOff.id)
  ).size;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("City Check")
    .setDescription(
      "Jsi ve městě? Checkni se pomocí tlačítka.\n\n" +
      `**CITY ON**: ${countOn} členů\n` +
      `**CITY OFF**: ${countOff} členů\n` +
      `**?**: ${countNeither} členů`
    );

  return embed;
}

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.content === "!city") {
    const guild = message.guild;

    const roleOn = guild.roles.cache.get(process.env.ROLE_CITY_ON);
    const roleOff = guild.roles.cache.get(process.env.ROLE_CITY_OFF);

    if (!roleOn || !roleOff) {
      return message.reply("❌ Role nebyly nalezeny. Zkontroluj .env.");
    }

    const embed = await createCityEmbed(guild);

    const buttonOn = new ButtonBuilder()
      .setCustomId("city_on")
      .setLabel("City ON")
      .setStyle(ButtonStyle.Danger);

    const buttonOff = new ButtonBuilder()
      .setCustomId("city_off")
      .setLabel("City OFF")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(buttonOn, buttonOff);

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const roleOn = interaction.guild.roles.cache.get(process.env.ROLE_CITY_ON);
  const roleOff = interaction.guild.roles.cache.get(process.env.ROLE_CITY_OFF);

  if (!roleOn || !roleOff) {
    return interaction.reply({
      content: "❌ Role nebyly nalezeny. Zkontroluj nastavení.",
      ephemeral: true
    });
  }

  if (interaction.customId === "city_on") {
    await member.roles.add(roleOn).catch(console.error);
    await member.roles.remove(roleOff).catch(console.error);
  }

  if (interaction.customId === "city_off") {
    await member.roles.add(roleOff).catch(console.error);
    await member.roles.remove(roleOn).catch(console.error);
  }

  const updatedEmbed = await createCityEmbed(interaction.guild);

  const buttonOn = new ButtonBuilder()
    .setCustomId("city_on")
    .setLabel("City ON")
    .setStyle(ButtonStyle.Danger);

  const buttonOff = new ButtonBuilder()
    .setCustomId("city_off")
    .setLabel("City OFF")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(buttonOn, buttonOff);

  await interaction.update({
    embeds: [updatedEmbed],
    components: [row]
  });
});

client.login(process.env.TOKEN);
