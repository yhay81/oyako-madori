[CmdletBinding()]
param([switch]$Local)
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content (Join-Path $PSScriptRoot "product-metrics.sql")) -join " "
$Output = & $Wrangler d1 execute oyako-madori $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) { throw "D1 metrics query failed" }
$Row = ((($Output -join [Environment]::NewLine) | ConvertFrom-Json)[0]).results[0]
function Get-Percent([int]$Numerator, [int]$Denominator) {
    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}
$Visitors = [int]$Row.visitors
$Viewers = [int]$Row.viewers
$SourceUsers = [int]$Row.source_users
[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "oyako-madori"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        visitors = $Visitors; searchers = [int]$Row.searchers; viewers = $Viewers
        source_users = $SourceUsers; favorite_users = [int]$Row.favorite_users
        comparers = [int]$Row.comparers; returned = [int]$Row.returned
    }
    depth = [ordered]@{
        rooms_with_three_viewers = [int]$Row.rooms_with_three_viewers
        rooms_with_two_source_users = [int]$Row.rooms_with_two_source_users
        rooms_with_two_favorites = [int]$Row.rooms_with_two_favorites
        qualified_rooms = [int]$Row.qualified_rooms
    }
    rates = [ordered]@{
        search_to_view_percent = Get-Percent $Viewers ([int]$Row.searchers)
        view_to_source_percent = Get-Percent $SourceUsers $Viewers
        favorite_percent = Get-Percent ([int]$Row.favorite_users) $Viewers
    }
} | ConvertTo-Json -Depth 4
