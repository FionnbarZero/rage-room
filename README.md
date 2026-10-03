# Rage Room

A browser rage game disguised as a calm fantasy RPG character creator.

## Play

Open `index.html` directly, or run a local server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Controls

- Move: `A` / `D` or arrow keys
- Jump: `W`, up arrow, or space
- Restart: `R`
- Choose any level: use the `Skip Level` button in the top HUD, then select Levels 1–23
- Touch controls appear automatically on mobile devices

## The trick

On the first setup question, every option occasionally flickers into DEMON; normal Baby, Child, or Adult choices advance, while clicking DEMON is fatal. On the second question, the options only flicker into HELL. Normal answers do nothing, and the player must catch and press HELL to crack open the real obstacle course.

Reaching the end of the first obstacle course is not the same as beating it. The apparent finish button sends the player back to the beginning, where an intentionally bad fall reveals the second level.

Level 2 opens with two pursuing-wall tricks. The first wall requires hiding in its alcove; the second wall is harmless, while entering its matching alcove is fatal. The second pursuit now continues much farther beyond the false alcove. Surviving it opens a substantially longer Taco Storm, where red landing marks warn about falling tacos that the player must dodge. Their predetermined drop pattern gradually constructs a machine-filled maze with conveyors, shrinking footholds, moving platforms, and an original chiptune. The previous second course continues as Level 3.

Level 3 is the WHAT? tower. It begins as a normal hallway, then becomes a tall, camera-scrolling climb. Accelerating lava consumes the floor and every block in order while an expanded set of platforms moves with newly randomized speed, range, and phase on each attempt. Random wind, low-gravity, frenzy, and calm modes change during the climb.

The WHAT? tower includes parallel backup routes, so every disappearing or moving-platform obstacle there has another possible path rather than creating an unwinnable state.

Only in the WHAT? tower, all small platforms drift—including the backup route—and use one-way collision so the player can jump through them from underneath and land on top.

Level 4 is the Mirror Room. A glowing shadow repeats the player's path two seconds later. The player must place themselves and the shadow on separate pressure plates, avoid touching it, survive reversed controls, expose the fake exit, and return to the real door behind the starting point.

Level 5 is Red Light, Wrong Light. Red and green durations are randomized, independently changing decoy lights add noise, and extra blocks and moving platforms complicate the crossing. The overhead signal eventually lies, while its floor reflection always shows whether movement is safe. The final gate requires a jump with no sideways input.

Level 6 is The Elevator. Its ten shuffled buttons trigger escalating traps, the Top Floor snaps the cable, and the resulting debris becomes the route back to the emergency exit underneath the wreck.

Level 7 is The Dark Walkway. A tiny light radius hides two monster ambushes. The player gains a double jump and must stomp each monster from above; the second attack coincides with a collapsing floor. Beating both restores the lights and opens the final parkour route.

Level 8 is WHAT THE HELL? Its rules rotate every few seconds between reversed controls, moon gravity, fireball rain, super jumps, and earthquakes. Every colored platform moves, but a second lower route keeps the chaos beatable. Red always means breakable, including during color-changing sections.

Level 9 is a six-question YES/NO trap. The final gibberish question rejects both answers, forcing the player to backtrack, collect an I DON'T KNOW button from a newly appeared door, and carry it back to the answer slot.

Level 10 turns the Narrator into an interactive word-building UI. The player must click each spoken word in the correct order to construct a platform bridge; a wrong word destroys the unfinished bridge. Landing on the final word unlocks the next sentence. Triple-jumping is enabled for the harder parkour and the final return trip.

Levels 11–13 are longer focused challenges with their global bonus mechanics removed. Level 11 is a five-part delayed-platform obby with increasingly impatient platforms. Level 12 turns the moving finish into a three-stage stop-and-go puzzle. Level 13 contains four tall backward-entry doors. Door 3 now reaches high enough to be triggered from its raised platform, while Door 4 waits at the top of a vertical obstacle tower.

