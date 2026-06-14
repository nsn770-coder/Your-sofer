$root = "C:\Users\Owner\Downloads\projects\Your-sofer"
$files = Get-ChildItem -Path $root -Recurse -Include "*.ts","*.tsx" |
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.next*" }
$changed = 0
foreach ($f in $files) {
    $txt = [System.IO.File]::ReadAllText($f.FullName)
    if ($txt.Contains("972584877770")) {
        $txt2 = $txt.Replace("972584877770","972587479933")
        [System.IO.File]::WriteAllText($f.FullName, $txt2)
        Write-Host ("Updated: " + $f.Name)
        $changed++
    }
}
Write-Host "Done -- $changed files updated"

# Pass 2: displayed WhatsApp text 058-487-7770 -> 058-747-9933
$changed2 = 0
foreach ($f in $files) {
    $txt = [System.IO.File]::ReadAllText($f.FullName)
    if ($txt.Contains("058-487-7770")) {
        $txt2 = $txt.Replace("058-487-7770","058-747-9933")
        [System.IO.File]::WriteAllText($f.FullName, $txt2)
        Write-Host ("Display updated: " + $f.Name)
        $changed2++
    }
}
Write-Host "Done display -- $changed2 files updated"
