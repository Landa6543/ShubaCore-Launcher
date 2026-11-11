param(
    [string]$ConfigJson = "",
    [string]$MapPath = "",
    [uint32]$TargetPid = 0
)

$ErrorActionPreference = "SilentlyContinue"

# Motor de Mando Nativo C# (XInput a 10ms + Win32 SendInput / mouse_event)
$csharpCode = @"
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class ShubaNativeBridge {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

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
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;

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
    public static double Deadzone = 0.15;
    public static double SensitivityX = 2.5;
    public static double SensitivityY = 2.5;
    public static bool InvertY = false;
    public static volatile bool Running = true;

    // Diccionario de Virtual Key Codes
    public static readonly Dictionary<string, byte> VK_MAP = new Dictionary<string, byte>(StringComparer.OrdinalIgnoreCase) {
        { "Space", 0x20 },
        { "Shift", 0x10 },
        { "Control", 0x11 },
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

    public class ActionBinding {
        public string Action;
        public string Key;
        public byte Vk;
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
        ButtonMap[0] = new ActionBinding { Action = "jump", Key = "Space", Vk = 0x20 };
        ButtonMap[1] = new ActionBinding { Action = "drop", Key = "Q", Vk = 0x51 };
        ButtonMap[2] = new ActionBinding { Action = "swap_hand", Key = "F", Vk = 0x46 };
        ButtonMap[3] = new ActionBinding { Action = "inventory", Key = "E", Vk = 0x45 };
        ButtonMap[4] = new ActionBinding { Action = "prev_item", Key = "WheelUp", Vk = 0 };
        ButtonMap[5] = new ActionBinding { Action = "next_item", Key = "WheelDown", Vk = 0 };
        ButtonMap[6] = new ActionBinding { Action = "use", Key = "Mouse2", Vk = 0 };
        ButtonMap[7] = new ActionBinding { Action = "attack", Key = "Mouse1", Vk = 0 };
        ButtonMap[8] = new ActionBinding { Action = "player_list", Key = "Tab", Vk = 0x09 };
        ButtonMap[9] = new ActionBinding { Action = "pause", Key = "Escape", Vk = 0x1B };
        ButtonMap[10] = new ActionBinding { Action = "sprint", Key = "Control", Vk = 0x11 };
        ButtonMap[11] = new ActionBinding { Action = "sneak", Key = "Shift", Vk = 0x10 };
        ButtonMap[12] = new ActionBinding { Action = "chat", Key = "T", Vk = 0x54 };
        ButtonMap[13] = new ActionBinding { Action = "f5", Key = "F5", Vk = 0x74 };
        ButtonMap[14] = new ActionBinding { Action = "f3", Key = "F3", Vk = 0x72 };
        ButtonMap[15] = new ActionBinding { Action = "advancements", Key = "L", Vk = 0x4C };
    }

    public static void SetButtonBinding(int index, string action, string key) {
        byte vk = 0;
        if (!string.IsNullOrEmpty(key) && VK_MAP.ContainsKey(key)) {
            vk = VK_MAP[key];
        }
        ButtonMap[index] = new ActionBinding { Action = action ?? "", Key = key ?? "", Vk = vk };
    }

    public static bool IsMinecraftFocused() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return false;

        if (TargetPid > 0) {
            uint activePid = 0;
            GetWindowThreadProcessId(hwnd, out activePid);
            if (activePid == TargetPid) return true;
        }

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
        return false;
    }

    public static void ReleaseAll() {
        foreach (byte vk in _pressedKeys) {
            keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
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
        if (down) {
            if (!_pressedKeys.Contains(vk)) {
                keybd_event(vk, 0, 0, UIntPtr.Zero);
                _pressedKeys.Add(vk);
            }
        } else {
            if (_pressedKeys.Contains(vk)) {
                keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
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
        else if (action == "sneak") vk = 0x10;
        else if (action == "sprint") vk = 0x11;
        else if (action == "drop") vk = 0x51;
        else if (action == "swap_hand") vk = 0x46;
        else if (action == "chat") vk = 0x54;
        else if (action == "pause") vk = 0x1B;
        else if (action == "player_list") vk = 0x09;
        else if (action == "f5") vk = 0x74;
        else if (action == "f3") vk = 0x72;

        if (vk != 0) {
            SetKey(vk, pressed);
        }
    }

    public static void ProcessFrame(double lx, double ly, double rx, double ry, double lt, double rt, bool[] buttons) {
        if (!IsMinecraftFocused()) {
            ReleaseAll();
            return;
        }

        // 1. Movimiento Stick Izquierdo (WASD)
        SetKey(VK_MAP["W"], ly > Deadzone);
        SetKey(VK_MAP["S"], ly < -Deadzone);
        SetKey(VK_MAP["A"], lx < -Deadzone);
        SetKey(VK_MAP["D"], lx > Deadzone);

        // 2. Control de Cámara Stick Derecho
        double absRx = Math.Abs(rx);
        double absRy = Math.Abs(ry);
        if (absRx > Deadzone || absRy > Deadzone) {
            int dx = (int)(rx * SensitivityX * 12.0);
            double factorY = InvertY ? 1.0 : -1.0;
            int dy = (int)(ry * SensitivityY * 12.0 * factorY);
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

        // Leer XInput directamente del sistema operativo (Slots 0 a 3)
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

if ($ConfigJson) {
    ParseAndApplyConfig $ConfigJson
}

if ($MapPath -and (Test-Path $MapPath)) {
    try {
        $mapContent = Get-Content -Path $MapPath -Raw
        ParseAndApplyConfig $mapContent
    } catch {}
}

# Hilo en segundo plano para leer comandos stdin sin romper la consola redirigida
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
            } elseif ($line.StartsWith("CONFIG:")) {
                ParseAndApplyConfig $line.Substring(7)
            }
        }
    } catch {}
})
$stdinThread.IsBackground = $true
$stdinThread.Start()

Write-Host "SHUBA_CONTROLLER_READY"

# Ejecutar bucle nativo C# a 10ms
[ShubaNativeBridge]::RunLoop()
