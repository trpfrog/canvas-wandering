# Space Wandering!!

宇宙を飛び回ってミニゲームの星を巡ろう！

A web remaster of [Space Wandering](https://github.com/trpfrog/medipro-game), a game made by
つまみ ([@TrpFrog](https://twitter.com/TrpFrog)), ちくわぶ ([@chikuwabu_uec](https://twitter.com/chikuwabu_uec))
and 淵野アタリ ([@ebioishii_u](https://twitter.com/ebioishii_u)) for a university class, originally written in Java.
It runs entirely in the browser — no server, no plugins.

## How to play

|                         | Keyboard | Mouse                                                           |
| ----------------------- | -------- | --------------------------------------------------------------- |
| Accelerate / decelerate | W / S    | Hold the button; far from the rocket speeds up, near slows down |
| Turn                    | A / D    | Hold the button; the rocket turns towards the pointer           |
| Change layer (depth)    | Z / X    | Wheel                                                           |
| Pause                   | Esc      |                                                                 |

Fly into a mini game star (yellow dots on the mini map) to play it. Some games give you a medal,
and there is a hidden constellation somewhere on layer 1.

## Development

This project uses [Vite+](https://viteplus.dev/) (`vp`): Vite, Vitest, Oxlint (type-aware) and Oxfmt in one tool.

```sh
vp install     # install dependencies
vp dev         # start the dev server
vp check       # format, lint and type-check
vp test        # run the unit tests
vp build       # build into dist/
```

Pushing to `main` deploys to GitHub Pages (Settings → Pages → Source: **GitHub Actions**).

### Layout

```text
src/
├── engine/        Game-agnostic pieces: scene stack, input, audio, geometry, canvas stage
├── game/
│   ├── space/       The open world (map, rocket, constellation, HUD)
│   ├── mini-games/  One file per mini game; list it in index.ts to put it in space
│   └── ui/          HTML dialogs drawn above the canvas
└── assets/        Converted images, sounds and fonts (see scripts/convert-assets.sh)
```

The game runs a fixed 10 ms simulation step (`update`) and renders every animation frame (`render`).
Only the top scene of the stack is updated; every visible scene is drawn.

### Assets

`src/assets` is generated from the original repository (and the images from upstream PRs #271 and #273):

```sh
scripts/convert-assets.sh path/to/medipro-game path/to/pr-assets
```

## Differences from the original

See [docs/changes-from-original.md](docs/changes-from-original.md) for fixed bugs, the two mini games
merged from unmerged upstream pull requests, and web-specific changes.

## Credits

- Font "DSEG" by けしかん — [HP](https://www.keshikan.net/fonts.html) / [GitHub](https://github.com/keshikan/DSEG) / [License](src/assets/font/DSEG-LICENSE.txt)
- Font "Bungee Shade" by David Jonathan Ross — [Google Fonts](https://fonts.google.com/specimen/Bungee+Shade)

## License

[Apache License 2.0](LICENSE), same as the original.
