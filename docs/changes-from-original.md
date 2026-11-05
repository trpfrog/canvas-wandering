# Changes from the original

This is a web remaster of [trpfrog/medipro-game](https://github.com/trpfrog/medipro-game)
(Java / Swing). Gameplay, numbers and timings follow the original; the code is a
from-scratch rewrite. This page lists every place where the behavior intentionally differs.

## Bugs fixed

| Where               | Original behavior                                                                                                                                                                                                        | Now                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Medals              | Medals were compared by `Image` instance, and every check loaded a new image, so the same medal could be earned again and again (the zodiac medal popped up every few seconds while touching a completed constellation). | Medals are compared by id and can only be earned once.           |
| Medals              | The achievement sound was a `Clip` that was never rewound, so it only played the first time.                                                                                                                             | It plays every time.                                             |
| Medal window        | The "I got it" button was created but never added, so the only way out was clicking outside.                                                                                                                             | The button is shown.                                             |
| Medal list          | Times were formatted with `hh` (12-hour clock without AM/PM).                                                                                                                                                            | 24-hour clock.                                                   |
| Moon's Work         | `Earth.exploded` was `static`: after the first game over, the earth could never explode again, so later games never ended and explosions were silent.                                                                    | State is per game.                                               |
| Moon's Work         | The game-over explosion sound kept playing (11 times in a row) after leaving the game.                                                                                                                                   | It stops when the game is left.                                  |
| Moon's Work         | Explosion GIF frames were drawn without compositing, so partial frames jittered.                                                                                                                                         | Frames are composited into a sprite sheet at build time.         |
| Space               | Steering with the mouse only slowed down near the target on one side, so the rocket wobbled when approaching from the other side.                                                                                        | The fine-turn zone is symmetric.                                 |
| Space               | Hit boxes were moved by integer-truncated coordinates (up to 1 px off).                                                                                                                                                  | Exact coordinates.                                               |
| Race                | Friction (−8) and acceleration (+10) did not divide evenly, so the car never stopped and kept vibrating around speed 0.                                                                                                  | Friction stops at 0.                                             |
| Race                | Controls read the typed character (`'w'`), so they broke with Caps Lock or Shift.                                                                                                                                        | Physical keys (WASD).                                            |
| Shooting Star       | After the time ran out, the timer text switched back to "PRESS SPACE KEY TO START" behind the result.                                                                                                                    | It stays at 0.                                                   |
| Shooting Star / all | Some timers used the wall clock and kept running while paused.                                                                                                                                                           | Everything runs on a simulation clock that stops while paused.   |
| Galaxy Express      | Typing something that is not a number threw an exception and nothing happened.                                                                                                                                           | Invalid input is ignored; there is also an OK button.            |
| Galaxy Express      | The answer field kept focus, so pressing Enter again submitted twice.                                                                                                                                                    | Focus leaves covered dialogs.                                    |
| Transitions         | The black "peephole" transition stayed fully black for ~0.85 s, and the opening animation kept blocking input for another ~0.85 s after the screen was already fully visible.                                            | 0.2 s of black; the scene starts as soon as it is fully visible. |

## From the unmerged upstream pull requests

| PR                                                       | What                      | Notes                                                                                                                                                  |
| -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#273](https://github.com/trpfrog/medipro-game/pull/273) | マッチョ星雲 (macho game) | Pausing could end the game instantly (the timer reused a stale elapsed time); fixed. Dragging still needs whole 256 px steps per degree, as in the PR. |
| [#271](https://github.com/trpfrog/medipro-game/pull/271) | 星屑集め (stardust)       | Caught dust was removed while iterating, so the next one could be skipped; fixed. "Start" flashed for a moment before the countdown; fixed.            |
| [#231](https://github.com/trpfrog/medipro-game/pull/231) | マッチョ (ASCII art)      | Kept as a comment in `src/main.ts`. Respect.                                                                                                           |

Both mini games are placed on layer 0 next to the original four.

## Not ported (dead code in the original)

- **Comets** (`CometManager`): its timers were never started, so no comet ever appeared.
- **Black holes** (`BlackHole`, `WarpSystem`): never placed on the map. Had one been, touching it
  would have frozen the game, because the warp animation was never drawn and so never finished.
- **BLACK Moon's Work**: not listed among the mini game stars, and its speed constants were
  `static final`, so it would not have been faster anyway.

## Web adaptations

- **QUIT** cannot close a browser tab, so it shows a "Thank you for playing!" screen instead.
- **Medals and volume** are saved in `localStorage` (the original lost them on exit).
- A **click-to-start** screen is shown first, because browsers only allow audio after a user gesture.
- **Dialogs** are HTML on top of the canvas; the blurred background uses `backdrop-filter`.
- Assets are converted for the web: WAV → MP3 and PNG/JPEG → WebP (64 MB → 5 MB). See
  `scripts/convert-assets.sh`.
