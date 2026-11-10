' Open the standalone UniCanvas window.
' Starts the local server if needed, then opens a dedicated app-mode browser window
' (Chrome first, Edge fallback). No console window is shown.

Option Explicit

Dim fso, shell, base, nodeExe, serverJs, url, browser, profileDir, haveServer

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

base = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = base & "\node.exe"
' Prefer the Node runtime that ships with DeepSeek Harness: unlike a copied binary it
' is not blocked from writing user folders, which file write-back needs.
Dim dshNode
dshNode = shell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
If fso.FileExists(dshNode) Then
  nodeExe = dshNode
ElseIf shell.ExpandEnvironmentStrings("%DSH_DESKTOP_NODE_EXECUTABLE%") <> "%DSH_DESKTOP_NODE_EXECUTABLE%" Then
  If fso.FileExists(shell.ExpandEnvironmentStrings("%DSH_DESKTOP_NODE_EXECUTABLE%")) Then nodeExe = shell.ExpandEnvironmentStrings("%DSH_DESKTOP_NODE_EXECUTABLE%")
End If
serverJs = base & "\server.mjs"
url = "http://127.0.0.1:47822/"
profileDir = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\InfiniteCanvas\browser"

haveServer = False
On Error Resume Next
Dim http
Set http = CreateObject("MSXML2.XMLHTTP")
http.Open "GET", url, False
http.Send
If Err.Number = 0 And http.Status = 200 Then haveServer = True
Err.Clear
On Error GoTo 0

If Not haveServer Then
  shell.CurrentDirectory = base
  shell.Run """" & nodeExe & """ """ & serverJs & """", 0, False
  WScript.Sleep 900
End If

browser = ""
If fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
  browser = "C:\Program Files\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") Then
  browser = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists("C:\Program Files\Microsoft\Edge\Application\msedge.exe") Then
  browser = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") Then
  browser = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
End If

If browser = "" Then
  ' No Chromium browser: fall back to the default browser tab.
  shell.Run url, 1, False
Else
  Dim args
  args = "--app=" & url & " --window-size=1500,940 --window-position=90,60 --user-data-dir=""" & profileDir & """ --no-first-run --no-default-browser-check"
  shell.Run """" & browser & """ " & args, 1, False
End If
