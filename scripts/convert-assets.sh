#!/usr/bin/env bash
# Convert the original Java game's resources into web-friendly assets.
#
# Usage: scripts/convert-assets.sh <path-to-medipro-game-clone> [<pr-assets-dir>]
#   <pr-assets-dir> must contain macho_game/ and shonben_kozou/ extracted
#   from upstream PRs #273 and #271.
#
# Requires: ffmpeg (libmp3lame), cwebp, ImageMagick 7 (magick)
set -euo pipefail

SRC="$1/src/resource"
PR="${2:-}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/assets"

rm -rf "$OUT"
mkdir -p "$OUT"/{img,sound,font}

# webp <src> <dst-name> [max-width]
webp() {
  local src="$1" dst="$OUT/img/$2.webp" max="${3:-0}"
  mkdir -p "$(dirname "$dst")"
  if [[ "$max" != 0 ]]; then
    cwebp -quiet -q 85 -resize "$max" 0 "$src" -o "$dst"
  else
    cwebp -quiet -q 85 "$src" -o "$dst"
  fi
}

# main menu
webp "$SRC/main_menu/main_menu1.jpg" menu/background-1 1280
webp "$SRC/main_menu/main_menu2.jpg" menu/background-2
webp "$SRC/main_menu/main_menu3.jpg" menu/background-3
webp "$SRC/main_menu/main_menu4.jpg" menu/background-4

# space
webp "$SRC/space_game/rocket.png" space/rocket
webp "$SRC/space_game/rocket_stop.png" space/rocket-stop
webp "$SRC/space_game/invincibleRocket.png" space/rocket-invincible
webp "$SRC/space_game/invincibleRocketStop.png" space/rocket-invincible-stop
webp "$SRC/space_game/medal.png" space/medal
webp "$SRC/space_game/star1.png" space/star-bright
webp "$SRC/space_game/star2.png" space/star-dark
for i in 0 1 2 3 4; do webp "$SRC/space_game/backgrounds/bkg$i.jpg" "space/background-$i"; done

# mini games (star icons are drawn at most 350px)
webp "$SRC/mini_game/galaxy_express/starImage.png" galaxy-express/star 400
webp "$SRC/mini_game/galaxy_express/train.png" galaxy-express/train 240
webp "$SRC/mini_game/galaxy_express/bkg1.jpg" galaxy-express/background
webp "$SRC/mini_game/race_game/staricon.png" race-game/star 400
webp "$SRC/mini_game/race_game/car.png" race-game/car
webp "$SRC/mini_game/shooting_star/staricon.png" shooting-star/star 400
webp "$SRC/mini_game/shooting_star/hug.png" shooting-star/hug 400
webp "$SRC/mini_game/shooting_star/looking.png" shooting-star/looking 400
webp "$SRC/mini_game/shooting_star/heart.png" shooting-star/heart 100
webp "$SRC/mini_game/moons_work/staricon.png" moons-work/star 400
webp "$SRC/mini_game/moons_work/background.jpg" moons-work/background
webp "$SRC/mini_game/moons_work/earth.png" moons-work/earth 280
webp "$SRC/mini_game/moons_work/rocket.png" moons-work/rocket
webp "$SRC/mini_game/moons_work/firerock.png" moons-work/meteorite
webp "$SRC/mini_game/moons_work/tilt_rocket.png" moons-work/life 100
webp "$SRC/mini_game/moons_work/tilt_rocket_shadow.png" moons-work/life-lost 100

# explosion gif -> 12x12 sprite sheet of coalesced 192x144 frames
tmp="$(mktemp -d)"
magick "$SRC/mini_game/moons_work/explosion-2.gif" -coalesce "$tmp/f_%03d.png"
frames=("$tmp"/f_*.png)
for ((r = 0; r * 12 < ${#frames[@]}; r++)); do
  magick "${frames[@]:r*12:12}" -background none +append "$tmp/row_$(printf %02d $r).png"
done
magick "$tmp"/row_*.png -background none -gravity west -append "$tmp/sheet.png"
cwebp -quiet -q 80 "$tmp/sheet.png" -o "$OUT/img/moons-work/explosion.webp"
rm -rf "$tmp"

# upstream PR assets
if [[ -n "$PR" ]]; then
  webp "$PR/macho_game/arm_upper.png" macho/upper-arm
  webp "$PR/macho_game/arm_fore.png" macho/forearm
  webp "$PR/macho_game/staricon.png" macho/star 400
  webp "$PR/shonben_kozou/cup.png" stardust/cup 200
  webp "$PR/shonben_kozou/kozou.png" stardust/kozou
  webp "$PR/shonben_kozou/star.png" stardust/star 400
fi

# sounds
mp3() { ffmpeg -loglevel error -y -i "$SRC/sound/$1.wav" -codec:a libmp3lame -b:a 128k "$OUT/sound/$2.mp3"; }
mp3 Lobby bgm-space
mp3 Menu bgm-menu
mp3 MiniGame bgm-mini-game
mp3 Rocket se-rocket
mp3 Achievement se-achievement
mp3 explosion se-explosion

# fonts
cp "$SRC/font/DSEG7Classic-Bold.ttf" "$OUT/font/dseg7-classic-bold.ttf"
cp "$SRC/font/BungeeShade-Regular.ttf" "$OUT/font/bungee-shade-regular.ttf"
cp "$SRC/font/DSEG-LICENSE.txt" "$OUT/font/DSEG-LICENSE.txt"

du -sh "$OUT"
