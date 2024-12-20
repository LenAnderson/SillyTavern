param (
	[switch] $SkipUpdate,
	[string] $STPath
)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# =======================================================================
# __Requirements__
# Requires PowerShell 7 (Windows 10/11 comes with PowerShell 5.1)
# Check with the following in a PowerShell or CMD window:
#    > pwsh -Version
# PowerShell 7 can be installed (alongside PowerShell 5.1) with winget
#    > winget install Microsoft.Powershell
#
#
# __Execution__
# You can use a shortcut to run the script with a simple double-click.
# The shortcut should point at:
#    pwsh -File .\LennySuite.ps1
#
#
# __Parameters__
# - Add "-SkipUpdate" to skip checking for new extensions and plugins.
# - Add "-STPath C:\My\Path\To\SillyTavern" when you don't keep the
#   file inside SillyTavern's root directory.
#
# Example:
#    pwsh -File .\LennySuite.ps1 -SkipUpdate -STPath .\SillyTavern
# =======================================================================

# -----------------------------------------------------------------------
# Add the user directory names you want to update here
# -----------------------------------------------------------------------
$userDirs = (
	"lennysuite",
	"other-user",
	"" # add all your users above this line
)
# -----------------------------------------------------------------------
# Add the extension names here
# -----------------------------------------------------------------------
$extensions = (
	# "SillyTavern-AssetRepoManager",
	# "SillyTavern-AutoFocus",
	# "SillyTavern-BackupsBrowser",
	# "SillyTavern-ChangeMessageName",
	# "SillyTavern-CharSwitch",
	# "SillyTavern-ChatChat",
	# "SillyTavern-Codex",
	# "SillyTavern-ComfyUI",
	# "SillyTavern-CssSnippets",
	# "SillyTavern-CustomCodeLanguages",
	# "SillyTavern-CustomTitle",
	# "SillyTavern-DiscordHomeLink",
	# "SillyTavern-EvilSlashCommand",
	# "SillyTavern-Export-HTML",
	# "SillyTavern-ExternalEditor",
	# "SillyTavern-Favicon",
	# "SillyTavern-FileExplorer",
	# "SillyTavern-GetContext",
	# "SillyTavern-GroupExpressions",
	# "SillyTavern-InputHistory",
	# "SillyTavern-LALib",
	# "SillyTavern-LandingPage",
	# "SillyTavern-LocalStorageHelper",
	# "SillyTavern-LogoutButton",
	# "SillyTavern-Lore-Variables",
	# "SillyTavern-MessageActions",
	# "SillyTavern-MessageInteractivity",
	# "SillyTavern-MessageVariables",
	# "SillyTavern-MoreFlexibleContinues",
	# "SillyTavern-NavigateChat",
	# "SillyTavern-Packager",
	# "SillyTavern-ParallaxBackgrounds",
	# "SillyTavern-PluginManager",
	# "SillyTavern-QuickBranchSwitch",
	# "SillyTavern-QuickReplyManager",
	# "SillyTavern-RegexSlash",
	# "SillyTavern-STAHP-Extension",
	# "SillyTavern-SwipeCombiner",
	# "SillyTavern-Tooltips",
	# "SillyTavern-TriggerCards",
	# "SillyTavern-UserSettingsTest",
	# "SillyTavern-UserSwipes",
	# "SillyTavern-Variable-Viewer",
	# "SillyTavern-VideoBackgrounds",
	# "SillyTavern-Wizard",
	# "SillyTavern-WordFrequency",
	# "SillyTavern-WorldInfoPresets",
	# "SillyTavern-CustomModels",
	# "SillyTavern-ExtensionManager",
	# "SillyTavern-Keyboard",
	# "SillyTavern-Mistake",
	# "SillyTavern-SendButton",
	# "SillyTavern-StreamRegex",
	# "SillyTavern-TravelScreen",
	# "SillyTavern-WhereIsMyManEatingMonster",
	# "SillyTavern-WorldInfoDrawer",
	# "SillyTavern-WorldInfoInfo",
	# "SillyTavern-WorldInfoSwitch",
	"" # keep only this last line if you don't want to update extensions
)
# -----------------------------------------------------------------------
# Add the server plugin names here
# -----------------------------------------------------------------------
$plugins = (
	# "SillyTavern-Content",
	# "SillyTavern-Costumes",
	# "SillyTavern-Files",
	# "SillyTavern-Path",
	# "SillyTavern-PluginManagerPlugin",
	# "SillyTavern-Process",
	# "SillyTavern-STAHP",
	# "SillyTavern-QuickBranchSwitchPlugin",
	"" # keep only this last line if you don't want to update plugins
)




