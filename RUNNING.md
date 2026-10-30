# Running the server

## Starting and stopping

Start `FXServer.exe` (`run.sh` on Linux), then start, stop and restart the server from the txAdmin web panel. To restart one resource from the live console, run `ensure resource_name`.

## Admins

Permissions are set with ACE groups in `server.cfg` and `permissions.cfg`. `group.admin` includes `group.mod`, which includes `group.support`. To add an admin, add this line to `server.cfg`:

```
add_principal identifier.fivem:YOUR_ID group.admin
```

## Commands

### Everyone

| Command | What it does |
| --- | --- |
| `/id` | Shows your server ID |
| `/job` | Shows your job |
| `/gang` | Shows your gang |
| `/ooc [message]` | Sends an out-of-character chat message |
| `/me [message]` | Shows a message above your character |
| `/report [message]` | Sends a report to staff |

### Admin

Run `/optin` first. Admin commands are blocked until you do, and running it again opts you back out. To remove this requirement, set `requireOptIn` to `false` in `noted_core/config/server.lua`.

| Command | What it does |
| --- | --- |
| `/admin` | Opens the admin menu (mod and up) |
| `/noclip` | Toggles noclip (mod and up) |
| `/names`, `/blips` | Toggles player names or blips (mod and up) |
| `/tp [id or x] [y] [z]` | Teleports to a player or coordinates |
| `/tpm` | Teleports to your map marker |
| `/car [model]` | Spawns a vehicle |
| `/dv [radius]` | Deletes vehicles nearby |
| `/givemoney [id] [cash/bank/crypto] [amount]` | Gives a player money |
| `/setmoney [id] [cash/bank/crypto] [amount]` | Sets a player's money |
| `/setjob [id] [job] [grade]` | Sets a player's job |
| `/setgang [id] [gang] [grade]` | Sets a player's gang |
| `/togglepvp` | Turns PVP on or off |
| `/openserver` | Opens the server to everyone |
| `/closeserver [reason]` | Closes the server to players without permission |
| `/deletechar [id]` | Deletes a character |

## Configuration

| What | Where |
| --- | --- |
| Framework settings | The `set noted:` lines in `server.cfg` |
| Starting money, paychecks, hunger and thirst | `noted_core/config/server.lua` |
| Client settings | `noted_core/config/client.lua` |
| Queue | `noted_core/config/queue.lua` |
| Jobs | `noted_core/shared/jobs.lua` |
| Gangs | `noted_core/shared/gangs.lua` |
| Vehicles | `noted_core/shared/vehicles.lua` |
| Items | `ox_inventory/data/items.lua` |
| Inventory settings | `ox.cfg` |
| Voice settings | `voice.cfg` |

Add new items to `ox_inventory/data/items.lua` only. `noted_core/shared/items.lua` is deprecated.

Restart a resource after changing its config. Changes to `server.cfg` need a full server restart.

## Adding resources

Put new resources in `resources/[standalone]`. Everything in that folder starts automatically.

Most QBCore scripts work without changes through the built-in bridge, which is on when `noted:enableBridge` is `true`. To get the core object, use `exports['qb-core']:GetCoreObject()`.

## Common problems

**`SCRIPT ERROR: failed to load model`**: Usually caused by a slow PC. If the error comes from `noted_core`, raise `loadingModelsTimeout` in `noted_core/config/client.lua`.

**Stuck on the loading screen with a custom multicharacter**: Set `useExternalCharacters = true` in `noted_core/config/client.lua`, then set `loadscreen:externalShutdown` to `false` in `server.cfg`.

**Keybind changes don't apply**: Players who have already connected keep their old binds until they clear them.

**A vehicle name starts with a number**: Put it in square brackets, like `['5vigero'] =`.
