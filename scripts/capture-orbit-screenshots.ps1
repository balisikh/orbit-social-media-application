param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$OutDir,

  [int]$Width = 1440,
  [int]$Height = 900
)

$ErrorActionPreference = "Stop"

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  throw "Chrome not found at $chrome"
}

$resolved = Resolve-Path -LiteralPath $OutDir -ErrorAction SilentlyContinue
if ($resolved) {
  $OutDir = $resolved.Path
} else {
  $OutDir = Join-Path (Get-Location) $OutDir
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Shot($path, $name) {
  $url = $BaseUrl.TrimEnd("/") + $path
  $out = Join-Path $OutDir $name
  & $chrome `
    --headless=new `
    --disable-gpu `
    --hide-scrollbars `
    --window-size="$Width,$Height" `
    --screenshot="$out" `
    "$url" | Out-Null
  if (-not (Test-Path $out)) { throw "Screenshot not created: $out" }
}

# Core app pages (unauthenticated)
Shot "/" "home.png"
Shot "/auth/login" "auth-login.png"
Shot "/auth/signup" "auth-signup.png"
Shot "/feed" "feed.png"
Shot "/reels" "reels.png"
Shot "/messages" "messages.png"
Shot "/me" "me.png"

Write-Output "Saved screenshots to $OutDir"

