const diceRegex = /[1-9][0-9]*d[1-9][0-9]?/g;
const MariId = "Ypk5A3YXKaoxAiR6";
const ShipWreckerId = "BoAh5N42SPEmVMe3";

main();

/*
 TODO:
 * Improve crit styling and add good/bad styling for damage results
 * Figure out how to not close dialog on button click
 * Detect if weapon is ranged and decrement ammunition
 * Add way to control roll visibility
    - see https://foundryvtt.com/api/data.ChatMessageData.html for info on whisper/blind properties
*/
function main() {
  const Mari = game.actors.get(MariId);
  const MariProf = Mari.data.data.attributes.prof;

  const MariItems = Array.from(Mari.items.values());
  const weapons = MariItems.filter(
    (item) => item.data.type === "weapon" && item.data.data.equipped
  );
  let weaponOptions = "";
  for (const weapon of weapons) {
    weaponOptions += `<option value=${weapon.id}>${weapon.data.name}</option>`;
  }

  const attackDialogTemplate = `
    <h1>Select Attack</h1>
    <div class="attack-dialog-grid">
      <div class="attack-dialog-row weapon-options-row">
        <label for="mari-atk-weapon">Weapon:</label>
        <select id="mari-atk-weapon">${weaponOptions}</select>
      </div>
    </div>`;

  const d20Map = { adv: "2d20kh", normal: "1d20", dis: "2d20kl" };

  let generateAttack;
  const rollAttackAndDamage = async (type, html) => {
    const weaponId = html.find("#mari-atk-weapon")[0].value;
    const weapon = Mari.items.get(weaponId);
    const weaponAttackBonus = weapon.data.data.attackBonus;
    const [weaponDamage, weaponDamageType] = weapon.data.data.damage.parts[0];
    const MariAbilityMod =
      Mari.data.data.abilities[weapon.data.data.ability].mod;

    generateAttack = async (type) => {
      const promisesArr = [];
      promisesArr.push(
        new Roll(
          `${d20Map[type]} + ${weaponAttackBonus} + ${MariAbilityMod} + ${MariProf}`
        ).roll()
      );
      promisesArr.push(
        new Roll(`${weaponDamage}`, {
          mod: MariAbilityMod,
        }).roll()
      );
      const [atkRoll, dmgRoll] = await Promise.all(promisesArr);

      const dieRoll = atkRoll.dice[0].results.find((die) => die.active).result;
      let isCrit = "";
      let critDamage = 0;
      let critDamageStr = "";
      if (dieRoll === 20 || (weaponId === ShipWreckerId && dieRoll === 19)) {
        isCrit = "success";
        const dmgDice = dmgRoll.formula.match(diceRegex);
        dmgDice.forEach((die) => {
          const [num, size] = die.split("d");
          const dmg = num * size;
          critDamage += dmg;
          critDamageStr += ` + ${dmg}[crit]`;
        });
      } else if (dieRoll === 1) {
        isCrit = "failure";
      }

      const [atkRollTooltip, dmgRollTooltip] = await Promise.all([
        atkRoll.getTooltip(),
        dmgRoll.getTooltip(),
      ]);

      const totalDamage = dmgRoll.total + critDamage;

      const chatTemplate = `
          <div>
            <h2>
              ${weapon.data.name}
            </h2>
            <div class="atk-result-total">
              <div class="atk-result-roll">
                <strong>Attack Roll: <span ${
                  isCrit ? 'class="crit-' + isCrit + '"' : ""
                }>${atkRoll.total}</span></strong>
              </div>
              <div class="atk-result-tooltip">
                <div class="atk-result-formula">
                  <strong>${atkRoll.formula}</strong>
                </div>
                ${atkRollTooltip}
              </div>
            </div>
            <hr />
            <div class="dmg-result-row">
              <strong>${
                weaponDamageType[0].toUpperCase() + weaponDamageType.slice(1)
              } Damage:</strong>
              <span class="atk-result-tooltip-container">
                ${dmgRoll.total + critDamageStr}
                <div class="atk-result-tooltip">
                  <div class="atk-result-formula">
                    <strong>${dmgRoll.formula}</strong>
                  </div>
                  ${dmgRollTooltip}
                </div>
              </span>
            </div>
            <div class="atk-result-total atk-result-total-damage">
              <strong>Total Damage: ${totalDamage}</strong>
            </div>
            <div class="roll-attack-again-row d-none">
              <br />
              <h3 class="text-center">Attack Again!</h3>
              <div class="d-flex">
                <button class="roll-attack-again-adv">Advantage</button>
                <button class="roll-attack-again-normal">Normal</button>
                <button class="roll-attack-again-dis">Disadvantage</button>
              </div>
            </div>
          </div>`;

      const totalRoll = new Roll(totalDamage.toString()).roll();
      totalRoll.toMessage({
        speaker: {
          alias: "Mari",
        },
        content: chatTemplate,
      });

      Hooks.once("renderChatMessage", (chatItem, html) => {
        const messageId = html[0].dataset.messageId;
        const message = game.messages.get(messageId);
        if (message.isAuthor) {
          html.find(".roll-attack-again-row")[0].classList.remove("d-none");
          html.find(".roll-attack-again-adv").click(async () => {
            await generateAttack("adv");
          });
          html.find(".roll-attack-again-normal").click(async () => {
            await generateAttack("normal");
          });
          html.find(".roll-attack-again-dis").click(async () => {
            await generateAttack("dis");
          });
        }
      });
    };
    await generateAttack(type);
  };

  new Dialog({
    title: "Mari Attack",
    content: attackDialogTemplate,
    buttons: {
      adv: {
        label: "Advantage",
        callback: async (html) => {
          await rollAttackAndDamage("adv", html);
        },
      },
      normal: {
        label: "Normal",
        callback: async (html) => {
          await rollAttackAndDamage("normal", html);
        },
      },
      dis: {
        label: "Disadvantage",
        callback: async (html) => {
          await rollAttackAndDamage("dis", html);
        },
      },
    },
    default: "normal",
  }).render(true);
}
