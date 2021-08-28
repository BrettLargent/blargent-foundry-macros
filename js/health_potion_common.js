main();

async function main() {
  const controlled = canvas.tokens.controlled;
  if (controlled.length !== 1) {
    ui.notifications.error("Please select a single token");
    return;
  }
  const actor = controlled[0].actor;
  const commonPotion = actor.items.find(
    (item) =>
      item.data.name == "Potion of Healing" &&
      item.data.data.rarity === "common"
  );

  if (!commonPotion || !commonPotion.data.data.quantity) {
    ui.notifications.error("No common potions of healing left");
    return;
  }

  const actorHp = actor.data.data.attributes.hp;
  if (actorHp.value === actorHp.max) {
    ui.notifications.error("Already at max health");
    return;
  }

  const missingHp = actorHp.max - actorHp.value;
  const roll = new Roll(commonPotion.data.data.damage.parts[0][0]).evaluate();
  const restoredHp = Math.min(missingHp, roll.total);
  const newHpValue = actorHp.value + restoredHp;

  actor.update({ "data.attributes.hp.value": newHpValue });
  commonPotion.update({ "data.quantity": commonPotion.data.data.quantity - 1 });
  roll.toMessage({
    speaker: {
      alias: actor.data.name,
    },
    flavor: "<h2>Potion of Healing</h2>",
  });
  ui.notifications.info(`${actor.data.name} healed for ${restoredHp} points`);
}
