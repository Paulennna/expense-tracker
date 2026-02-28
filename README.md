# 💸 Expense Tracker 

A full-stack, cross-platform personal finance management application built with React Native (Expo), Supabase, and the Plaid API. 

---

## 🚀 Overview

Expense Tracker empowers users to take control of their financial lives. Instead of manually entering every purchase, users can securely connect their bank accounts via Plaid and have their transactions automatically synced and categorized. 

The app features a frictionless onboarding experience through Supabase Magic Link authentication, completely removing the need for passwords while maintaining high security standards.

## ✨ Key Features

- Frictionless Authentication: Passwordless login using Supabase Magic Links (OTP) with deep-linking back into the Expo application.
- Secure Bank Linking: Native integration with the Plaid Link SDK to securely connect bank and credit card accounts.
- Automated Transaction Sync: Uses Supabase Edge Functions to securely communicate with the Plaid API, fetching and updating user transactions in the database.
- Real-Time Database: Leverages Supabase PostgreSQL to store and sync financial data instantly across connected devices.
- Cross-Platform: Built with Expo and React Native, running seamlessly on iOS, Android, and Web platforms.

## 🛠️ Tech Stack

### Frontend (Mobile App)
- Framework: React Native / Expo
- Routing: Expo Router (File-based routing)
- UI: Custom styled components with responsive design
- State/Storage: React State, AsyncStorage

### Backend & Database (BaaS)
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth (Magic Links / Deep Linking)
- Serverless Compute: Supabase Edge Functions (Deno / TypeScript)

### External APIs
- Financial Data: Plaid API (Transactions & Auth products)

---

## 🏗️ Architecture & Security Highlights

- Secure Credential Handling: The app *never* handles or stores sensitive Plaid credentials. Plaid integration relies on secure `link_tokens` and `public_tokens` exchanged server-side via Supabase Edge Functions.
- Row Level Security (RLS): The database employs strict Supabase RLS policies ensuring that users can only query, insert, or modify their own financial data and transactions.
- Environment Isolation: Expo Public environment variables are used for safe client-side keys, while strict backend-only API keys (like `PLAID_SECRET`) remain securely held within Supabase's encrypted vault.



## Developer Notes

This project was a deep dive into connecting complex, secure SDKs (like Plaid) within a managed React Native (Expo) lifecycle. Overcoming challenges with deep-linking for Magic Links and secure server-to-server Plaid token exchanges were significant milestones in this build.
