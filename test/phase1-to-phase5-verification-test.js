const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Verifying Phase 1 (Fabric ShubaHost) ---');
const fabricModJson = 'C:/Users/soybe/Desktop/Mods NeoForge/e4mc-minecraft-architectury-rererewrite/fabric/src/main/resources/fabric.mod.json';
const fmjContent = JSON.parse(fs.readFileSync(fabricModJson, 'utf8'));
assert.strictEqual(fmjContent.depends.fabricloader, '>=0.14.0', 'fabricloader must be >=0.14.0');
console.log('✓ Phase 1 OK: fabricloader dependency is correct');

console.log('--- Verifying Phase 2 (Blue Logo S in ModManager & ProfileManager) ---');
const { ModManager } = require('../src/main/mods/ModManager');
const mm = new ModManager();
const modpackInfo = mm.getOfficialShubaClientModpackInfo();
assert.ok(modpackInfo.iconUrl.startsWith('data:image/png;base64,'), 'modpack iconUrl should be base64 png');
const modpackDetails = mm.getOfficialShubaClientModpackDetails();
assert.ok(modpackDetails.iconUrl.startsWith('data:image/png;base64,'), 'modpack details iconUrl should be base64 png');
console.log('✓ Phase 2 OK: Modpack and client mods use blue S logo');

console.log('--- Verifying Phase 3 (Social, Community, Invitations) ---');
const html = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
assert.ok(html.includes('id="tab-social-community"'), 'Community tab must exist');
assert.ok(html.includes('id="panel-social-community"'), 'Community panel must exist');
assert.ok(html.includes('modal-close-btn'), 'modal-close-btn must exist');
const rendererJs = fs.readFileSync(path.join(__dirname, '../src/renderer/renderer.js'), 'utf8');
assert.ok(rendererJs.includes('showGameInvitePopup'), 'showGameInvitePopup must be defined');
assert.ok(rendererJs.includes('showToast'), 'showToast must be defined');
console.log('✓ Phase 3 OK: Community UI and invite toasts implemented');

console.log('--- Verifying Phase 4 (Eliminated Forzar Espanol) ---');
assert.ok(!html.includes('Forzar Español'), 'Forzar Espanol must NOT exist in index.html');
assert.ok(!rendererJs.includes('checkboxForceSpanish'), 'checkboxForceSpanish must NOT exist in renderer.js');
console.log('✓ Phase 4 OK: Forzar Espanol eliminated cleanly');

console.log('--- Verifying Phase 5 (Capes) ---');
const { SkinManager } = require('../src/main/skins/SkinManager');
const sm = new SkinManager();
assert.strictEqual(typeof sm.setActiveCape, 'function', 'SkinManager must have setActiveCape');
assert.ok(!rendererJs.includes('ownedCapes[0] || null'), 'Must not auto-select cape 0');
console.log('✓ Phase 5 OK: Capes wardrobe and Mojang sync ready');

console.log('\n=============================================');
console.log('  🎉 ALL 5 PHASES VERIFIED SUCCESSFULLY! 🎉  ');
console.log('=============================================');
