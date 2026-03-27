# MacroMetric

A simple daily food macro tracker - local-only version. No account, no server, just open and use.

## Features

- **Quick-Add Daily Log** - Log foods to breakfast, lunch, dinner, or snacks
- **Food Search** - Search millions of foods from OpenFoodFacts (free, no API key needed)
- **Barcode Scanner** - Scan packaged foods to auto-fill nutrition info
- **Quick-Add Presets** - Save favorite foods for one-tap logging
- **Macro Dashboard** - Visual progress bars for protein/carbs/fat/calories
- **Goals Tracking** - Set and track daily macro targets
- **History View** - Browse past days and trends
- **Data Export/Import** - Backup and restore your data as JSON

## Getting Started

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Access from Your Phone

1. Make sure your phone is on the same WiFi network as your PC
2. Find your PC's local IP address:
   - Windows: `ipconfig` → look for "IPv4 Address"
3. Run: `npm run dev:host`
4. On your phone, open: `http://YOUR_PC_IP:5173`

## Data Storage

All data is stored locally in your browser using localStorage. This means:
- No account needed
- Works offline
- Data stays on your device

To backup your data:
1. Go to Settings → Export Data
2. Save the JSON file

To restore on another device:
1. Go to Settings → Import Data
2. Select your backup file

## Food Database

MacroMetric uses [OpenFoodFacts](https://world.openfoodfacts.org/) - a free, open-source food database with over 2 million products. No API key or registration required!

## Default Goals

- Calories: 2000 kcal
- Protein: 150g
- Carbs: 250g
- Fat: 65g

Change these in Settings to match your personal targets.

## Project Structure

```
MacroMetric/
├── src/
│   ├── components/     # UI components (Layout, BarcodeScanner)
│   ├── pages/          # Page components (Dashboard, FoodLog, etc.)
│   ├── lib/            # API functions (localStorage + OpenFoodFacts)
│   └── App.tsx         # Main app with routing
├── public/             # Static assets
├── index.html          # Entry HTML
└── package.json
```

## Build for Production

```bash
npm run build
```

The production build will be in `dist/`. You can host it anywhere (GitHub Pages, Netlify, Vercel, etc.).

## License

MIT
