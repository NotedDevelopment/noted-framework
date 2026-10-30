<p align="center"><img src="logo.png" width="180" alt="Noted Framework"></p>

<h1 align="center">Noted Framework</h1>

## Requirements

- **MariaDB 10.9 or newer**, running and reachable from your server. 12.3 LTS is recommended. MySQL and XAMPP are not supported.
- A **Cfx.re server key** from [portal.cfx.re](https://portal.cfx.re/servers/registration-keys).

## Installation

1. Download the latest [FiveM server artifacts](https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/) and extract them to a folder. On Linux, use the [Linux artifacts](https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/).
2. Run `FXServer.exe` (`run.sh` on Linux). txAdmin opens in your browser.
3. Link your Cfx.re account and set a password when asked.
4. Enter a server name, then choose **Remote URL Template** as the deployment type.
5. Paste this URL:

   ```
   https://raw.githubusercontent.com/NotedDevelopment/noted-framework/main/recipe.yaml
   ```

6. Continue to the Recipe Deployer. Enter your server key and your database details when asked.
7. Run the recipe and wait for it to finish.
8. Review `server.cfg`, then save and start the server.

Your txAdmin account is added to `group.admin` automatically.

If a download fails with a 403 error, GitHub is rate limiting you. Wait a while or change your IP address, then try again.

See [RUNNING.md](RUNNING.md) for how to run the server after installing.
