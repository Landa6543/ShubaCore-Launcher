/**
 * Test Suite - Fase 28: Sistema de Internacionalización (i18n) Bilingüe (Español / Inglés)
 * SHUBATECH - ShubaCore Launcher
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 PRUEBAS: FASE 28 - SISTEMA DE INTERNACIONALIZACIÓN (i18n)');
console.log('====================================================\n');

// 1. Verificar módulo i18n.js y sus exports
console.log('▶ [1/5] Verificando módulo src/renderer/i18n.js...');
const i18nPath = path.join(__dirname, '../src/renderer/i18n.js');
assert.ok(fs.existsSync(i18nPath), 'i18n.js debe existir en src/renderer');

const i18n = require(i18nPath);
assert.strictEqual(typeof i18n.t, 'function', 'i18n debe exportar t()');
assert.strictEqual(typeof i18n.setLanguage, 'function', 'i18n debe exportar setLanguage()');
assert.strictEqual(typeof i18n.getLanguage, 'function', 'i18n debe exportar getLanguage()');
assert.ok(i18n.translations && i18n.translations.es && i18n.translations.en, 'translations debe tener diccionarios es y en');
console.log('   ✔ Módulo i18n.js y exports validados.');

// 2. Comprobar paridad de claves entre español e inglés
console.log('\n▶ [2/5] Verificando paridad de claves y completitud de diccionarios...');
const esKeys = Object.keys(i18n.translations.es);
const enKeys = Object.keys(i18n.translations.en);

const requiredKeys = [
  'nav.instances', 'nav.catalog', 'nav.instanceManager', 'nav.servers',
  'nav.social', 'nav.screenshots', 'nav.wardrobe', 'nav.controller',
  'nav.settings', 'nav.console', 'launch.play', 'launch.launching',
  'instances.title', 'instances.newInstance', 'instances.shareCode',
  'instances.importCode', 'instances.importModpack', 'modal.createTitle',
  'modal.editTitle', 'modal.packName', 'chooseIcon.title', 'chooseIcon.tabUser',
  'settings.languageTitle', 'settings.languageDesc', 'welcomeLang.title',
  'welcomeLang.subtitle', 'welcomeLang.esTitle', 'welcomeLang.enTitle',
  'welcomeLang.btnConfirm'
];

for (const reqKey of requiredKeys) {
  assert.ok(esKeys.includes(reqKey), `Diccionario 'es' debe incluir la clave '${reqKey}'`);
  assert.ok(enKeys.includes(reqKey), `Diccionario 'en' debe incluir la clave '${reqKey}'`);
}
console.log(`   ✔ Diccionarios validados: ${esKeys.length} claves en español, ${enKeys.length} claves en inglés.`);

// 3. Comprobar funcionamiento reactivo de t() y setLanguage()
console.log('\n▶ [3/5] Verificando reactividad y conmutación de idiomas con t() y setLanguage()...');
i18n.setLanguage('es', false);
assert.strictEqual(i18n.getLanguage(), 'es', 'El idioma inicial debe ser español');
assert.strictEqual(i18n.t('nav.instances'), 'Instancias', 'Traducción de nav.instances en español');
assert.strictEqual(i18n.t('launch.play'), 'JUGAR', 'Traducción de launch.play en español');
assert.strictEqual(i18n.t('instances.newInstance'), 'Nueva Instancia', 'Traducción de instances.newInstance en español');

i18n.setLanguage('en', false);
assert.strictEqual(i18n.getLanguage(), 'en', 'El idioma conmutado debe ser inglés');
assert.strictEqual(i18n.t('nav.instances'), 'Instances', 'Traducción de nav.instances en inglés');
assert.strictEqual(i18n.t('launch.play'), 'PLAY', 'Traducción de launch.play en inglés');
assert.strictEqual(i18n.t('instances.newInstance'), 'New Instance', 'Traducción de instances.newInstance en inglés');

// Fallback para claves inexistentes
assert.strictEqual(i18n.t('non.existent.key', 'Mi Valor por Defecto'), 'Mi Valor por Defecto');
console.log('   ✔ Conmutación de idiomas y fallback comprobados.');

// 4. Verificar integración DOM en index.html
console.log('\n▶ [4/5] Verificando inclusión de i18n en index.html...');
const indexHtml = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
assert.ok(indexHtml.includes('<script src="i18n.js"></script>'), 'index.html debe cargar i18n.js');
assert.ok(indexHtml.includes('id="card-settings-language"'), 'index.html debe contener tarjeta de ajuste de idioma');
assert.ok(indexHtml.includes('id="select-launcher-language"'), 'index.html debe contener selector de idioma');
assert.ok(indexHtml.includes('id="modal-language-welcome"'), 'index.html debe contener modal de bienvenida');
assert.ok(indexHtml.includes('id="card-welcome-lang-es"'), 'Modal debe contener tarjeta de selección español');
assert.ok(indexHtml.includes('id="card-welcome-lang-en"'), 'Modal debe contener tarjeta de selección inglés');
assert.ok(indexHtml.includes('id="btn-confirm-welcome-lang"'), 'Modal debe contener botón de confirmación');
assert.ok(indexHtml.includes('data-i18n="nav.instances"'), 'Barra lateral debe tener data-i18n="nav.instances"');
assert.ok(indexHtml.includes('data-i18n="instances.newInstance"'), 'Botón nueva instancia debe tener data-i18n');
console.log('   ✔ Elementos y atributos i18n en index.html validados.');

// 5. Verificar estilos CSS de selección de idioma en styles.css
console.log('\n▶ [5/5] Verificando estilos visuales en styles.css...');
const stylesCss = fs.readFileSync(path.join(__dirname, '../src/renderer/styles.css'), 'utf8');
assert.ok(stylesCss.includes('.welcome-lang-grid'), 'styles.css debe incluir .welcome-lang-grid');
assert.ok(stylesCss.includes('.welcome-lang-card'), 'styles.css debe incluir .welcome-lang-card');
assert.ok(stylesCss.includes('.welcome-lang-card.selected'), 'styles.css debe incluir .welcome-lang-card.selected');
console.log('   ✔ Estilos CSS de selección de idioma validados con éxito.');

console.log('\n====================================================');
console.log('🎉 TODAS LAS PRUEBAS DE LA FASE 28 (i18n) PASARON CON ÉXITO');
console.log('====================================================\n');
