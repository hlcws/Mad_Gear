# Global score hotkeys for decks that can only send key presses (started by server.mjs).
# Prints one action name per line when a hotkey is pressed, anywhere in Windows.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MadGearHotkeys {
  [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr hWnd, int id, uint mods, uint vk);
  [DllImport("user32.dll")] static extern int GetMessage(out MSG msg, IntPtr hWnd, uint min, uint max);
  [StructLayout(LayoutKind.Sequential)] struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int x; public int y; }
  public static void Run(string[] actions) {
    const uint MODS = 0x1 | 0x2 | 0x4 | 0x4000; // Alt + Ctrl + Shift, no auto-repeat
    for (int i = 0; i < actions.Length; i++) {
      // Ctrl+Alt+Shift+1, +2, ... (number row)
      if (!RegisterHotKey(IntPtr.Zero, i, MODS, (uint)(0x31 + i))) Console.WriteLine("taken:" + actions[i]);
    }
    // Quit when the server goes away (its pipe to our stdin closes), so hotkeys never stay taken
    new System.Threading.Thread(() => { while (Console.In.Read() != -1) {} Environment.Exit(0); }) { IsBackground = true }.Start();
    Console.WriteLine("ready");
    MSG msg;
    while (GetMessage(out msg, IntPtr.Zero, 0, 0) > 0) {
      if (msg.message == 0x0312) Console.WriteLine(actions[(int)msg.wParam]); // WM_HOTKEY
    }
  }
}
'@
[MadGearHotkeys]::Run($args)
