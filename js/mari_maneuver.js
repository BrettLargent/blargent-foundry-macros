const MariId = "Ypk5A3YXKaoxAiR6";
const supDiceFeatureId = "dbPZQ15wSC3HyisL";

main();

function main() {
  const Mari = game.actors.get(MariId);
  const supDiceFeature = Mari.items.get(supDiceFeatureId);
  const supDiceFeatureUses = supDiceFeature.data.data.uses;
  const supDiceResource = Mari.data.data.resources.primary;

  if (!supDiceFeatureUses.value || !supDiceResource.value) {
    ui.notifications.error("No superiority dice left");
    return;
  }

  supDiceFeature.update({
    "data.uses.value": supDiceFeatureUses.value - 1,
  });
  Mari.update({
    "data.resources.primary.value": supDiceResource.value - 1,
  });

  const roll = new Roll(supDiceFeature.data.data.damage.parts[0][0]).roll();
  roll.toMessage({
    speaker: {
      alias: Mari.data.name,
    },
    flavor: "<h2>Battle Master Maneuver</h2>",
  });
}
