[CmdletBinding()]
param()
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Required = @(
    ".github\workflows\ci.yml","DECISIONS.md","EXPERIMENT.md","METRICS.md","PRIVACY.md","README.md",
    "SECURITY.md","STACK.md","migrations\0001_product_events.sql","ops\product-metrics.ps1","ops\product-metrics.sql",
    "ops\submit-indexnow.ps1","public\common.js","public\compare.js","public\directory.js","public\home.js",
    "public\room.js","public\favicon.png","public\manifest.webmanifest","public\og.png","public\robots.txt",
    "public\styles.css","public\sw.js","src\worker.tsx","test\worker.test.ts"
)
foreach ($Path in $Required) { if (-not (Test-Path (Join-Path $Root $Path))) { throw "Missing $Path" } }
$Worker = Get-Content -Raw (Join-Path $Root "src\worker.tsx")
$Scripts = (Get-Content -Raw (Join-Path $Root "public\*.js")) -join "`n"
$Styles = Get-Content -Raw (Join-Path $Root "public\styles.css")
$Migration = Get-Content -Raw (Join-Path $Root "migrations\0001_product_events.sql")
foreach ($Marker in @('class="floor-plan"','class="room nursing-room"','class="stroller-route"','class="room-card"','class="detail-plan"')) {
    if (-not $Worker.Contains($Marker)) { throw "Missing visual $Marker" }
}
if (($Worker + $Scripts) -match '(?i)public validation|success criteria|experiment|仮説|成功条件|市場スコア|収益性|innerHTML|eval\(|new Function') { throw "Unsafe or meta product copy" }
if (($Worker + $Scripts) -match '(?i)\son[a-z]+\s*=') { throw "Inline event handler" }
if (($Worker + $Scripts) -match '(?i)navigator\.geolocation|watchPosition|getCurrentPosition') { throw "Location access is not allowed" }
if ($Styles -match '(?i)(linear|radial|conic)-gradient' -or -not $Styles.Contains("clamp(1.75rem, 3.2vw, 2rem)") -or -not $Styles.Contains("@media print")) { throw "Visual contract" }
foreach ($Needle in @("120 * 86400000","45 * 86400","sessionPattern","isExactObject","content-type","content-length","WHERE is_qa = 0")) {
    if (-not ($Worker + (Get-Content -Raw (Join-Path $Root "ops\product-metrics.sql"))).Contains($Needle)) { throw "Missing boundary $Needle" }
}
if ($Worker -match '(?i)better-auth|betterAuth' -or $Worker.Contains("'unsafe-inline'") -or $Worker -match 'style=\{') { throw "Authentication or CSP contract" }
if (-not $Migration.Contains("CREATE TABLE product_events")) { throw "Missing metrics table" }
foreach ($Event in @("visited","directory_searched","room_opened","source_opened","favorite_added","favorite_removed","compare_opened","returned")) {
    if (-not $Migration.Contains("'$Event'") -or -not $Worker.Contains("`"$Event`"")) { throw "Missing event $Event" }
}
if (([regex]::Matches($Worker,'id: "[a-z0-9-]+"')).Count -ne 7) { throw "Expected seven curated rooms" }
if ((Get-Item (Join-Path $Root "public\og.png")).Length -lt 50000) { throw "Missing social card" }
$Keys = @(Get-ChildItem (Join-Path $Root "public") -File | Where-Object { $_.Name -match "^[a-zA-Z0-9-]{8,128}\.txt$" })
if ($Keys.Count -ne 1 -or (Get-Content -Raw $Keys[0].FullName).Trim() -ne $Keys[0].BaseName) { throw "IndexNow key contract" }
Write-Output "Product release contract is satisfied"
