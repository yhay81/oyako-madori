[CmdletBinding()]
param([Parameter(Mandatory)][ValidatePattern("^https://")][string]$BaseUrl)
$ErrorActionPreference = "Stop"
$PublicDirectory = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "public"
$NormalizedBaseUrl = $BaseUrl.TrimEnd("/")
$KeyFiles = @(Get-ChildItem -LiteralPath $PublicDirectory -File | Where-Object { $_.Name -match "^[a-zA-Z0-9-]{8,128}\.txt$" })
if ($KeyFiles.Count -ne 1) { throw "Expected exactly one IndexNow key" }
$Key = (Get-Content -Raw $KeyFiles[0].FullName).Trim()
if ($Key -ne $KeyFiles[0].BaseName) { throw "IndexNow key mismatch" }
$KeyLocation = "$NormalizedBaseUrl/$Key.txt"
$KeyResponse = Invoke-WebRequest -Uri $KeyLocation -SkipHttpErrorCheck -TimeoutSec 30
if ($KeyResponse.StatusCode -ne 200 -or $KeyResponse.Content.Trim() -ne $Key) { throw "Published key mismatch" }
$SitemapResponse = Invoke-WebRequest -Uri "$NormalizedBaseUrl/sitemap.xml" -SkipHttpErrorCheck -TimeoutSec 30
[xml]$Sitemap = $SitemapResponse.Content
$Urls = @($Sitemap.urlset.url.loc | ForEach-Object { [string]$_ })
$Payload = @{ host = ([uri]$NormalizedBaseUrl).Host; key = $Key; keyLocation = $KeyLocation; urlList = $Urls } | ConvertTo-Json -Depth 3
$Response = Invoke-WebRequest -Uri "https://api.indexnow.org/indexnow" -Method Post -ContentType "application/json; charset=utf-8" -Body $Payload -SkipHttpErrorCheck -TimeoutSec 30
if ($Response.StatusCode -notin @(200, 202)) { throw "IndexNow HTTP $($Response.StatusCode)" }
[ordered]@{ submitted_at = (Get-Date).ToUniversalTime().ToString("o"); service = ([uri]$NormalizedBaseUrl).Host; status = [int]$Response.StatusCode; url_count = $Urls.Count; urls = $Urls } | ConvertTo-Json -Depth 3
