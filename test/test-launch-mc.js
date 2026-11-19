const { getLaunchManager } = require('../src/main/launcher/LaunchManager');

async function main() {
  const launchManager = getLaunchManager();
  launchManager.onEvent((event, data) => {
    if (event === 'launch:log' || event === 'launch:debug') {
      console.log(`[${event}]`, typeof data === 'string' ? data : (data?.line || JSON.stringify(data)));
    } else if (event === 'launch:close') {
      console.log(`[MC EXIT] Code: ${data.code}, PID: ${data.pid}`);
      process.exit(0);
    } else {
      console.log(`[EVENT: ${event}]`, data?.message || data?.state || '');
    }
  });
  
  console.log('Iniciando lanzamiento de prueba...');
  const res = await launchManager.launch({
    profileId: 'ShubaClient Oficial 26.3 (FPS Boost & Vulkan) (2)',
    instancePath: 'C:\\Users\\soybe\\AppData\\Roaming\\.shubacore\\instances\\ShubaClient Oficial 26.3 (FPS Boost & Vulkan) (2)',
    mcVersion: '26.3',
    loader: 'Fabric',
    loaderVersion: '0.20.1',
    memoryMin: '2G',
    memoryMax: '6G'
  });
  console.log('Launch result:', res.success ? 'STARTED' : res.error);
}
main().catch(err => {
  console.error('Launch error:', err);
  process.exit(1);
});
