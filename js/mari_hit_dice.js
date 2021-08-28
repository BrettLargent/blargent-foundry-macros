main();

async function main() {
  const Mari = game.actors.get("Ypk5A3YXKaoxAiR6");
  const MariHp = Mari.data.data.attributes.hp;
  const fighterClass = Mari.data.data.classes.fighter;

  if (fighterClass.hitDiceUsed === fighterClass.levels) {
    ui.notifications.error("No hit dice left");
    return;
  }

  if (MariHp.value === MariHp.max) {
    ui.notifications.error("Already at max health");
    return;
  }
  const MariConMod = Mari.data.data.abilities.con.mod;
  const missingHp = MariHp.max - MariHp.value;
  const rolledHp = new Roll(
    `{1${fighterClass.hitDice}, ${MariConMod}}kh + ${MariConMod}`
  ).evaluate().total;
  const restoredHp = Math.min(missingHp, rolledHp);
  const newHpValue = MariHp.value + restoredHp;

  Mari.update({ "data.attributes.hp.value": newHpValue });
  //   Mari.update({
  //     "data.classes.fighter.hitDiceUsed": fighterClass.hitDiceUsed + 1,
  //   });
  ui.notifications.info(`Mari healed for ${restoredHp} points`);
}
