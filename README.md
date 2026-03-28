# CabinetWorks

AI-powered kitchen cabinet design tool for professional cabinet shops.

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5173

---

## Deploy to Vercel (free, 3 steps)

### Step 1 — Push to GitHub

1. Go to https://github.com/new and create a new **public** repository called `cabinetworks`
2. On your machine, open a terminal in this project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cabinetworks.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

### Step 2 — Connect to Vercel

1. Go to https://vercel.com and sign in with your GitHub account (free)
2. Click **"Add New Project"**
3. Find and select your `cabinetworks` repository
4. Vercel auto-detects Vite — leave all settings as defaults
5. Click **"Deploy"**

Your site will be live at `https://cabinetworks.vercel.app` (or similar) in about 60 seconds.

---

### Step 3 — Share with beta testers

Send people your Vercel URL. That's it — nothing to install, works in any browser.

Every time you push new code to GitHub, Vercel redeploys automatically.

---

## Adding your Anthropic API key (for AI features)

The AI blueprint analysis and recommendations require an Anthropic API key.

1. Get a key at https://console.anthropic.com
2. In Vercel: go to your project → Settings → Environment Variables
3. Add: `VITE_ANTHROPIC_API_KEY` = your key
4. Redeploy

Then update the API call in `src/App.jsx` to use:
```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01"
}
```

> **Note:** For a production product, API calls should go through your own backend to keep your key private. This setup is fine for beta testing with trusted users.

---

## Tech stack

- React 18 + Vite
- No CSS framework — all custom styles inline
- Anthropic Claude API for AI features
- Deploy: Vercel (free tier)
