# Fix-Emoji.ps1  -- repair double-mojibaked emoji/arrows in index.html
# Run from C:\temp\ikandysite:
#   git checkout HEAD -- index.html      (start from known-good)
#   powershell -ExecutionPolicy Bypass -File Fix-Emoji.ps1
#
# All search/replace strings are built from codepoints and cast to [string],
# so every call uses Replace(string,string) -- no overload errors, no paste corruption.

$ErrorActionPreference = 'Stop'
$path = Join-Path (Get-Location) 'index.html'
$html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

function R([string]$from, [string]$to) {
    $script:html = $script:html.Replace($from, $to)
}

# --- helper to build a string from codepoints ---
function S([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }

# broken sequence (codepoints from the diagnostic)  ->  intended glyph
R (S 0x2013,0x00B6)            (S 0x25B6)             # –¶  -> ▶  play
R (S 0x2020,0x201C)            (S 0xD83D,0xDCE5)      # †“  -> 📥 download
R (S 0x2020,0x2019)            (S 0x2192)             # †’  -> →  right arrow
R (S 0x2020,0x2014)            (S 0x2197)             # †—  -> ↗  link-out
R (S 0x02DC,0x2022)            (S 0x2615)             # ˜•  -> ☕ coffee
R (S 0x00F0,0x0178,0x201C)     (S 0xD83D,0xDCD6)      # ðŸ“ -> 📖 book (User Guide)
R (S 0x00F0,0x0178,0x017D,0x00B5) (S 0xD83C,0xDFB5)   # ðŸŽµ -> 🎵 music
R (S 0x00F0,0x0178,0x017D,0x00A7) (S 0xD83C,0xDFA7)   # ðŸŽ§ -> 🎧 headphone
R (S 0x00F0,0x0178,0x201C,0x00BA) (S 0xD83D,0xDCFA)   # ðŸ“º -> 📺 tv
R (S 0x00F0,0x0178,0x017D,0x2122) (S 0xD83C,0xDF99)   # ðŸŽ™ -> 🎙 mic
R (S 0x00F0,0x0178,0x017D,0x00AF) (S 0xD83C,0xDFAF)   # ðŸŽ¯ -> 🎯 target
R (S 0x2014,0x008F)            (S 0x2014)             # —<8f> -> —  drop stray
R (S 0x008F)                   ''                     # any remaining stray 8F

[System.IO.File]::WriteAllText($path, $html, (New-Object System.Text.UTF8Encoding($true)))

# report any leftover suspicious lead chars
$left = ([regex]::Matches($html, "[\u2020\u00F0\u02DC\u2013\u008F]")).Count
Write-Host "written. leftover suspicious chars: $left"
if ($left -gt 0) {
  Write-Host "Lines still containing them:"
  ($html -split "`n") | Select-String -Pattern "[\u2020\u00F0\u02DC\u2013\u008F]" |
    Select-Object -First 30 | ForEach-Object { $_.Line.Trim() }
}
