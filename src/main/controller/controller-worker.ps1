param(
    [string]$ConfigJson = ""
)

$ErrorActionPreference = "SilentlyContinue"

# Código C# de alto rendimiento con Win32 user32 y XInput
$csharpCode = @"
using System;
using System.Text;
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

    public static int GetXInputState(int userIndex, out XINPUT_STATE state) {
        try { return XInputGetState14(userIndex, out state); } catch {}
        try { return XInputGetState13(userIndex, out state); } catch {}
        try { return XInputGetState91(userIndex, out state); } catch {}
        state = new XINPUT_STATE();
        return -1;
    }

    public static string GetActiveWindowTitle() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return "";
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(hwnd, sb, 256);
        return sb.ToString();
    }

    public static uint GetActiveProcessId() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return 0;
        uint pid = 0;
        GetWindowThreadProcessId(hwnd, out pid);
        return pid;
    }

    public static void SendKeyDown(byte vk) {
        keybd_event(vk, 0, 0, UIntPtr.Zero);
    }

    public static void SendKeyUp(byte vk) {
        keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void SendMouseMove(int dx, int dy) {
        mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
    }

    public static void SendMouseLeftDown() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
    }

    public static void SendMouseLeftUp() {
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
    }

    public static void SendMouseRightDown() {
        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
    }

    public static void SendMouseRightUp() {
        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
    }

    public static void SendMouseWheel(int delta) {
        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)delta, UIntPtr.Zero);
    }
}
"@

Add-Type -TypeDefinition $csharpCode -Language CSharp

# Diccionario de Virtual Key Codes de Minecraft
$VK_MAP = @{
    "Space" = [byte]0x20
    "Shift" = [byte]0x10
    "Control" = [byte]0x11
    "E" = [byte]0x45
    "Q" = [byte]0x51
    "F" = [byte]0x46
    "T" = [byte]0x54
    "Escape" = [byte]0x1B
    "Tab" = [byte]0x09
    "F5" = [byte]0x74
    "F3" = [byte]0x72
    "L" = [byte]0x4C
    "C" = [byte]0x43
    "W" = [byte]0x57
    "A" = [byte]0x41
    "S" = [byte]0x53
    "D" = [byte]0x44
}

# Estado interno
$script:Deadzone = 0.15
$script:SensitivityX = 2.5
$script:SensitivityY = 2.5
$script:InvertY = $false
$script:TargetPid = 0
$script:ButtonBindings = @{}
$script:PressedKeys = [System.Collections.Generic.HashSet[byte]]::new()
$script:IsLeftMouseDown = $false
$script:IsRightMouseDown = $false
$script:LastWheelLb = $false
$script:LastWheelRb = $false

function ApplyConfig([string]$jsonStr) {
    try {
        if (-not $jsonStr) { return }
        $cfg = $jsonStr | ConvertFrom-Json
        if ($cfg.deadzone) { $script:Deadzone = [double]$cfg.deadzone }
        if ($cfg.sensitivityX) { $script:SensitivityX = [double]$cfg.sensitivityX }
        if ($cfg.sensitivityY) { $script:SensitivityY = [double]$cfg.sensitivityY }
        if ($cfg.invertY -ne $null) { $script:InvertY = [bool]$cfg.invertY }
        if ($cfg.targetPid) { $script:TargetPid = [uint32]$cfg.targetPid }
        if ($cfg.buttons) {
            $script:ButtonBindings = @{}
            foreach ($prop in $cfg.buttons.PSObject.Properties) {
                $btnIdx = $prop.Name
                $action = $prop.Value.action
                $key = $prop.Value.key
                $script:ButtonBindings[$btnIdx] = @{ action = $action; key = $key }
            }
        }
    } catch {}
}

if ($ConfigJson) {
    ApplyConfig $ConfigJson
}

function IsMinecraftFocused() {
    $title = [ShubaNativeBridge]::GetActiveWindowTitle()
    if ($title -match "Minecraft" -or $title -match "LWJGL" -or $title -match "GLFW" -or $title -match "Badlion" -or $title -match "Lunar") {
        return $true
    }
    if ($script:TargetPid -gt 0) {
        $activePid = [ShubaNativeBridge]::GetActiveProcessId()
        if ($activePid -eq $script:TargetPid) {
            return $true
        }
    }
    return $false
}

