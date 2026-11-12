/**
 * ShubaCore - Native OS Controller Bridge (Win32 SendInput & XInput via Native ShubaController.exe)
 * Developed by SHUBATECH
 *
 * Provides real-time 60Hz-100Hz controller translation directly to Windows OS
 * using a dedicated compiled native C# binary (ShubaController.exe) with direct
 * P/Invoke to xinput1_4.dll / xinput9_1_0.dll and user32.dll (SendInput / keybd_event / mouse_event).
 * 100% Mod-Free, 0 mods in mods/.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const { defaultLogger: logger } = require('../utils/logger');
const { getControllerMapManager } = require('./ControllerMapManager');
const { getConfigManager } = require('../config/ConfigManager');

const SHUBA_CONTROLLER_SOURCE = `using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace ShubaController
{
    class Program
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr LoadLibrary(string libname);

        [DllImport("kernel32.dll", CharSet = CharSet.Ansi, ExactSpelling = true, SetLastError = true)]
        private static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        private const uint MOUSEEVENTF_MOVE = 0x0001;
        private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const uint MOUSEEVENTF_LEFTUP = 0x0004;
        private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        private const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        private const uint MOUSEEVENTF_WHEEL = 0x0800;

        private const uint KEYEVENTF_KEYDOWN = 0x0000;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_SCANCODE = 0x0008;

        // Hardware Scan Codes for Minecraft GLFW Engine
        private const byte SCAN_W = 0x11;
        private const byte SCAN_A = 0x1E;
        private const byte SCAN_S = 0x1F;
        private const byte SCAN_D = 0x20;
        private const byte SCAN_SPACE = 0x39;
        private const byte SCAN_Q = 0x10;
        private const byte SCAN_F = 0x21;
        private const byte SCAN_E = 0x12;
        private const byte SCAN_CTRL = 0x1D;
        private const byte SCAN_SHIFT = 0x2A;
        private const byte SCAN_ESC = 0x01;
        private const byte SCAN_TAB = 0x0F;
        private const byte SCAN_F3 = 0x3D;
        private const byte SCAN_F5 = 0x3F;
        private const byte SCAN_L = 0x26;
        private const byte SCAN_T = 0x14;

        [StructLayout(LayoutKind.Sequential)]
        public struct XINPUT_GAMEPAD
        {
            public ushort wButtons;
            public byte bLeftTrigger;
            public byte bRightTrigger;
            public short sThumbLX;
            public short sThumbLY;
            public short sThumbRX;
            public short sThumbRY;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct XINPUT_STATE
        {
            public uint dwPacketNumber;
            public XINPUT_GAMEPAD Gamepad;
        }

        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        private delegate int XInputGetStateDelegate(int dwUserIndex, ref XINPUT_STATE pState);

        private static XInputGetStateDelegate XInputGetState;

        private const ushort XINPUT_GAMEPAD_DPAD_UP = 0x0001;
        private const ushort XINPUT_GAMEPAD_DPAD_DOWN = 0x0002;
        private const ushort XINPUT_GAMEPAD_DPAD_LEFT = 0x0004;
        private const ushort XINPUT_GAMEPAD_DPAD_RIGHT = 0x0008;
        private const ushort XINPUT_GAMEPAD_START = 0x0010;
        private const ushort XINPUT_GAMEPAD_BACK = 0x0020;
        private const ushort XINPUT_GAMEPAD_LEFT_THUMB = 0x0040;
        private const ushort XINPUT_GAMEPAD_RIGHT_THUMB = 0x0080;
        private const ushort XINPUT_GAMEPAD_LEFT_SHOULDER = 0x0100;
        private const ushort XINPUT_GAMEPAD_RIGHT_SHOULDER = 0x0200;
        private const ushort XINPUT_GAMEPAD_A = 0x1000;
        private const ushort XINPUT_GAMEPAD_B = 0x2000;
        private const ushort XINPUT_GAMEPAD_X = 0x4000;
        private const ushort XINPUT_GAMEPAD_Y = 0x8000;

        private static bool keyW, keyA, keyS, keyD;
        private static bool keySpace, keyQ, keyF, keyE, keyCtrl, keyShift, keyEsc, keyTab;
        private static bool keyF3, keyF5, keyL, keyT;
        private static bool mouseLeft, mouseRight;
        private static bool lbPressed, rbPressed;

        static void SendKey(byte scanCode, ref bool currentState, bool desiredState)
        {
            if (desiredState != currentState)
            {
                uint flags = KEYEVENTF_SCANCODE | (desiredState ? KEYEVENTF_KEYDOWN : KEYEVENTF_KEYUP);
                keybd_event(0, scanCode, flags, UIntPtr.Zero);
                currentState = desiredState;
            }
        }

        static void SendMouseButton(uint downFlag, uint upFlag, ref bool currentState, bool desiredState)
        {
            if (desiredState != currentState)
            {
                mouse_event(desiredState ? downFlag : upFlag, 0, 0, 0, UIntPtr.Zero);
                currentState = desiredState;
            }
        }

        static void ReleaseAll()
        {
            if (keyW) SendKey(SCAN_W, ref keyW, false);
            if (keyA) SendKey(SCAN_A, ref keyA, false);
            if (keyS) SendKey(SCAN_S, ref keyS, false);
            if (keyD) SendKey(SCAN_D, ref keyD, false);
            if (keySpace) SendKey(SCAN_SPACE, ref keySpace, false);
            if (keyQ) SendKey(SCAN_Q, ref keyQ, false);
            if (keyF) SendKey(SCAN_F, ref keyF, false);
            if (keyE) SendKey(SCAN_E, ref keyE, false);
            if (keyCtrl) SendKey(SCAN_CTRL, ref keyCtrl, false);
            if (keyShift) SendKey(SCAN_SHIFT, ref keyShift, false);
            if (keyEsc) SendKey(SCAN_ESC, ref keyEsc, false);
            if (keyTab) SendKey(SCAN_TAB, ref keyTab, false);
            if (keyF3) SendKey(SCAN_F3, ref keyF3, false);
            if (keyF5) SendKey(SCAN_F5, ref keyF5, false);
            if (keyL) SendKey(SCAN_L, ref keyL, false);
            if (keyT) SendKey(SCAN_T, ref keyT, false);
            if (mouseLeft) SendMouseButton(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, ref mouseLeft, false);
            if (mouseRight) SendMouseButton(MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, ref mouseRight, false);
            lbPressed = false;
            rbPressed = false;
        }

        static bool InitXInput()
        {
            string[] dlls = new string[] { "xinput1_4.dll", "xinput1_3.dll", "xinput9_1_0.dll" };
            for (int i = 0; i < dlls.Length; i++)
            {
                try
                {
                    IntPtr hMod = LoadLibrary(dlls[i]);
                    if (hMod != IntPtr.Zero)
                    {
                        IntPtr pFunc = GetProcAddress(hMod, "XInputGetState");
                        if (pFunc != IntPtr.Zero)
                        {
                            XInputGetState = (XInputGetStateDelegate)Marshal.GetDelegateForFunctionPointer(pFunc, typeof(XInputGetStateDelegate));
                            Console.WriteLine("SHUBA_XINPUT_LOADED:" + dlls[i]);
                            return true;
                        }
                    }
                }
                catch { }
            }
            Console.WriteLine("SHUBA_XINPUT_ERROR:No XInput DLL found");
            return false;
        }

        static bool IsForegroundAcceptable(int targetPid)
        {
            IntPtr fgHwnd = GetForegroundWindow();
            if (fgHwnd == IntPtr.Zero) return false;

            uint fgPid = 0;
            GetWindowThreadProcessId(fgHwnd, out fgPid);

            if (targetPid > 0 && fgPid == (uint)targetPid) return true;

            StringBuilder sb = new StringBuilder(256);
            GetWindowText(fgHwnd, sb, 256);
            string title = sb.ToString();

            if (title.IndexOf("Minecraft", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("LWJGL", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("GLFW", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            try
            {
                Process p = Process.GetProcessById((int)fgPid);
                string pName = p.ProcessName.ToLower();
                if (pName.Contains("java") || pName.Contains("minecraft") || pName.Contains("shubacore"))
                {
                    return true;
                }
            }
            catch { }

            return targetPid == 0;
        }

        static void Main(string[] args)
        {
            Console.WriteLine("SHUBA_CONTROLLER_STARTED");
            bool xinputOk = InitXInput();
            if (!xinputOk)
            {
                Console.WriteLine("ERROR:XInput initialization failed");
                return;
            }

            int targetPid = 0;
            bool testMode = false;
            int testDurationSec = 0;

            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--test")
                {
                    testMode = true;
                    if (i + 1 < args.Length) int.TryParse(args[i + 1], out testDurationSec);
                    if (testDurationSec <= 0) testDurationSec = 5;
                }
                else
                {
                    int parsedPid = 0;
                    if (int.TryParse(args[i], out parsedPid) && parsedPid > 0)
                    {
                        targetPid = parsedPid;
                    }
                }
            }

            Console.WriteLine("SHUBA_CONTROLLER_READY:TargetPid=" + targetPid + ";TestMode=" + testMode);

            if (testMode)
            {
                Console.WriteLine("SHUBA_TEST_MODE_RUNNING:" + testDurationSec + "s");
                DateTime testEnd = DateTime.UtcNow.AddSeconds(testDurationSec);
                double angle = 0;
                while (DateTime.UtcNow < testEnd)
                {
                    int dx = (int)(Math.Cos(angle) * 8.0);
                    int dy = (int)(Math.Sin(angle) * 8.0);
                    mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
                    angle += 0.2;
                    Thread.Sleep(20);
                }
                Console.WriteLine("SHUBA_TEST_MODE_FINISHED");
                return;
            }

            // Background Stdin listener for graceful EXIT
            bool shouldExit = false;
            Thread stdinThread = new Thread(delegate() {
                try {
                    string line;
                    while ((line = Console.ReadLine()) != null) {
                        if (line.Trim().Equals("EXIT", StringComparison.OrdinalIgnoreCase)) {
                            shouldExit = true;
                            break;
                        }
                    }
                } catch { }
                // DO NOT set shouldExit = true here! Detached or EOF stdin must not terminate the controller!
            });
            stdinThread.IsBackground = true;
            stdinThread.Start();

            // Main 10ms polling loop
            XINPUT_STATE state = new XINPUT_STATE();
            int tickCounter = 0;
            int deadTargetCounter = 0;

            while (!shouldExit)
            {
                try
                {
                    // Check if target process died
                    if (targetPid > 0 && (++tickCounter % 100 == 0))
                    {
                        try
                        {
                            Process tp = Process.GetProcessById(targetPid);
                            if (tp.HasExited)
                            {
                                deadTargetCounter++;
                                if (deadTargetCounter >= 10) break;
                            }
                            else
                            {
                                deadTargetCounter = 0;
                            }
                        }
                        catch
                        {
                            deadTargetCounter++;
                            if (deadTargetCounter >= 10) break;
                        }
                    }

                    // Check window focus
                    bool isFocused = IsForegroundAcceptable(targetPid);
                    if (!isFocused)
                    {
                        ReleaseAll();
                        Thread.Sleep(20);
                        continue;
                    }

                    // Query controllers 0..3
                    bool foundActive = false;
                    for (int port = 0; port < 4; port++)
                    {
                        if (XInputGetState(port, ref state) == 0)
                        {
                            foundActive = true;

                            // Left Stick (WASD Hardware Scan Codes)
                            SendKey(SCAN_W, ref keyW, state.Gamepad.sThumbLY > 8000);
                            SendKey(SCAN_S, ref keyS, state.Gamepad.sThumbLY < -8000);
                            SendKey(SCAN_A, ref keyA, state.Gamepad.sThumbLX < -8000);
                            SendKey(SCAN_D, ref keyD, state.Gamepad.sThumbLX > 8000);

                            // Right Stick (Relative Mouse Movement for Camera)
                            short rx = state.Gamepad.sThumbRX;
                            short ry = state.Gamepad.sThumbRY;
                            if (Math.Abs(rx) > 6000 || Math.Abs(ry) > 6000)
                            {
                                int dx = (int)((rx / 32767.0) * 18.0);
                                int dy = (int)((-ry / 32767.0) * 18.0);
                                mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
                            }

                            // RT / LT -> Left Click / Right Click
                            SendMouseButton(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, ref mouseLeft, state.Gamepad.bRightTrigger > 30);
                            SendMouseButton(MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, ref mouseRight, state.Gamepad.bLeftTrigger > 30);

                            // LB / RB -> Mouse Wheel (Hotbar selection)
                            bool curLB = (state.Gamepad.wButtons & XINPUT_GAMEPAD_LEFT_SHOULDER) != 0;
                            if (curLB && !lbPressed) {
                                mouse_event(MOUSEEVENTF_WHEEL, 0, 0, 120, UIntPtr.Zero);
                            }
                            lbPressed = curLB;

                            bool curRB = (state.Gamepad.wButtons & XINPUT_GAMEPAD_RIGHT_SHOULDER) != 0;
                            if (curRB && !rbPressed) {
                                mouse_event(MOUSEEVENTF_WHEEL, 0, 0, unchecked((uint)-120), UIntPtr.Zero);
                            }
                            rbPressed = curRB;

                            // Face & Special Buttons
                            SendKey(SCAN_SPACE, ref keySpace, (state.Gamepad.wButtons & XINPUT_GAMEPAD_A) != 0);
                            SendKey(SCAN_Q, ref keyQ, (state.Gamepad.wButtons & XINPUT_GAMEPAD_B) != 0);
                            SendKey(SCAN_F, ref keyF, (state.Gamepad.wButtons & XINPUT_GAMEPAD_X) != 0);
                            SendKey(SCAN_E, ref keyE, (state.Gamepad.wButtons & XINPUT_GAMEPAD_Y) != 0);
                            SendKey(SCAN_CTRL, ref keyCtrl, (state.Gamepad.wButtons & XINPUT_GAMEPAD_LEFT_THUMB) != 0);
                            SendKey(SCAN_SHIFT, ref keyShift, (state.Gamepad.wButtons & XINPUT_GAMEPAD_RIGHT_THUMB) != 0);
                            SendKey(SCAN_ESC, ref keyEsc, (state.Gamepad.wButtons & XINPUT_GAMEPAD_START) != 0);
                            SendKey(SCAN_TAB, ref keyTab, (state.Gamepad.wButtons & XINPUT_GAMEPAD_BACK) != 0);
                            SendKey(SCAN_F3, ref keyF3, (state.Gamepad.wButtons & XINPUT_GAMEPAD_DPAD_UP) != 0);
                            SendKey(SCAN_F5, ref keyF5, (state.Gamepad.wButtons & XINPUT_GAMEPAD_DPAD_DOWN) != 0);
                            SendKey(SCAN_L, ref keyL, (state.Gamepad.wButtons & XINPUT_GAMEPAD_DPAD_LEFT) != 0);
                            SendKey(SCAN_T, ref keyT, (state.Gamepad.wButtons & XINPUT_GAMEPAD_DPAD_RIGHT) != 0);

                            break;
                        }
                    }

                    if (!foundActive)
                    {
                        ReleaseAll();
                    }
                }
                catch { }

                Thread.Sleep(10);
            }

            ReleaseAll();
            Console.WriteLine("SHUBA_CONTROLLER_STOPPED");
        }
    }
}
`;

class ControllerBridge extends EventEmitter {
  constructor() {
    super();
    this.workerProcess = null;
    this.isRunning = false;
    this.intentionalStop = false;
    this.currentInstanceDir = null;
    this.currentPid = 0;
  }

  getStatus() {
    return {
      running: this.isRunning,
      pid: this.workerProcess ? this.workerProcess.pid : null,
      targetPid: this.currentPid,
      instanceDir: this.currentInstanceDir
    };
  }

  _getRuntimeDir() {
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        return path.join(app.getPath('userData'), 'runtime');
      }
    } catch (_) {}
    let baseDir = null;
    try {
      const cfgMgr = getConfigManager();
      const sharedRoot = cfgMgr.get('storage.sharedRoot');
      if (sharedRoot && typeof sharedRoot === 'string') {
        baseDir = sharedRoot;
      }
    } catch (_) {}
    if (!baseDir) {
      baseDir = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), '.shubacore');
    }
    return path.join(baseDir, 'runtime');
  }

  /**
   * Compila ShubaController.cs a ShubaController.exe si no existe o ha cambiado
   * usando el compilador nativo csc.exe de Windows
   */
  ensureBinary() {
    if (process.platform !== 'win32') return null;

    const runtimeDir = this._getRuntimeDir();
    if (!fs.existsSync(runtimeDir)) {
      try { fs.mkdirSync(runtimeDir, { recursive: true }); } catch (_) {}
    }

    const csPath = path.join(runtimeDir, 'ShubaController.cs');
    const exePath = path.join(runtimeDir, 'ShubaController.exe');

    let needsCompile = !fs.existsSync(exePath);
    if (!needsCompile && fs.existsSync(csPath)) {
      try {
        const existingCode = fs.readFileSync(csPath, 'utf8');
        if (existingCode !== SHUBA_CONTROLLER_SOURCE) {
          needsCompile = true;
        }
      } catch (_) {
        needsCompile = true;
      }
    }

    if (!needsCompile) {
      return exePath;
    }

    fs.writeFileSync(csPath, SHUBA_CONTROLLER_SOURCE, 'utf8');
    logger.info(`[ControllerBridge] Guardado ShubaController.cs en: ${csPath}`);
    logger.info(`[ControllerBridge] Compilando ShubaController.exe nativo con csc.exe...`);

    const cscCandidates = [
      'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
      path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
      path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
    ];

    let cscPath = null;
    for (const c of cscCandidates) {
      if (fs.existsSync(c)) {
        cscPath = c;
        break;
      }
    }

    if (!cscPath) cscPath = 'csc.exe';

    try {
      const cmd = `"${cscPath}" /target:exe /optimize+ /out:"${exePath}" "${csPath}"`;
      const compileOut = execSync(cmd, { encoding: 'utf8', windowsHide: true });
      logger.info(`[ControllerBridge] ✅ ShubaController.exe compilado exitosamente en: ${exePath}`);
      if (compileOut && compileOut.trim()) {
        logger.debug(`[ControllerBridge csc]:\n${compileOut.trim()}`);
      }
      return exePath;
    } catch (compileErr) {
      logger.error(`[ControllerBridge] Error al compilar ShubaController.exe: ${compileErr.message}`);
      if (compileErr.stdout) logger.warn(`[ControllerBridge stdout]: ${compileErr.stdout}`);
      if (compileErr.stderr) logger.warn(`[ControllerBridge stderr]: ${compileErr.stderr}`);
      return null;
    }
  }

  /**
   * Inicia el ejecutable ShubaController.exe nativo
   */
  start(instanceDir = null, targetPid = 0) {
    if (this.isRunning && this.workerProcess) {
      this.currentInstanceDir = instanceDir;
      if (targetPid) this.currentPid = targetPid;
      return true;
    }

    if (process.platform !== 'win32') {
      logger.warn('[ControllerBridge] El puente nativo de mandos solo es compatible con Windows.');
      return false;
    }

    const exePath = this.ensureBinary();
    if (!exePath || !fs.existsSync(exePath)) {
      logger.error('[ControllerBridge] No se pudo obtener el ejecutable ShubaController.exe.');
      return false;
    }

    this.currentInstanceDir = instanceDir;
    this.currentPid = targetPid || 0;
    this.intentionalStop = false;

    try {
      logger.info(`[ControllerBridge] Ejecutando ShubaController.exe nativo (PID objetivo: ${this.currentPid})...`);

      const args = this.currentPid ? [String(this.currentPid)] : [];
      this.workerProcess = spawn(exePath, args, {
        windowsHide: true,
        stdio: 'ignore'
      });

      this.isRunning = true;
      this.emit('ready');

      if (this.workerProcess.stdout) {
        this.workerProcess.stdout.on('data', (data) => {
          const text = data.toString().trim();
          logger.info(`[ShubaController] ${text}`);
          if (text.includes('SHUBA_CONTROLLER_READY')) {
            this.emit('ready');
          }
        });
      }

      if (this.workerProcess.stderr) {
        this.workerProcess.stderr.on('data', (data) => {
          const errText = data.toString().trim();
          if (errText) logger.warn(`[ShubaController stderr] ${errText}`);
        });
      }

      this.workerProcess.on('exit', (code) => {
        logger.info(`[ControllerBridge] ShubaController.exe finalizado con código: ${code}`);
        const wasRunning = this.isRunning;
        const savedInstanceDir = this.currentInstanceDir;
        const savedTargetPid = this.currentPid;
        this.isRunning = false;
        this.workerProcess = null;
        this.emit('stopped');

        // Si el juego sigue activo y no fue un cierre intencional, reiniciar el controlador en 500ms
        if (!this.intentionalStop && wasRunning && savedTargetPid > 0) {
          let isTargetAlive = false;
          try {
            process.kill(savedTargetPid, 0);
            isTargetAlive = true;
          } catch (_) {
            isTargetAlive = false;
          }

          if (isTargetAlive) {
            logger.warn(`[ControllerBridge] ShubaController.exe terminó inesperadamente pero el proceso de Minecraft (PID: ${savedTargetPid}) continúa activo. Reiniciando puente en 500ms...`);
            setTimeout(() => {
              if (!this.intentionalStop && !this.isRunning) {
                this.start(savedInstanceDir, savedTargetPid);
              }
            }, 500);
          }
        }
      });

      this.workerProcess.on('error', (err) => {
        logger.error(`[ControllerBridge] Error al ejecutar ShubaController.exe: ${err.message}`);
        this.stop();
      });

      return true;
    } catch (err) {
      logger.error(`[ControllerBridge] Fallo al iniciar ShubaController: ${err.message}`);
      this.isRunning = false;
      this.workerProcess = null;
      return false;
    }
  }

  updateInstance(instanceDir, targetPid = 0) {
    this.currentInstanceDir = instanceDir;
    if (targetPid) this.currentPid = targetPid;
    return true;
  }

  sendGamepadFrame() {
    return true;
  }

  /**
   * Ejecuta una prueba de inyección (movimiento de cursor y pulsación de controles)
   */
  async testInjection(durationMs = 5000) {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Solo compatible con Windows.' };
    }

    const exePath = this.ensureBinary();
    if (!exePath || !fs.existsSync(exePath)) {
      return { success: false, error: 'No se pudo compilar ShubaController.exe.' };
    }

    const durationSec = Math.max(1, Math.round(durationMs / 1000));
    logger.info(`[ControllerBridge] Ejecutando inyección de prueba (${durationSec} seg)...`);

    try {
      const testProc = spawn(exePath, ['--test', String(durationSec)], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      testProc.stdout.on('data', (d) => {
        logger.info(`[ShubaController Test] ${d.toString().trim()}`);
      });

      return {
        success: true,
        message: `Inyección de prueba de ${durationSec}s ejecutada con ShubaController.exe nativo.`
      };
    } catch (err) {
      logger.warn(`[ControllerBridge] Error al ejecutar test de inyección: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Detiene el proceso nativo ShubaController.exe
   */
  stop() {
    this.intentionalStop = true;
    if (!this.isRunning && !this.workerProcess) return;

    logger.info('[ControllerBridge] Deteniendo ShubaController.exe nativo...');
    try {
      if (this.workerProcess && !this.workerProcess.killed && this.workerProcess.stdin && this.workerProcess.stdin.writable) {
        this.workerProcess.stdin.write('EXIT\n', () => {});
      }
    } catch (_) {}

    const proc = this.workerProcess;
    try {
      if (proc && !proc.killed) {
        proc.kill();
      }
    } catch (_) {}

    this.isRunning = false;
    this.workerProcess = null;
    this.emit('stopped');
  }
}

let controllerBridgeInstance = null;
function getControllerBridge() {
  if (!controllerBridgeInstance) {
    controllerBridgeInstance = new ControllerBridge();
  }
  return controllerBridgeInstance;
}

module.exports = {
  ControllerBridge,
  getControllerBridge
};
