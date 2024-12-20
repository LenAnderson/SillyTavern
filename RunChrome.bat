@echo off
set port=8000
:LOOP
netstat -an |^
findstr /RC:":%port% .*LISTENING" && (
	echo port %port% listening
	timeout /NOBREAK 2
	start "" "C:\Program Files\Google\Chrome\Application\chrome_proxy.exe" --profile-directory=Default --app-id=fkjkjjjmlkjnchecijdkfolgdhilkejl --remote-debugging-port=9222
	exit
) || (
	echo port %port% not listening
	timeout /NOBREAK 1
	GOTO :LOOP
)