function ReleaseAll() {
    foreach ($vk in $script:PressedKeys) {
        [ShubaNativeBridge]::SendKeyUp($vk)
    }
    $script:PressedKeys.Clear()

    if ($script:IsLeftMouseDown) {
        [ShubaNativeBridge]::SendMouseLeftUp()
        $script:IsLeftMouseDown = $false
    }
    if ($script:IsRightMouseDown) {
        [ShubaNativeBridge]::SendMouseRightUp()
        $script:IsRightMouseDown = $false
    }
}

function SetKey([byte]$vk, [bool]$down) {
    if ($down) {
        if (-not $script:PressedKeys.Contains($vk)) {
            [ShubaNativeBridge]::SendKeyDown($vk)
            $null = $script:PressedKeys.Add($vk)
        }
    } else {
        if ($script:PressedKeys.Contains($vk)) {
            [ShubaNativeBridge]::SendKeyUp($vk)
            $null = $script:PressedKeys.Remove($vk)
        }
    }
}

function ProcessAction([string]$action, [string]$keyStr, [bool]$pressed) {
    if ($action -eq "attack") {
        if ($pressed -and -not $script:IsLeftMouseDown) {
            [ShubaNativeBridge]::SendMouseLeftDown()
            $script:IsLeftMouseDown = $true
        } elseif (-not $pressed -and $script:IsLeftMouseDown) {
            [ShubaNativeBridge]::SendMouseLeftUp()
            $script:IsLeftMouseDown = $false
        }
        return
    }

    if ($action -eq "use") {
        if ($pressed -and -not $script:IsRightMouseDown) {
            [ShubaNativeBridge]::SendMouseRightDown()
            $script:IsRightMouseDown = $true
        } elseif (-not $pressed -and $script:IsRightMouseDown) {
            [ShubaNativeBridge]::SendMouseRightUp()
            $script:IsRightMouseDown = $false
        }
        return
    }

    if ($action -eq "prev_item") {
        if ($pressed) {
            [ShubaNativeBridge]::SendMouseWheel(120)
        }
        return
    }

    if ($action -eq "next_item") {
        if ($pressed) {
            [ShubaNativeBridge]::SendMouseWheel(-120)
        }
        return
    }

    # Asignación por teclado
    $vk = $null
    if ($keyStr -and $VK_MAP.ContainsKey($keyStr)) {
        $vk = $VK_MAP[$keyStr]
    } elseif ($action -eq "jump") {
        $vk = $VK_MAP["Space"]
    } elseif ($action -eq "inventory") {
        $vk = $VK_MAP["E"]
    } elseif ($action -eq "sneak") {
        $vk = $VK_MAP["Shift"]
    } elseif ($action -eq "sprint") {
        $vk = $VK_MAP["Control"]
    } elseif ($action -eq "drop") {
        $vk = $VK_MAP["Q"]
    } elseif ($action -eq "swap_hand") {
        $vk = $VK_MAP["F"]
    } elseif ($action -eq "chat") {
        $vk = $VK_MAP["T"]
    } elseif ($action -eq "pause") {
        $vk = $VK_MAP["Escape"]
    } elseif ($action -eq "player_list") {
        $vk = $VK_MAP["Tab"]
    } elseif ($action -eq "f5") {
        $vk = $VK_MAP["F5"]
    } elseif ($action -eq "f3") {
        $vk = $VK_MAP["F3"]
    }

    if ($vk -ne $null) {
        SetKey $vk $pressed
    }
}

