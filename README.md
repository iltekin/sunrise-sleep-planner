# 🌅 Sunrise Sleep Planner

A modern, highly optimized, and beautifully designed **Sleep Schedule Generator** that synchronizes your circadian rhythm with the natural sunrise. Built entirely as a 100% client-side React application with zero backend required.

![Sunrise Sleep Planner](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css)
![Open Source](https://img.shields.io/badge/Open-Source-green?style=flat)

## ✨ Features

- 🌍 **Global Geocoding:** Search for any city, district, or country worldwide (powered by Open-Meteo & BigDataCloud APIs).
- 🌅 **Astronomical Precision:** Dynamically calculates precise sunrise times for the selected location to perfectly sync wake-up routines.
- 🌐 **Global i18n Support (10 Languages):** Automatically detects the browser's language and seamlessly localizes the entire app into English, Turkish, Spanish, French, German, Chinese, Arabic, Russian, Portuguese, and Japanese.
- 🔗 **Stateless Sharable URLs:** All user configuration is purely mapped to URL parameters. You can instantly share your unique sleep plan without a database.
- 📄 **Native PDF Export:** Beautifully formatted print stylesheets allow users to save or print their schedules cleanly.
- 🔬 **Science-Backed:** Built-in scientific tooltips that guide users on NSF guidelines and sleep latency.
- ⚡ **Zero Backend:** Purely static generation. Can be hosted forever for free on GitHub Pages.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) / [Base UI](https://base-ui.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Date Handling:** `date-fns` (Fully localized)

## 🚀 Running Locally

First, clone the repository and install dependencies:

```bash
git clone https://github.com/iltekin/sunrise-sleep-planner.git
cd sunrise-sleep-planner
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📦 Deployment (GitHub Pages)

This project is configured for **Static Site Generation (SSG)** (`output: "export"`).
You can easily deploy it for free using GitHub Pages:
1. Go to your repository **Settings > Pages**.
2. Set **Source** to **GitHub Actions**.
3. Select the official **Next.js** template.
4. Your site will be live in minutes!

## 👨‍💻 Author

Built by [@sezeriltekin](https://x.com/sezeriltekin)
