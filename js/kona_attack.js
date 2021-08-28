const diceRegex = /[1-9][0-9]*d[1-9][0-9]?/g;
const KonaId = "aYGUVGtPpMNtfHmn";
const SneakAttackId = "RC3dnMjVaq7qymvP";

main();

/*
 TODO:
 * Improve crit styling and add good/bad styling for damage results
 * Figure out how to not close dialog on button click
 * Add color styling to numbers when crit 
 * Detect if weapon is ranged and decrement ammunition
 * Add way to control roll visibility
    - see https://foundryvtt.com/api/data.ChatMessageData.html for info on whisper/blind properties
*/
function main() {
  const Kona = game.actors.get(KonaId);
  const KonaProf = Kona.data.data.attributes.prof;

  const weapons = Array.from(Kona.items.values()).filter(
    (item) => item.data.type === "weapon" && item.data.data.equipped
  );
  let weaponOptions = "";
  for (const weapon of weapons) {
    weaponOptions += `<option value=${weapon.id}>${weapon.data.name}</option>`;
  }
  let sneakAttack;
  const canSneakAttack = (weapon) => {
    if (weapon.id === SneakAttackId) {
      return false;
    }
    if (
      weapon.data.data.weaponType.endsWith("R") ||
      weapon.data.data.properties.fin
    ) {
      sneakAttack = Kona.items.get(SneakAttackId);
      return true;
    }
    return false;
  };

  const dialogTemplate = `
    <h1>Select Attack</h1>
    <div class="attack-dialog-grid">
      <div class="attack-dialog-row weapon-options-row">
        <label for="kona-atk-weapon">Weapon:</label>
        <select id="kona-atk-weapon">${weaponOptions}</select>
      </div>
      <div class="attack-dialog-row attack-options-row">
        <div class="d-flex align-items-center">
          <label for="kona-sneak-attack">Sneak Attack:</label>
          <input id="kona-sneak-attack" type="checkbox" checked />
        </div>
        <div class="d-flex align-items-center">
          <label for="kona-sharp-shooter">Sharp Shooter:</label>
          <input id="kona-sharp-shooter" type="checkbox" />
        </div>
      </div>
    </div>`;

  const d20Map = { adv: "2d20r1=1kh", normal: "1d20r1=1", dis: "2d20r1=1kl" };
  const rollAttackAndDamage = async (type, html) => {
    const weaponId = html.find("#kona-atk-weapon")[0].value;
    const weapon = Kona.items.get(weaponId);
    const weaponAttackBonus = weapon.data.data.attackBonus;
    const [weaponDamage, weaponDamageType] = weapon.data.data.damage.parts[0];
    const KonaAbilityMod =
      Kona.data.data.abilities[weapon.data.data.ability].mod;

    const sneakAttackEnabled = html.find("#kona-sneak-attack")[0].checked;
    const sharpShooterEnabled = html.find("#kona-sharp-shooter")[0].checked;

    const promisesArr = [];
    promisesArr.push(
      new Roll(
        `${
          d20Map[type]
        } + ${weaponAttackBonus} + ${KonaAbilityMod} + ${KonaProf}${
          sharpShooterEnabled ? " - 5" : ""
        }`
      ).roll()
    );
    promisesArr.push(
      new Roll(`${weaponDamage}`, {
        mod: KonaAbilityMod,
      }).roll()
    );
    if (sneakAttackEnabled && canSneakAttack(weapon)) {
      promisesArr.push(
        new Roll(
          `${sneakAttack.data.data.damage.parts[0][0]}[${weaponDamageType}]`,
          { classes: Kona.data.data.classes }
        ).roll()
      );
    }
    const [atkRoll, dmgRoll, sneakAttackRoll] = await Promise.all(promisesArr);

    const dieRoll = atkRoll.dice[0].results.find((die) => die.active).result;
    const sharpShooterString = sharpShooterEnabled ? " + 10[ss]" : "";
    let isCrit = "";
    let critDamage = 0;
    let critDamageStr = "";
    let critSneakAttack = 0;
    if (dieRoll === 20) {
      isCrit = "success";
      const dmgDice = dmgRoll.formula.match(diceRegex);
      dmgDice.forEach((die) => {
        const [num, size] = die.split("d");
        const dmg = num * size;
        critDamage += dmg;
        critDamageStr += ` + ${dmg}[crit]`;
      });
      if (sneakAttackRoll) {
        critSneakAttack = sneakAttackRoll.formula[0] * 6;
      }
    } else if (dieRoll === 1) {
      isCrit = "failure";
    }

    const [atkRollTooltip, dmgRollTooltip, sneakAttackTooltip] =
      await Promise.all([
        atkRoll.getTooltip(),
        dmgRoll.getTooltip(),
        sneakAttackRoll ? sneakAttackRoll.getTooltip() : undefined,
      ]);

    const totalDamage =
      dmgRoll.total +
      (sharpShooterEnabled ? 10 : 0) +
      (sneakAttackRoll ? sneakAttackRoll.total : 0) +
      critDamage +
      critSneakAttack;

    let chatTemplate = `
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
            ${dmgRoll.total + sharpShooterString + critDamageStr}
            <div class="atk-result-tooltip">
              <div class="atk-result-formula">
                <strong>${dmgRoll.formula}</strong>
              </div>
              ${dmgRollTooltip}
            </div>
          </span>
        </div>`;
    if (sneakAttackRoll) {
      chatTemplate += `
        <div class="dmg-result-row">
          <strong>Sneak Attack Damage:</strong>
          <span class="atk-result-tooltip-container">
            ${sneakAttackRoll.total}${
        critSneakAttack ? " + " + critSneakAttack : ""
      }
            <div class="atk-result-tooltip">
              <div class="atk-result-formula">
                <strong>${sneakAttackRoll.formula}</strong>
              </div>
              ${sneakAttackTooltip}
            </div>
          </span>
        </div>`;
    }
    chatTemplate += `
        <div class="atk-result-total atk-result-total-damage">
          <strong>Total Damage: ${totalDamage}</strong>
        </div>
      </div>`;

    const totalRoll = new Roll(totalDamage.toString()).roll();
    totalRoll.toMessage({
      speaker: {
        alias: "Kona",
      },
      content: chatTemplate,
    });
  };

  new Dialog({
    title: "Kona Attack",
    content: dialogTemplate,
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