Levels 14–17 begin the final Troll Gauntlet. Level 14 is a six-part point-and-click repair gauntlet hidden inside a fake loading screen: find a broken pixel, connect numbered nodes, patch colored wires, chase calibration points, spot a corrupted checksum, and decode a misleading final command. Wrong clicks reset only the current repair. Level 15's Devil Button must be pressed twice and now unleashes a long, accelerating-wall chase across moving, orbiting, crumbling, ghost, shrinking, and conveyor platforms. Level 17 is the rebuilt Planet Party.

Levels 18–23 deliberately use different game types. Copycat Assembly Line is now a five-stage observation puzzle whose final robot demands a six-move sequence. Furnace Walk has an additional overclocked steam-and-conveyor sector. Gearbox ends with faster orbiting gears and another disappearing foothold. Steam Valve Works requires reaching and closing four interactive wheels with `E`; each valve disables part of the expanded steam network. Night-Shift Tower has a taller final floor plus a separate backup route and vertical checkpoints. Starship Shift replaces the character with a spaceship and now has a longer final docking run through tighter gates and faster moving asteroids. Completing the flight finally sends the player to Level 16's long moving-platform obby and two-step fake victory screen.

Starship Shift now controls like Flappy Bird: the large glowing ship flies forward automatically, while each tap of `Space`, Up, the game canvas, or the touch jump button gives it one upward flap. Gravity pulls it down between taps. Three flight beacons act as checkpoints before the final docking portal, and optional glowing boost rings grant a temporary speed burst and one impact shield.

The level-selection screen is organized into four acts: The Disguise, Trick Rooms, Rage Gauntlet, and Impossible Worlds. The graphics pass adds grouped menu cards, deeper lighting, animated factory machinery, metal platform highlights, rivets, conveyor warning stripes, space effects, shield effects, and brighter interactive-object outlines.

Every level now allows three jumps before landing (the Air Rune adds a fourth). Parkour-heavy rooms include climbable ladders: hold `E` while touching one to climb upward. Existing obbies have additional moving, orbiting, ghost, shrinking, and crumble jumps, and their machinery runs slightly faster. A riveted factory backdrop and overhead pipe network now connect the whole game visually. Level 16 is a long two-part one-way moving-platform course, so the player can jump upward through its platforms and land on top. Its fake victory screen appears only after every visible parkour section has been completed.

The parkour remix spreads extra mechanics throughout the existing levels instead of placing anything behind the final fake screen. These include fading ghost platforms, shrinking footholds, conveyor platforms, orbiting tiny-planet routes, copycat platforms, beat-timed musical platforms, ceiling-gravity zones, paired momentum portals, doorway jumps, runaway checkpoints, moving-platform traffic, and an assembly-line finale. Existing narrator bridges, monster jumps, elevator debris, reverse controls, delayed stairs, shadow puzzles, and final-platform betrayals cover the remaining challenge types.

Level 13 continues after its four backward doors. The fourth door requires climbing a tall vertical obby containing moving, crumble, ghost, shrinking, and orbiting platforms; two trap portals send the player backward down the tower. Entering Door 4 backward unlocks the long “impossible” horizontal route over lava with spikes, conveyors, and additional portals. Reaching the far end reveals a sign mocking the player for missing a nearly invisible ladder on the center conveyor island. Getting close to that ladder briefly reveals only an `E`; holding it climbs to a secret portal that skips most of the route.

Level 17, Planet Party, is now a tall planet-only ascent with no normal platforms. The stick figure locks onto the circular surface of each world and can walk completely around it, including across the sides and upside down underneath it. Jumping launches the player away from the current surface; two midair jumps help redirect toward the next planet. Eleven increasingly separated worlds form the upward route, every world has its own gravity, and occupied planets physically shrink before regrowing when abandoned. Three planet checkpoints keep the difficult climb possible. Reaching the glowing Exit Planet opens the factory wing.

Every level also contains five optional Rage Shards placed along its routes. Collecting all five awards exactly what a rage game should: emotional damage.

Collected Rage Shards are also permanent shop currency for that run. The HUD shop sells an extra midair jump, faster boots, a shard magnet, a charm that slows moving hazards, and reusable one-death shields.

Every level now layers additional mechanics over its main troll: two launch pads, two directional wind zones, and two randomized mystery boxes. Mystery boxes can award shards or a shield, launch the player, or refund some hard-earned progress.
