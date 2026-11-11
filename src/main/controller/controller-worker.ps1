param(
    [string]$ConfigJson = "",
    [string]$MapPath = "",
    [uint32]$TargetPid = 0,
    [uint32]$LauncherPid = 0
)

$ErrorActionPreference = "SilentlyContinue"

# Motor de Mando Nativo C# (XInput a 10ms + Hardware Scan Codes + mouse_event Win32)
$csharpCode = @"
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class ShubaNativeBridge {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern uint MapVirtualKey(uint uCode, uint uMapType);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    // Flags para mouse_event
    public const uint MOUSEEVENTF_MOVE = 0x0001;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_WHEEL = 0x0800;

    // Flags para keybd_event (Hardware Scan Codes para GLFW/Minecraft)
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const uint KEYEVENTF_SCANCODE = 0x0008;

    // XInput structs y funciones
    [StructLayout(LayoutKind.Sequential)]
    public struct XINPUT_GAMEPAD {
        public ushort wButtons;
        public byte bLeftTrigger;
        public byte bRightTrigger;
        public short sThumbLX;
        public short sThumbLY;
        public short sThumbRX;
        public short sThumbRY;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct XINPUT_STATE {
        public uint dwPacketNumber;
        public XINPUT_GAMEPAD Gamepad;
    }

    [DllImport("xinput1_4.dll", EntryPoint = "XInputGetState")]
    private static extern int XInputGetState14(int dwUserIndex, out XINPUT_STATE pState);

    [DllImport("xinput1_3.dll", EntryPoint = "XInputGetState")]
    private static extern int XInputGetState13(int dwUserIndex, out XINPUT_STATE pState);

    [DllImport("xinput9_1_0.dll", EntryPoint = "XInputGetState")]
    private static extern int XInputGetState91(int dwUserIndex, out XINPUT_STATE pState);

    private static int _activeXinputDll = 0; // 0=auto, 14=1_4, 13=1_3, 91=9_1_0, -1=failed

    public static int GetXInputState(int userIndex, out XINPUT_STATE state) {
        state = new XINPUT_STATE();
        if (_activeXinputDll == 14 || _activeXinputDll == 0) {
            try {
                int r = XInputGetState14(userIndex, out state);
                _activeXinputDll = 14;
                return r;
            } catch { if (_activeXinputDll == 14) _activeXinputDll = 0; }
        }
        if (_activeXinputDll == 13 || _activeXinputDll == 0) {
            try {
                int r = XInputGetState13(userIndex, out state);
                _activeXinputDll = 13;
                return r;
            } catch { if (_activeXinputDll == 13) _activeXinputDll = 0; }
        }
        if (_activeXinputDll == 91 || _activeXinputDll == 0) {
            try {
                int r = XInputGetState91(userIndex, out state);
                _activeXinputDll = 91;
                return r;
            } catch { if (_activeXinputDll == 91) _activeXinputDll = -1; }
        }
        return -1;
    }

    // Configuración activa
    public static uint TargetPid = 0;
    public static uint LauncherPid = 0;
    public static double Deadzone = 0.15;
    public static double SensitivityX = 2.5;
    public static double SensitivityY = 2.5;
    public static bool InvertY = false;
    public static volatile bool Running = true;
    public static volatile bool TestInjectionActive = false;

    // Tabla de Virtual Keys y Hardware Scan Codes exactos para Minecraft (GLFW)
    public static readonly Dictionary<string, byte> VK_MAP = new Dictionary<string, byte>(StringComparer.OrdinalIgnoreCase) {
        { "Space", 0x20 },
        { "Shift", 0xA0 }, // Left Shift
        { "Control", 0xA2 }, // Left Control
        { "E", 0x45 },
        { "Q", 0x51 },
        { "F", 0x46 },
        { "T", 0x54 },
        { "Escape", 0x1B },
        { "Tab", 0x09 },
        { "F5", 0x74 },
        { "F3", 0x72 },
        { "L", 0x4C },
        { "C", 0x43 },
        { "W", 0x57 },
        { "A", 0x41 },
        { "S", 0x53 },
        { "D", 0x44 }
    };

    public static readonly Dictionary<byte, byte> HARDWARE_SCAN_CODES = new Dictionary<byte, byte> {
        { 0x57, 0x11 }, // W -> 0x11
        { 0x41, 0x1E }, // A -> 0x1E
        { 0x53, 0x1F }, // S -> 0x1F
        { 0x44, 0x20 }, // D -> 0x20
        { 0x20, 0x39 }, // Espacio -> 0x39
        { 0xA0, 0x2A }, // Shift Izq -> 0x2A
        { 0x10, 0x2A }, // Shift genérico -> 0x2A
        { 0xA2, 0x1D }, // Ctrl Izq -> 0x1D
        { 0x11, 0x1D }, // Ctrl genérico -> 0x1D
        { 0x45, 0x12 }, // E -> 0x12
        { 0x51, 0x10 }, // Q -> 0x10
        { 0x46, 0x21 }, // F -> 0x21
        { 0x1B, 0x01 }, // Escape -> 0x01
        { 0x09, 0x0F }, // Tab -> 0x0F
        { 0x54, 0x14 }, // T -> 0x14
        { 0x74, 0x3F }, // F5 -> 0x3F
        { 0x72, 0x3D }, // F3 -> 0x3D
        { 0x4C, 0x26 }, // L -> 0x26
        { 0x43, 0x2E }  // C -> 0x2E
    };

    public static byte GetScanCode(byte vk) {
        if (HARDWARE_SCAN_CODES.ContainsKey(vk)) {
            return HARDWARE_SCAN_CODES[vk];
        }
        uint sc = MapVirtualKey((uint)vk, 0);
        return (byte)(sc & 0xFF);
    }

    public class ActionBinding {
        public string Action;
        public string Key;
        public byte Vk;
        public byte ScanCode;
    }

    public static Dictionary<int, ActionBinding> ButtonMap = new Dictionary<int, ActionBinding>();

    private static HashSet<byte> _pressedKeys = new HashSet<byte>();
    private static bool _isLeftMouseDown = false;
    private static bool _isRightMouseDown = false;
    private static bool _lastWheelLb = false;
    private static bool _lastWheelRb = false;

    static ShubaNativeBridge() {
        InitDefaultBindings();
    }

    public static void InitDefaultBindings() {
        SetButtonBinding(0, "jump", "Space");
        SetButtonBinding(1, "drop", "Q");
        SetButtonBinding(2, "swap_hand", "F");
        SetButtonBinding(3, "inventory", "E");
        SetButtonBinding(4, "prev_item", "WheelUp");
        SetButtonBinding(5, "next_item", "WheelDown");
        SetButtonBinding(6, "use", "Mouse2");
        SetButtonBinding(7, "attack", "Mouse1");
        SetButtonBinding(8, "player_list", "Tab");
        SetButtonBinding(9, "pause", "Escape");
        SetButtonBinding(10, "sprint", "Control");
        SetButtonBinding(11, "sneak", "Shift");
        SetButtonBinding(12, "chat", "T");
        SetButtonBinding(13, "f5", "F5");
        SetButtonBinding(14, "f3", "F3");
        SetButtonBinding(15, "advancements", "L");
    }

    public static void SetButtonBinding(int index, string action, string key) {
        byte vk = 0;
        if (!string.IsNullOrEmpty(key) && VK_MAP.ContainsKey(key)) {
            vk = VK_MAP[key];
        }
        byte scan = (vk != 0) ? GetScanCode(vk) : (byte)0;
        ButtonMap[index] = new ActionBinding { Action = action ?? "", Key = key ?? "", Vk = vk, ScanCode = scan };
    }

    public static bool IsMinecraftFocused() {
        if (TestInjectionActive) return true;

        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return false;

        uint fgPid = 0;
        GetWindowThreadProcessId(hwnd, out fgPid);

        // Si es el proceso exacto
        if (TargetPid > 0 && fgPid == TargetPid) return true;

        // Verificar por título de ventana activa
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(hwnd, sb, 256);
        string title = sb.ToString();

        if (title.IndexOf("Minecraft", StringComparison.OrdinalIgnoreCase) >= 0 ||
            title.IndexOf("LWJGL", StringComparison.OrdinalIgnoreCase) >= 0 ||
            title.IndexOf("GLFW", StringComparison.OrdinalIgnoreCase) >= 0 ||
            title.IndexOf("Badlion", StringComparison.OrdinalIgnoreCase) >= 0 ||
            title.IndexOf("Lunar", StringComparison.OrdinalIgnoreCase) >= 0) {
            return true;
        }

        // Si pertenece a javaw.exe / java.exe
        if (fgPid > 0) {
            try {
                using (Process p = Process.GetProcessById((int)fgPid)) {
                    string pName = p.ProcessName.ToLower();
                    if (pName.Contains("java") || pName.Contains("minecraft")) {
                        return true;
                    }
                }
            } catch {}
        }

        // Condición flexible: Si la ventana activa NO es el launcher de ShubaCore
        if (LauncherPid > 0 && fgPid == LauncherPid) {
            return false;
        }
        if (title.IndexOf("ShubaCore", StringComparison.OrdinalIgnoreCase) >= 0) {
            return false;
        }

        // Si hay una instancia corriendo y el usuario está en otra ventana que no sea el launcher
        return (TargetPid > 0);
    }

    public static void ReleaseAll() {
        foreach (byte vk in _pressedKeys) {
            byte scan = GetScanCode(vk);
            keybd_event(vk, scan, KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, UIntPtr.Zero);
        }
        _pressedKeys.Clear();

        if (_isLeftMouseDown) {
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
            _isLeftMouseDown = false;
        }
        if (_isRightMouseDown) {
            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
            _isRightMouseDown = false;
        }
    }

    public static void SetKey(byte vk, bool down) {
        if (vk == 0) return;
        byte scan = GetScanCode(vk);
        if (down) {
            if (!_pressedKeys.Contains(vk)) {
                keybd_event(vk, scan, KEYEVENTF_SCANCODE, UIntPtr.Zero);
                _pressedKeys.Add(vk);
            }
        } else {
            if (_pressedKeys.Contains(vk)) {
                keybd_event(vk, scan, KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, UIntPtr.Zero);
                _pressedKeys.Remove(vk);
            }
        }
    }

    public static void ProcessAction(string action, string keyStr, bool pressed) {
        if (action == "attack") {
            if (pressed && !_isLeftMouseDown) {
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                _isLeftMouseDown = true;
            } else if (!pressed && _isLeftMouseDown) {
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                _isLeftMouseDown = false;
            }
            return;
        }

        if (action == "use") {
            if (pressed && !_isRightMouseDown) {
                mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
                _isRightMouseDown = true;
            } else if (!pressed && _isRightMouseDown) {
                mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
                _isRightMouseDown = false;
            }
            return;
        }

        if (action == "prev_item") {
            if (pressed && !_lastWheelLb) {
                mouse_event(MOUSEEVENTF_WHEEL, 0, 0, 120, UIntPtr.Zero);
            }
            _lastWheelLb = pressed;
            return;
        }

        if (action == "next_item") {
            if (pressed && !_lastWheelRb) {
                mouse_event(MOUSEEVENTF_WHEEL, 0, 0, unchecked((uint)-120), UIntPtr.Zero);
            }
            _lastWheelRb = pressed;
            return;
        }

        byte vk = 0;
        if (!string.IsNullOrEmpty(keyStr) && VK_MAP.ContainsKey(keyStr)) {
            vk = VK_MAP[keyStr];
        } else if (action == "jump") vk = 0x20;
        else if (action == "inventory") vk = 0x45;
        else if (action == "sneak") vk = 0xA0;
        else if (action == "sprint") vk = 0xA2;
        else if (action == "drop") vk = 0x51;
        else if (action == "swap_hand") vk = 0x46;
        else if (action == "chat") vk = 0x54;
        else if (action == "pause") vk = 0x1B;
        else if (action == "player_list") vk = 0x09;
        else if (action == "f5") vk = 0x74;
        else if (action == "f3") vk = 0x72;
        else if (action == "zoom") vk = 0x43;

        if (vk != 0) {
            SetKey(vk, pressed);
        }
    }

    public static void ProcessFrame(double lx, double ly, double rx, double ry, double lt, double rt, bool[] buttons) {
        if (!IsMinecraftFocused()) {
            ReleaseAll();
            return;
        }

        // 1. Movimiento Stick Izquierdo (WASD con Hardware Scan Codes)
        SetKey(VK_MAP["W"], ly > Deadzone);
        SetKey(VK_MAP["S"], ly < -Deadzone);
        SetKey(VK_MAP["A"], lx < -Deadzone);
        SetKey(VK_MAP["D"], lx > Deadzone);

        // 2. Control de Cámara Stick Derecho (mouse_event MOUSEEVENTF_MOVE con sensibilidad x18.0)
        double absRx = Math.Abs(rx);
        double absRy = Math.Abs(ry);
        if (absRx > Deadzone || absRy > Deadzone) {
            double sensX = (SensitivityX > 0) ? SensitivityX : 2.5;
            double sensY = (SensitivityY > 0) ? SensitivityY : 2.5;
            int dx = (int)(rx * sensX * 18.0);
            double factorY = InvertY ? 1.0 : -1.0;
            int dy = (int)(ry * sensY * 18.0 * factorY);
            if (dx != 0 || dy != 0) {
                mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
            }
        }

        // 3. Gatillos LT / RT
        bool ltPressed = (lt > 0.25);
        bool rtPressed = (rt > 0.25);
        ProcessAction("use", "Mouse2", ltPressed);
        ProcessAction("attack", "Mouse1", rtPressed);

        // 4. Botones
        for (int i = 0; i < buttons.Length; i++) {
            if (i == 6 || i == 7) continue; // Ya procesados por LT/RT
            if (ButtonMap.ContainsKey(i)) {
                ActionBinding b = ButtonMap[i];
                ProcessAction(b.Action, b.Key, buttons[i]);
            }
        }
    }

    public static void Tick() {
        if (!IsMinecraftFocused()) {
            ReleaseAll();
            return;
        }

        // 1. Leer XInput directamente del sistema operativo (Slots 0 a 3)
        XINPUT_STATE state = new XINPUT_STATE();
        bool found = false;
        for (int i = 0; i < 4; i++) {
            if (GetXInputState(i, out state) == 0) {
                found = true;
                break;
            }
        }

        if (!found) {
            return;
        }

        XINPUT_GAMEPAD gp = state.Gamepad;
        double lx = (double)gp.sThumbLX / 32767.0;
        double ly = (double)gp.sThumbLY / 32767.0;
        double rx = (double)gp.sThumbRX / 32767.0;
        double ry = (double)gp.sThumbRY / 32767.0;
        double lt = (double)gp.bLeftTrigger / 255.0;
        double rt = (double)gp.bRightTrigger / 255.0;

        ushort w = gp.wButtons;
        bool bA = (w & 0x1000) != 0;       // 0: A
        bool bB = (w & 0x2000) != 0;       // 1: B
        bool bX = (w & 0x4000) != 0;       // 2: X
        bool bY = (w & 0x8000) != 0;       // 3: Y
        bool bLB = (w & 0x0100) != 0;      // 4: LB
        bool bRB = (w & 0x0200) != 0;      // 5: RB
        bool bSelect = (w & 0x0020) != 0;  // 8: Back
        bool bStart = (w & 0x0010) != 0;   // 9: Start
        bool bLS = (w & 0x0040) != 0;      // 10: LS
        bool bRS = (w & 0x0080) != 0;      // 11: RS
        bool dUp = (w & 0x0001) != 0;      // 12: DPad Up
        bool dDown = (w & 0x0002) != 0;    // 13: DPad Down
        bool dLeft = (w & 0x0004) != 0;    // 14: DPad Left
        bool dRight = (w & 0x0008) != 0;   // 15: DPad Right

        bool[] btns = new bool[] {
            bA, bB, bX, bY, bLB, bRB, (lt > 0.25), (rt > 0.25),
            bSelect, bStart, bLS, bRS, dUp, dDown, dLeft, dRight
        };

        ProcessFrame(lx, ly, rx, ry, lt, rt, btns);
    }

    public static void RunLoop() {
        while (Running) {
            try {
                Tick();
            } catch {}
            Thread.Sleep(10); // Loop nativo cada 10ms (100Hz)
        }
        ReleaseAll();
    }

    public static void ExecuteTestInjection(int durationMs) {
        Thread t = new Thread(() => {
            TestInjectionActive = true;
            int elapsed = 0;
            double angle = 0.0;
            byte spaceScan = GetScanCode(0x20);

            while (elapsed < durationMs && Running) {
                // Mover cursor suavemente en un círculo
                int dx = (int)(Math.Cos(angle) * 12.0);
                int dy = (int)(Math.Sin(angle) * 12.0);
                mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
                angle += 0.2;

                // Pulsar y soltar Espacio cada 1.2 segundos
                if (elapsed % 1200 < 60) {
                    keybd_event(0x20, spaceScan, KEYEVENTF_SCANCODE, UIntPtr.Zero);
                    Thread.Sleep(40);
                    keybd_event(0x20, spaceScan, KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, UIntPtr.Zero);
                    elapsed += 40;
                }

                Thread.Sleep(20);
                elapsed += 20;
            }

            keybd_event(0x20, spaceScan, KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, UIntPtr.Zero);
            TestInjectionActive = false;
        });
        t.IsBackground = true;
        t.Start();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -Language CSharp

function ParseAndApplyConfig([string]$jsonStr) {
    if (-not $jsonStr) { return }
    try {
        $cfg = $jsonStr | ConvertFrom-Json
        if ($cfg.deadzone) { [ShubaNativeBridge]::Deadzone = [double]$cfg.deadzone }
        if ($cfg.sensitivityX) { [ShubaNativeBridge]::SensitivityX = [double]$cfg.sensitivityX }
        if ($cfg.sensitivityY) { [ShubaNativeBridge]::SensitivityY = [double]$cfg.sensitivityY }
        if ($cfg.invertY -ne $null) { [ShubaNativeBridge]::InvertY = [bool]$cfg.invertY }
        if ($cfg.targetPid) { [ShubaNativeBridge]::TargetPid = [uint32]$cfg.targetPid }
        if ($cfg.launcherPid) { [ShubaNativeBridge]::LauncherPid = [uint32]$cfg.launcherPid }
        if ($cfg.buttons) {
            foreach ($prop in $cfg.buttons.PSObject.Properties) {
                $idx = [int]$prop.Name
                $act = [string]$prop.Value.action
                $key = [string]$prop.Value.key
                [ShubaNativeBridge]::SetButtonBinding($idx, $act, $key)
            }
        }
    } catch {}
}

if ($TargetPid -gt 0) {
    [ShubaNativeBridge]::TargetPid = [uint32]$TargetPid
}
if ($LauncherPid -gt 0) {
    [ShubaNativeBridge]::LauncherPid = [uint32]$LauncherPid
}

if ($ConfigJson) {
    ParseAndApplyConfig $ConfigJson
}

if ($MapPath -and (Test-Path $MapPath)) {
    try {
        $mapContent = Get-Content -Path $MapPath -Raw
        ParseAndApplyConfig $mapContent
    } catch {}
}

# Hilo en segundo plano para procesar comandos stdin (CONFIG, PID, FRAME e INYECCION DE PRUEBA)
$stdinThread = [System.Threading.Thread]::new([System.Threading.ThreadStart]{
    try {
        while ([ShubaNativeBridge]::Running) {
            $line = [Console]::In.ReadLine()
            if ($line -eq $null) {
                [System.Threading.Thread]::Sleep(100)
                continue
            }
            $line = $line.Trim()
            if ($line -eq "EXIT") {
                [ShubaNativeBridge]::Running = $false
                break
            } elseif ($line.StartsWith("PID:")) {
                $pStr = $line.Substring(4).Trim()
                $p = 0
                if ([uint32]::TryParse($pStr, [ref]$p)) {
                    [ShubaNativeBridge]::TargetPid = $p
                }
            } elseif ($line.StartsWith("TEST_INJECTION:")) {
                $dStr = $line.Substring(15).Trim()
                $d = 5000
                if ([int]::TryParse($dStr, [ref]$d)) {
                    [ShubaNativeBridge]::ExecuteTestInjection($d)
                }
            } elseif ($line.StartsWith("CONFIG:")) {
                ParseAndApplyConfig $line.Substring(7)
            } elseif ($line.StartsWith("FRAME:")) {
                try {
                    $f = $line.Substring(6) | ConvertFrom-Json
                    $axes = $f.axes
                    $btns = $f.buttons
                    $lx = if ($axes.Count -gt 0) { [double]$axes[0] } else { 0.0 }
                    $ly = if ($axes.Count -gt 1) { -[double]$axes[1] } else { 0.0 }
                    $rx = if ($axes.Count -gt 2) { [double]$axes[2] } else { 0.0 }
                    $ry = if ($axes.Count -gt 3) { -[double]$axes[3] } else { 0.0 }
                    $lt = if ($btns.Count -gt 6) { [double]$btns[6] } else { 0.0 }
                    $rt = if ($btns.Count -gt 7) { [double]$btns[7] } else { 0.0 }

                    $boolBtns = @()
                    for ($b = 0; $b -lt $btns.Count; $b++) {
                        $boolBtns += ([double]$btns[$b] -gt 0.3)
                    }

                    [ShubaNativeBridge]::ProcessFrame($lx, $ly, $rx, $ry, $lt, $rt, $boolBtns)
                } catch {}
            }
        }
    } catch {}
})
$stdinThread.IsBackground = $true
$stdinThread.Start()

Write-Host "SHUBA_CONTROLLER_READY"

# Ejecutar bucle nativo C# a 10ms
[ShubaNativeBridge]::RunLoop()
