# README.md
// filepath: /home/jtello/vocalsilence/chatroom/README.md

# Chatroom App

A Next.js chatroom application with authentication, chatbot selection, and chat interface. Built with Supabase for backend and authentication.

## Features

- User authentication (sign up, login, logout)
- Chatbot selection and conversation management
- Chat interface with persistent local storage
- Supabase integration for user and conversation data
- Responsive UI with shadcn/ui components

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/your-username/chatroom.git
cd chatroom
```

### 2. Install dependencies

```sh
pnpm install
# or
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```sh
cp .env.example .env.local
```

Edit `.env.local` and set the following variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon public key

### 4. Run the development server

```sh
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js app directory (pages, layouts, API routes)
- `components/` - UI and feature components
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and Supabase client/server logic
- `public/` - Static assets
- `styles/` - Global and component styles

## Environment Variables

See [.env.example](.env.example) for required variables.

## License

MIT