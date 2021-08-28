const GrigorId = "oXxYMmGdMC90DKZf";

function _scaleDamage(parts, scaling, times, rollData) {
  if (times <= 0) {
    return parts;
  }
  const partRoll = new Roll(parts[0], rollData);
  const scalingRoll = new Roll(scaling, rollData).alter(times);

  // Attempt to simplify by combining like dice terms
  let simplified = false;
  if (scalingRoll.terms[0] instanceof Die && scalingRoll.terms.length === 1) {
    const die = partRoll.terms[0];
    const scaleDie = scalingRoll.terms[0];
    if (
      die instanceof Die &&
      die.faces === scaleDie.faces &&
      die.modifiers.equals(scaleDie.modifiers)
    ) {
      die.number += scaleDie.number;
      parts[0] = partRoll.formula;
      simplified = true;
    }
  }

  // Otherwise add to the first part
  if (!simplified) {
    parts[0] = `${parts[0]} + ${scalingRoll.formula}`;
  }
  return parts;
}

function _scaleCantripDamage(parts, scale, level, rollData) {
  const add = Math.floor((level + 1) / 6);
  if (add === 0) {
    return;
  }
  return _scaleDamage(parts, scale || parts.join(" + "), add, rollData);
}

main();

function main() {
  const Grigor = game.actors.get(GrigorId);
  const GrigorProf = Grigor.data.data.attributes.prof;
  const GrigorItems = Array.from(Grigor.items.values());

  const weapons = GrigorItems.filter(
    (item) => item.data.type === "weapon" && item.data.data.equipped
  );
  let weaponOptions = "";
  for (const weapon of weapons) {
    weaponOptions += `<option value=${weapon.id}>${weapon.data.name}</option>`;
  }

  const cantrips = GrigorItems.filter(
    (item) =>
      item.data.type === "spell" &&
      item.data.data.level === 0 &&
      item.data.data.damage.parts.length
  );
  let cantripOptions = "";
  for (const cantrip of cantrips) {
    cantripOptions += `<option value=${cantrip.id}>${cantrip.data.name}</option>`;
  }

  const dialogTemplate = `
      <h1>Select Attack</h1>
      <div class="attack-dialog-grid">
        <div class="attack-dialog-row weapon-options-row">
            <label for="grigor-atk-type">Attack Type:</label>
            <select id="grigor-atk-type" value="weapon">
                <option value="weapon">Weapon</option>
                <option value="cantrip">Cantrip</option>
            </select>
        </div>
        <div id="grigor-atk-weapon-row" class="attack-dialog-row weapon-options-row">
          <label for="grigor-atk-weapon">Weapon:</label>
          <select id="grigor-atk-weapon">${weaponOptions}</select>
        </div>
        <div id="grigor-atk-cantrip-row" class="attack-dialog-row weapon-options-row d-none">
          <label for="grigor-atk-cantrip">Cantrip:</label>
          <select id="grigor-atk-cantrip">${cantripOptions}</select>
        </div>
        <div class="attack-dialog-row attack-options-row">
          <div class="d-flex align-items-center">
            <label for="grigor-blessed-strikes">Blessed Strikes:</label>
            <input id="grigor-blessed-strikes" type="checkbox" checked />
          </div>
          <div id="grigor-alt-cantrip-dmg-group" class="d-flex align-items-center d-none">
            <label for="grigor-alt-cantrip-dmg">Alt Cantrip Damage:</label>
            <input id="grigor-alt-cantrip-dmg" type="checkbox" />
          </div>
        </div>
      </div>
      <script>
        handleAltCantripDmgDisplay = (grigorAtkCantrip) => {
            const type = document.querySelector("#grigor-atk-type").value;
            if (type !== "cantrip") {
                return;
            }  
            const altCantripDmgGroup = document.querySelector("#grigor-alt-cantrip-dmg-group");
            const cantripId = grigorAtkCantrip.value;
            const cantrip = game.actors.get("${GrigorId}").items.get(cantripId);
            if (cantrip.data.data.damage.versatile) {
                altCantripDmgGroup.classList.remove("d-none");
                return;
            }
            altCantripDmgGroup.classList.add("d-none");
            document.querySelector("#grigor-alt-cantrip-dmg").checked = false;
        }
        document.querySelector("#grigor-atk-type").addEventListener("change", event => {
            const weaponRow = document.querySelector("#grigor-atk-weapon-row");
            const cantripRow = document.querySelector("#grigor-atk-cantrip-row");
            if (event.target.value === "weapon") {
                cantripRow.classList.add("d-none");
                weaponRow.classList.remove("d-none");
                return;
            }
            weaponRow.classList.add("d-none");
            cantripRow.classList.remove("d-none");
            
            handleAltCantripDmgDisplay(document.querySelector("#grigor-atk-cantrip"));
        });
        document.querySelector("#grigor-atk-cantrip").addEventListener("input", grigorAtkCantrip => {
            handleAltCantripDmgDisplay(grigorAtkCantrip.target);
        });
      </script>`;

  const d20Map = { adv: "2d20kh", normal: "1d20", dis: "2d20kl" };
  const rollAttackAndDamage = async (type, html) => {
    const attackType = html.find("#grigor-atk-type")[0].value;
    const weaponId = html.find(`#grigor-atk-${attackType}`)[0].value;
    const weapon = Grigor.items.get(weaponId);
    const weaponAttackBonus = weapon.data.data.attackBonus;
    const weaponAbility =
      attackType === "weapon"
        ? weapon.data.data.ability
        : Grigor.data.data.attributes.spellcasting;
    let [weaponDamage, weaponDamageType] = weapon.data.data.damage.parts[0];
    if (attackType === "cantrip") {
      let scaling = weapon.data.data.scaling.formula;
      const altCantripDmg = html.find("#grigor-alt-cantrip-dmg")[0].checked;
      if (altCantripDmg) {
        weaponDamage = scaling = weapon.data.data.damage.versatile;
      }
      if (weaponDamage.length > 25 || altCantripDmg) {
        const indexOfSquareBracket = weaponDamage.indexOf("[") + 1;
        if (indexOfSquareBracket) {
          weaponDamage =
            weaponDamage.slice(0, indexOfSquareBracket) +
            weaponDamageType +
            "]";
        } else {
          weaponDamage += `[${weaponDamageType}]`;
        }
      }
      weaponDamage = _scaleCantripDamage(
        [weaponDamage],
        scaling,
        Grigor.data.data.details.level,
        weapon.getRollData()
      );
    }
    const GrigorAbilityMod = Grigor.data.data.abilities[weaponAbility].mod;

    const blessedStrikesEnabled = html.find("#grigor-blessed-strikes")[0]
      .checked;

    let atkRoll;
    if (type) {
      atkRoll = await new Roll(
        `${d20Map[type]} + ${weaponAttackBonus} + ${GrigorAbilityMod} + ${GrigorProf}`
      ).roll();
    }

    const promisesArr = [];
    promisesArr.push(
      new Roll(`${weaponDamage}`, {
        mod: GrigorAbilityMod,
      }).roll()
    );
    if (blessedStrikesEnabled) {
      promisesArr.push(new Roll(`1d8[radiant]`).roll());
    }
    const [dmgRoll, blessedStrikesRoll] = await Promise.all(promisesArr);

    const dieRoll = atkRoll?.dice[0].results.find((die) => die.active).result;
    let isCrit = "";
    let critDamage = 0;
    let critDamageStr = "";
    let critBlessedStrikes = 0;
    if (dieRoll === 20) {
      isCrit = "success";
      const dmgDice = dmgRoll.formula.match(diceRegex);
      dmgDice.forEach((die) => {
        const [num, size] = die.split("d");
        const dmg = num * size;
        critDamage += dmg;
        critDamageStr += ` + ${dmg}[crit]`;
      });
      if (blessedStrikesRoll) {
        critBlessedStrikes = blessedStrikesRoll.formula[0] * 6;
      }
    } else if (dieRoll === 1) {
      isCrit = "failure";
    }

    const [atkRollTooltip, dmgRollTooltip, blessedStrikesTooltip] =
      await Promise.all([
        atkRoll?.getTooltip(),
        dmgRoll.getTooltip(),
        blessedStrikesRoll ? blessedStrikesRoll.getTooltip() : undefined,
      ]);

    const totalDamage =
      dmgRoll.total +
      (blessedStrikesRoll ? blessedStrikesRoll.total : 0) +
      critDamage +
      critBlessedStrikes;

    let chatTemplate = `
        <div class="chat-card" data-actor-id="${GrigorId}" data-item-id="${weaponId}" data-spel-level="0">
            <h2>
                ${weapon.data.name}
            </h2>`;
    if (type) {
      chatTemplate += `
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
            </div>`;
    } else {
      let spellSave = weapon.data.data.save.ability;
      if (spellSave.length) {
        spellSave = spellSave[0].toUpperCase() + spellSave.slice(1);
        chatTemplate += `
            <div class="card-buttons">
                <button data-action="save" data-ability="${weapon.data.data.save.ability}" class="grigor-spell-save-btn">
                    ${spellSave} Save - DC ${Grigor.data.data.attributes.spelldc}
                </button>
            </div>`;
      }
    }
    chatTemplate += `
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
            </div>`;
    if (blessedStrikesRoll) {
      chatTemplate += `
            <div class="dmg-result-row">
                <strong>Blessed Strikes Damage:</strong>
                <span class="atk-result-tooltip-container">
                ${blessedStrikesRoll.total}${
        critBlessedStrikes ? " + " + critBlessedStrikes : ""
      }
                <div class="atk-result-tooltip">
                    <div class="atk-result-formula">
                    <strong>${blessedStrikesRoll.formula}</strong>
                    </div>
                    ${blessedStrikesTooltip}
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
        alias: "Grigor",
      },
      content: chatTemplate,
    });
  };

  new Dialog({
    title: "Grigor Attack",
    content: dialogTemplate,
    buttons: {
      noAttack: {
        label: "Save",
        callback: async (html) => {
          await rollAttackAndDamage(false, html);
        },
      },
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
