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
- Skip the current level: use the `Skip Level` button in the top HUD
- Touch controls appear automatically on mobile devices

## The trick

Every option in the setup questions occasionally flickers into HELL or DEMON. On the first question, Baby, Child, or Adult advances normally while clicking either corrupted word is fatal. On the second question, normal answers do nothing, DEMON is fatal, and the player must catch and press HELL to crack open the real obstacle course.

Reaching the end of the first obstacle course is not the same as beating it. The apparent finish button sends the player back to the beginning, where an intentionally bad fall reveals the second level.

Level 2 opens with two pursuing-wall tricks. The first wall requires hiding in its alcove; the second wall is harmless, while entering its matching alcove is fatal. Surviving both opens the Taco Storm, where red landing marks warn about falling tacos that the player must dodge. Their predetermined drop pattern gradually constructs the maze while an original chiptune plays. The previous second course continues as Level 3.

Level 3 is the WHAT? tower. It begins as a normal hallway, then becomes a tall, camera-scrolling climb. Accelerating lava consumes the floor and every block in order while platforms shift in two directions, move, crumble, vanish, and change color.

The WHAT? tower includes parallel backup routes, so every disappearing or moving-platform obstacle there has another possible path rather than creating an unwinnable state.

Only in the WHAT? tower, all small platforms drift—including the backup route—and use one-way collision so the player can jump through them from underneath and land on top.

Level 4 is the Mirror Room. A glowing shadow repeats the player's path two seconds later. The player must place themselves and the shadow on separate pressure plates, avoid touching it, survive reversed controls, expose the fake exit, and return to the real door behind the starting point.

Level 5 is Red Light, Wrong Light. The overhead signal eventually lies, while its floor reflection always shows whether movement is safe. The final gate requires a jump with no sideways input.

Level 6 is The Elevator. Its ten shuffled buttons trigger escalating traps, the Top Floor snaps the cable, and the resulting debris becomes the route back to the emergency exit underneath the wreck.

Level 7 is The Dark Walkway. A tiny light radius hides two monster ambushes. The player gains a double jump and must stomp each monster from above; the second attack coincides with a collapsing floor. Beating both restores the lights and opens the final parkour route.

Level 8 is WHAT THE HELL? Its rules rotate every few seconds between reversed controls, moon gravity, fireball rain, super jumps, a sweeping laser, and earthquakes. Every colored platform moves, but a second lower route keeps the chaos beatable.
