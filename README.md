# Trafy Cohort '26 Platform

This repository contains the complete stack for the Trafy Cohort '26 platform, including the static marketing site, the interactive assessment dashboard, and the backend API.

## Project Structure

- `/` (Root): The static HTML/CSS/JS marketing pages (e.g., `index.html`, `cohort-26.html`).
- `/assessment-app`: The modern React (Vite) application for the interactive Assessment Dashboard.
- `/backend`: The Node.js/Express backend that handles assessment submission, evaluation, and database integration.

---

## Prerequisites

Before running the project locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (comes with Node.js)

---

## Setup & Running Locally

To run the full stack locally, you need to run three separate servers. It's recommended to open three different terminal windows.

### 1. The Backend API
The backend handles real-time scoring, database interactions, and code execution.

1. Open Terminal 1 and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure your `.env` file is set up correctly in the `backend/` folder (requires your Supabase URL, Supabase Anon Key, and Judge0 RapidAPI Key).
4. Start the server:
   ```bash
   npm run dev
   ```
   *(The server will start on `http://localhost:3000`)*

### 2. The React Assessment Dashboard
The assessment platform is a React single-page application (SPA) built with Vite.

1. Open Terminal 2 and navigate to the assessment app directory:
   ```bash
   cd assessment-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *(The React app will start on `http://localhost:5173`. Open this URL to view the interactive assessment!)*

### 3. The Static Marketing Website
The main landing page and marketing site are static HTML files.

1. Open Terminal 3 in the root directory.
2. Run a local static server:
   ```bash
   npx serve .
   ```
   *(Alternatively, you can use the VS Code "Live Server" extension).*
3. Open the provided local URL in your browser to view the main website.

---

## Integrations & Features

### Google Forms Integration
The main application form on `index.html` submits directly to a Google Form using a background `fetch` request. This ensures a seamless user experience (showing an inline success message) without redirecting away from the site. This logic is located in `js/main.js`.

### Real-Time Assessment Scoring
The Master Assessment uses a combination of local browser state and the backend API to instantly calculate scores (combining 45 MCQs + 2 Data Structures & Algorithms challenges) and displays the results in the right-hand dashboard sidebar as soon as the user submits.