# #######################################################################
# #######################################################################




# check if git is installed, warn and exit if not
try {
	git --version | Out-Null
}
catch {
	Write-Host -BackgroundColor DarkRed -ForegroundColor White -NoNewline "Git is not installed on this system. Skipping update."
	Write-Host ""
	Write-Host -BackgroundColor DarkRed -ForegroundColor White -NoNewline "If you installed with a zip file, you will need to download the new zip and intall manually."
	Write-Host "`n"
	Read-Host -Prompt "Press ENTER key to exit"
	Exit
}
Write-Host -ForegroundColor Green "Git found"

# set base dir to location of this script file (not where you run it from)
if ($STPath -eq "") {
	$baseDir = Split-Path -Path $PSCommandPath -Parent
} else {
	$baseDir = $STPath
}
$baseDir = Resolve-Path -Path $baseDir
Write-Host -ForegroundColor DarkGray "Base dir: $($baseDir)"

# check that the path exists and is a directory, exit on fail
if (!(Test-Path -Path $baseDir -PathType Container)) {
	Write-Host -BackgroundColor DarkRed -ForegroundColor White -NoNewline "Provided path is not a directory."
	Write-Host ""
	Write-Host -BackgroundColor DarkRed -ForegroundColor White -NoNewline $baseDir
	Write-Host "`n"
	Read-Host -Prompt "Press ENTER key to exit"
	Exit
}

Push-Location $baseDir