function ProcessInputFrame([double]$lx, [double]$ly, [double]$rx, [double]$ry, [double]$lt, [double]$rt, [bool[]]$buttons) {
    if (-not (IsMinecraftFocused)) {
        ReleaseAll
        return
    }

    # 1. Movimiento con Stick Izquierdo (WASD)
    $w = ($ly -gt $script:Deadzone)
    $s = ($ly -lt -$script:Deadzone)
    $a = ($lx -lt -$script:Deadzone)
    $d = ($lx -gt $script:Deadzone)

    SetKey $VK_MAP["W"] $w
    SetKey $VK_MAP["S"] $s
    SetKey $VK_MAP["A"] $a
    SetKey $VK_MAP["D"] $d

    # 2. Control de Cámara con Stick Derecho (mouse_event relativo)
    $absRx = [Math]::Abs($rx)
    $absRy = [Math]::Abs($ry)

    if ($absRx -gt $script:Deadzone -or $absRy -gt $script:Deadzone) {
        $dx = [int]($rx * $script:SensitivityX * 12.0)
        $factorY = if ($script:InvertY) { 1.0 } else { -1.0 }
        $dy = [int]($ry * $script:SensitivityY * 12.0 * $factorY)

        if ($dx -ne 0 -or $dy -ne 0) {
            [ShubaNativeBridge]::SendMouseMove $dx $dy
        }
    }

    # 3. Gatillos LT / RT
    $ltPressed = ($lt -gt 0.25)
    $rtPressed = ($rt -gt 0.25)
    ProcessAction "use" "Mouse2" $ltPressed
    ProcessAction "attack" "Mouse1" $rtPressed

    # 4. Botones
    for ($i = 0; $i -lt $buttons.Length; $i++) {
        # Omitir 6 (LT) y 7 (RT) que ya se procesaron
        if ($i -eq 6 -or $i -eq 7) { continue }

        $btnStr = "$i"
        $binding = $script:ButtonBindings[$btnStr]
        if ($binding) {
            ProcessAction $binding.action $binding.key $buttons[$i]
        }
    }
}

Write-Host "SHUBA_CONTROLLER_READY"

$state = New-Object ShubaNativeBridge+XINPUT_STATE
$running = $true

while ($running) {
    # 1. Comprobar comandos desde stdin (no bloqueante si hay datos)
    while ([Console]::KeyAvailable) {
        $line = [Console]::ReadLine()
        if (-not $line) { continue }

        if ($line -eq "PING") {
            Write-Host "PONG"
        } elseif ($line -eq "EXIT") {
            $running = $false
            break
        } elseif ($line.StartsWith("CONFIG:")) {
            ApplyConfig $line.Substring(7)
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

                ProcessInputFrame $lx $ly $rx $ry $lt $rt $boolBtns
            } catch {}
        }
    }

    if (-not $running) { break }

    # 2. Comprobar XInput nativo a 60Hz
    $xRes = [ShubaNativeBridge]::GetXInputState(0, [ref]$state)
    if ($xRes -eq 0) {
        # Mando XInput conectado
        $gp = $state.Gamepad
        $lx = [double]$gp.sThumbLX / 32767.0
        $ly = [double]$gp.sThumbLY / 32767.0
        $rx = [double]$gp.sThumbRX / 32767.0
        $ry = [double]$gp.sThumbRY / 32767.0
        $lt = [double]$gp.bLeftTrigger / 255.0
        $rt = [double]$gp.bRightTrigger / 255.0

        # Mapear botones XInput estándar a índices 0..15
        $wBtns = $gp.wButtons
        $bA = ($wBtns -band 0x1000) -ne 0       # 0: A
        $bB = ($wBtns -band 0x2000) -ne 0       # 1: B
        $bX = ($wBtns -band 0x4000) -ne 0       # 2: X
        $bY = ($wBtns -band 0x8000) -ne 0       # 3: Y
        $bLB = ($wBtns -band 0x0100) -ne 0      # 4: LB
        $bRB = ($wBtns -band 0x0200) -ne 0      # 5: RB
        $bSelect = ($wBtns -band 0x0020) -ne 0  # 8: Back
        $bStart = ($wBtns -band 0x0010) -ne 0   # 9: Start
        $bLS = ($wBtns -band 0x0040) -ne 0      # 10: LS
        $bRS = ($wBtns -band 0x0080) -ne 0      # 11: RS
        $dUp = ($wBtns -band 0x0001) -ne 0      # 12: DPad Up
        $dDown = ($wBtns -band 0x0002) -ne 0    # 13: DPad Down
        $dLeft = ($wBtns -band 0x0004) -ne 0    # 14: DPad Left
        $dRight = ($wBtns -band 0x0008) -ne 0   # 15: DPad Right

        $buttonsArray = @($bA, $bB, $bX, $bY, $bLB, $bRB, ($lt -gt 0.25), ($rt -gt 0.25), $bSelect, $bStart, $bLS, $bRS, $dUp, $dDown, $dLeft, $dRight)

        ProcessInputFrame $lx $ly $rx $ry $lt $rt $buttonsArray
    }

    [System.Threading.Thread]::Sleep(16)
}

ReleaseAll
