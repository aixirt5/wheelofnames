# Duck Race

An offline, customizable Duck Race game built with HTML, CSS, and vanilla JavaScript. It visually resembles the classic duck race style while being fully controllable and self-contained.

## Run Locally

- Open `index.html` in any modern browser. No build step is required.
- Sounds will work using local assets (if provided in `assets`) or synthesized audio fallback if not present.

## Features

- 3–10 ducks, each with a name, color, or custom image (PNG/JPG/SVG)
- Start countdown (3…2…1…Go!) with whistle
- Realistic, varying duck speeds and pacing
- Random winner mode or Fixed winner mode
- Race duration approximately 10–20 seconds (configurable)
- Winner highlight, confetti, and cheering
- Race Again / Reset controls

## How to Customize

### 1) Change the number of ducks

- Use the "Ducks" slider in the left panel (3 to 10) then click "Build Lineup".

### 2) Change duck names and colors

- In the Duck Setup panel:
  - Edit each duck's Name field.
  - Pick a Color with the color input. This tints the default SVG duck.
  - Optionally choose an Image file per duck (PNG/JPG/SVG). When provided, the image replaces the default SVG.
- You can also click "Randomize Colors" to assign a new palette.

### 3) Set a fixed winner

- In Winner Mode, choose "Fixed".
- The "Winner" dropdown becomes enabled. Select which duck should win.
- Start the race. The animation still looks natural, but the selected duck will finish first.

### 4) Adjust race duration

- Use the "Duration (s)" number input in the left panel.
- Allowed values are 10 to 20 seconds. The default is 15 seconds.

### 5) Replace sounds

- Put your audio files inside `assets/` using the exact filenames:
  - `assets/whistle.mp3` (start sound)
  - `assets/cheer.mp3` (finish sound)
- If these files are not present, the game will synthesize sounds using the Web Audio API so it still works offline.

### 6) Replace duck images globally

- You can design your own duck sprites and assign them per duck in Duck Setup. Transparent PNGs or SVGs work best.

## Notes

- The finish order is controlled by the Winner Mode:
  - Random: any duck can win.
  - Fixed: the chosen duck will win, others finish slightly behind in a natural order.
- The race uses multiple speed segments per duck to avoid mechanical movement.

## File Structure

- `index.html` – App layout and UI
- `style.css` – Visual style and responsive layout
- `script.js` – Game logic and animations
- `assets/` – Local media files

## License

This project is provided as-is for local/offline use. Replace assets and styling as desired.