if ($SkipUpdate) {
	Write-Host "`nSkipping script update"
} else {
	Write-Host "`n-----"
	Write-Host -BackgroundColor DarkMagenta -ForegroundColor White -NoNewline "checking for new extensions and plugins"
	Write-Host ""
	# read contents of current LennySuite.ps1 to get list of known extensions
	# and known server plugins
	$lines = [System.Collections.ArrayList]@()
	$knownExtensions = [System.Collections.ArrayList]@()
	$knownPlugins = [System.Collections.ArrayList]@()
	$inExtensionArray = $false
	$inPluginArray = $false
	$extensionStart = 0
	$pluginStart = 0
	$i = 0
	foreach ($line in Get-Content $PSCommandPath) {
		$i = $i + 1
		$lines.Add($line) | Out-Null
		if ($inExtensionArray) {
			if ($line -eq ")") {
				$inExtensionArray = $false
			} else {
				$knownExtensions.Add(($line -replace '^\s*(?:#\s*)?["'']([^"'']+)["''],?.*$', '$1')) | Out-Null
			}
		} elseif ($inPluginArray) {
			if ($line -eq ")") {
				$inPluginArray = $false
			} else {
				$knownPlugins.Add(($line -replace '^\s*(?:#\s*)?["'']([^"'']+)["''],?.*$', '$1')) | Out-Null
			}

		} elseif ($line -eq '$extensions = (') {
			$inExtensionArray = $true
			$extensionStart = $i
		} elseif ($line -eq '$plugins = (') {
			$inPluginArray = $true
			$pluginStart = $i
		}
	}

	# fetch repositories from github and grab new / unknown extensions and
	# server plugins
	$newExtensions = [System.Collections.ArrayList]@()
	$newPlugins = [System.Collections.ArrayList]@()
	for ($i = 1; $i; $i++) {
		Write-Host -ForegroundColor DarkGray "fetching repositories..."
		$get = ConvertFrom-Json (
			(Invoke-WebRequest -Headers @{'Accept-Encoding' = "gzip" } -Body @{
				page = $i
				per_page = 100
			} "https://api.github.com/users/LenAnderson/repos").Content
		)
		Write-Host -ForegroundColor DarkGray "  checking repositories..."
		foreach($repo in $get) {
			if ($knownExtensions.Contains($repo.name)) { continue }
			if ($knownPlugins.Contains($repo.name)) { continue }
			if ($repo.name.StartsWith('SillyTavern-')) {
				$status = (Invoke-WebRequest -SkipHttpErrorCheck -Method Head "https://github.com/LenAnderson/$($repo.name)/raw/$($repo.default_branch)/manifest.json").StatusCode
				if ($status -eq 200) {
					$newExtensions.Add($repo.name) | Out-Null
				} else {
					$newPlugins.Add($repo.name) | Out-Null
				}
			}
		}
		if ( $get.Count -ne 100 ) { break }
	}

	# get max string length from new extensions and plugins for alignment
	$maxlen = (
		($newExtensions | Measure-Object -Maximum -Property Length).Maximum,
		($newPlugins | Measure-Object -Maximum -Property Length).Maximum | Measure-Object -Maximum
	).Maximum
	$maxlen++

	# add new extenions and server plugins to lines array
	$offset = 0
	$hasUpdates = $false
	if ($newExtensions.Count -gt 0) {
		$hasUpdates = $true
		Write-Host "`nadding new extensions ($($newExtensions.Count)):"
		foreach ($e in $newExtensions) {
			Write-Host -BackgroundColor Blue -ForegroundColor White -NoNewline "$($e.PadRight($maxlen, " "))"
			Write-Host ""
			$i = $extensionStart + $knownExtensions.Count - 1 + $offset
			$lines.Insert($i, "`t# `"$($e)`",") | Out-Null
			$offset++
		}
	} else {
		Write-Host "`nno new extensions"
	}
	if ($newPlugins.Count -gt 0) {
		$hasUpdates = $true
		Write-Host "`nadding new plugins ($($newPlugins.Count)):"
		foreach ($p in $newPlugins) {
			Write-Host -BackgroundColor Blue -ForegroundColor White -NoNewline "$($p.PadRight($maxlen, " "))"
			Write-Host ""
			$i = $pluginStart + $knownPlugins.Count - 1 + $offset
			$lines.Insert($i, "`t# `"$($p)`",") | Out-Null
			$offset++
		}
	} else {
		Write-Host "`nno new plugins"
	}

	# write updated LennySuite.ps1
	if ($hasUpdates) {
		Write-Host "`nwriting to LennySuite.ps1"
		$lines | Out-File -FilePath $PSCommandPath -Encoding utf8
		# Write-Host "`nrerunning LennySuite.ps1"
		# $cmd = "pwsh -File `"$($PSCommandPath)`" -SkipUpdate -Path `"$($baseDir)`""
		# Invoke-Expression -Command $cmd
		# Exit
	}
}

# get max string length from extensions and plugins for alignment
$maxlen = (
	($extensions | Measure-Object -Maximum -Property Length).Maximum,
	($plugins | Measure-Object -Maximum -Property Length).Maximum | Measure-Object -Maximum
).Maximum
$maxlen++

# the first iteration of the user loop will be used to collect the repos that need updates
$firstUser = $true
$updates = [System.Collections.ArrayList]@()
foreach ($ud in $userDirs) {
	if ($ud -eq "") {
		continue
	}
	Write-Host "`n-----"
	Write-Host -BackgroundColor DarkMagenta -ForegroundColor White -NoNewline "user: $($ud)"
	Write-Host ""
	$dir = Join-Path $baseDir "data" $ud "extensions"

	# only check the extensions in $updates...
	$list = $updates
	if ($firstUser) {
		# unless this is the first iteration, then check all extensions
		$list = $extensions
	}
	foreach ($e in $list) {
		if ($e -eq "") {
			continue
		}
		$ed = Join-Path $dir $e
		# check if the extension's directory exists
		if (Test-Path $ed) {
			# check if the extension's directory is a git repo
			if (Test-Path (Join-Path $ed ".git")) {
				Set-Location $ed
				# fetch to get current data
				git fetch | Out-Null
				# count the number of commits we are behind
				$changes = git rev-list HEAD..origin/master --count
				if ([int]$changes -gt 0) {
					# if more than 0 commits behind, we need to update
					Write-Host -BackgroundColor Cyan -ForegroundColor Black -NoNewline "Updating:    $($e.PadRight($maxlen, ' '))"
					Write-Host ""
					git pull
					if ($firstUser) {
						# if this is the first iteration of the user list, add the updated extension to the update list for other users
						$updates.Add($e) | Out-Null
					}
				} else {
					# no updates, nothing to do
					Write-Host -BackgroundColor DarkGray -ForegroundColor Black -NoNewline "No updates:  $($e.PadRight($maxlen, ' '))"
					Write-Host ""
				}
			} else {
				# extension dir exists, but is not a repo and therefore cannot be updated
				Write-Host -BackgroundColor Red -ForegroundColor White -NoNewline "No repo:     $($e.PadRight($maxlen, ' '))  -  $($ed)"
				Write-Host ""
			}
		} else {
			# extension dir does not exist, clone the repo
			Write-Host -BackgroundColor Blue -ForegroundColor White -NoNewline "Cloning:     $($e.PadRight($maxlen, ' '))"
			Write-Host ""
			Set-Location $dir
			git clone "https://github.com/LenAnderson/$($e).git"
			if ($firstUser) {
				# if this is the first iteration of the user list, add the cloned extension to the update list for the other users
				$updates.Add($e) | Out-Null
			}
		}
	}
	if ($firstUser) {
		# after this iteration we are no longer looking at the first user and don't want to add to the update list
		$firstUser = $false
		if ($updates.Count -eq 0) {
			# if the update list is empty, exit early
			Write-Host ""
			Write-Host -ForegroundColor Green "No extension updates found."
			break
		}
	}
}

# check server plugins
Write-Host "`n-----"
Write-Host -BackgroundColor DarkMagenta -ForegroundColor White -NoNewline "server plugins"
Write-Host ""
$dir = Join-Path $baseDir "plugins"
foreach ($p in $plugins) {
	if ($p -eq "") {
		continue
	}
	$pd = Join-Path $dir $p
	# check if the plugin's directory exists
	if (Test-Path $pd) {
		# check if the plugin's directory is a git repo
		if (Test-Path (Join-Path $pd ".git")) {
			Set-Location $pd
			# fetch to get current data
			git fetch | Out-Null
			# count the number of commits we are behind
			$changes = git rev-list HEAD..origin/master --count
			if ([int]$changes -gt 0) {
				# if more than 0 commits behind, we need to update
				Write-Host -BackgroundColor Cyan -ForegroundColor Black -NoNewline "Updating:    $($p.PadRight($maxlen, ' '))"
				Write-Host ""
				git pull
			} else {
				# no updates, nothing to do
				Write-Host -BackgroundColor DarkGray -ForegroundColor Black -NoNewline "No updates:  $($p.PadRight($maxlen, ' '))"
				Write-Host ""
			}
		} else {
			# plugin dir exists, but is not a repo and therefore cannot be updated
			Write-Host -BackgroundColor Red -ForegroundColor White -NoNewline "No repo:     $($p.PadRight($maxlen, ' '))  -  $($pd)"
			Write-Host ""
		}
	} else {
		# extension dir does not exist, clone the repo
		Write-Host -BackgroundColor Blue -ForegroundColor White -NoNewline "Cloning:     $($p.PadRight($maxlen, ' '))"
		Write-Host ""
		Set-Location $dir
		git clone "https://github.com/LenAnderson/$($p).git"
	}
}

# return to original dir
Pop-Location

Write-Host "`n"
Write-Host -BackgroundColor DarkGreen -ForegroundColor White -NoNewline "Extension and server plugin updates completed."
Write-Host "`n"
# Remove or comment out the next line (Read-Host) to complete the script / close the command window without user confirmation
Read-Host -Prompt "Press ENTER key to exit"
