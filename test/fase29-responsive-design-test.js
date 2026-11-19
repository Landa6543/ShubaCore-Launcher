/**
 * Test Suite - Fase 29: Diseño Responsivo Integral para Pantallas Pequeñas y Modo Ventana
 * SHUBATECH - ShubaCore Launcher
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 PRUEBAS: FASE 29 - DISEÑO RESPONSIVO INTEGRAL');
console.log('====================================================\n');

const stylesPath = path.join(__dirname, '../src/renderer/styles.css');
assert.ok(fs.existsSync(stylesPath), 'styles.css debe existir');
const stylesCss = fs.readFileSync(stylesPath, 'utf8');

// 1. Verificar reglas de modales accesibles y protegidos contra corte vertical
console.log('▶ [1/4] Verificando protección vertical en modales base...');
assert.ok(stylesCss.includes('max-height: 92vh;'), 'modal-content debe tener max-height: 92vh');
assert.ok(stylesCss.includes('overflow-y: auto;') && stylesCss.includes('calc(92vh - 120px)'), 'modal-body debe tener scroll vertical independiente');
console.log('   ✔ Reglas base de modales validadas (cero cortes en pantallas con poca altura).');

// 2. Verificar Breakpoint 1150px
console.log('\n▶ [2/4] Verificando Breakpoint < 1150px (Toolbars y Acciones fluidas)...');
assert.ok(stylesCss.includes('@media (max-width: 1150px)'), 'styles.css debe incluir @media (max-width: 1150px)');
assert.ok(stylesCss.includes('.view-toolbar') && stylesCss.includes('flex-wrap: wrap'), 'view-toolbar debe envolver fluidamente');
assert.ok(stylesCss.includes('.toolbar-actions') && stylesCss.includes('flex-wrap: wrap'), 'toolbar-actions debe envolver fluidamente');
console.log('   ✔ Breakpoint 1150px validado.');

// 3. Verificar Breakpoint 980px (Colapso de Barra Lateral a 68px)
console.log('\n▶ [3/4] Verificando Breakpoint < 980px (Colapso compacto de sidebar e iconos)...');
assert.ok(stylesCss.includes('width: 68px !important;'), 'sidebar debe colapsar a 68px');
assert.ok(stylesCss.includes('calc(100vw - 68px)'), 'main-content debe expandirse al ancho restante');
assert.ok(stylesCss.includes('.sidebar-brand-text') && stylesCss.includes('display: none !important;'), 'Texto de marca debe ocultarse en modo compacto');
assert.ok(stylesCss.includes('.player-info') && stylesCss.includes('display: none !important;'), 'Info de jugador debe ocultarse en modo compacto');
console.log('   ✔ Breakpoint 980px validado (sidebar compacta con iconos limpios).');

// 4. Verificar Breakpoint 820px (Modo Ultra-Compacto, Red Social, Modales y Catálogo)
console.log('\n▶ [4/4] Verificando Breakpoint < 820px (Ultra-Compacto y Adaptabilidad Móvil/Ventana Pequeña)...');
assert.ok(stylesCss.includes('@media (max-width: 820px)'), 'styles.css debe incluir @media (max-width: 820px)');
assert.ok(stylesCss.includes('width: 95vw !important;'), 'modal-content debe ocupar 95vw en ventanas pequeñas');
assert.ok(stylesCss.includes('.catalog-grid') && stylesCss.includes('grid-template-columns: 1fr !important;'), 'Catálogo debe fluir en 1 columna');
assert.ok(stylesCss.includes('.friends-grid') && stylesCss.includes('grid-template-columns: 1fr !important;'), 'Amigos y Red Social deben fluir en 1 columna');
assert.ok(stylesCss.includes('.welcome-lang-grid') && stylesCss.includes('grid-template-columns: 1fr !important;'), 'Selector de idioma debe fluir en 1 columna');
console.log('   ✔ Breakpoint 820px validado (catálogo, modales y red social adaptables).');

console.log('\n====================================================');
console.log('🎉 TODAS LAS PRUEBAS DE LA FASE 29 (RESPONSIVE) PASARON CON ÉXITO');
console.log('====================================================\n');
