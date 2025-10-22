# IntelliQuery 🧠📊 - Your AI Data Analyst for MongoDB

**IntelliQuery** is a smart application designed to bridge the gap between complex data stored in MongoDB and the humans who need insights from it. Ask questions about your data in plain English, and IntelliQuery leverages cutting-edge AI to generate MongoDB Aggregation Pipelines, execute them securely, and present the results through intuitive analyses and visualizations.

**It's built for teams and businesses who want to democratize data access without requiring everyone to learn MQL.**

<p align="center">
  <a href="https://intelli-query.vercel.app/">
    <img src="https://ik.imagekit.io/aniketthapadev/intelli-query.png" alt="IntelliQuery">
  </a>
</p>

---

## ✨ Key Features

- **Natural Language Querying:** Interact with your MongoDB data using everyday language via a chat interface.
- **AI-Powered MQL Generation:** Automatically translates natural language questions into efficient and **secure, read-only** MongoDB Aggregation Pipelines using state-of-the-art LLMs (like Google Gemini).
- **Intelligent Schema Awareness:** Understands your specific database structure through a simple JSON schema definition provided during onboarding.
- **Retrieval-Augmented Generation (RAG):** Uses vector embeddings of your schema to provide relevant context to the AI, ensuring more accurate query generation.
- **Dynamic Visualizations & Analysis:** Presents query results not just as raw data, but also as auto-generated charts (bar, line) and insightful Markdown summaries.
- **Secure Onboarding:** Connect your database securely using connection strings (encrypted at rest) and define your schema via JSON upload – no direct code access required.
- **Multi-Tenancy:** Designed with isolated tenant workspaces, ensuring data privacy and separation between different organizations or teams.
- **User & Team Management:** Supports user roles (admin, member) and invitations for collaborative access within a tenant.
- **Robust Query Handling:** Includes mechanisms for classifying query intent (data vs. general chat) and attempting query repairs upon execution errors.

---

## 🚀 How It Works

IntelliQuery employs a sophisticated AI pipeline to understand your data and your questions:

1.  **Onboarding & Schema Ingestion:**

    - You sign up, creating a secure tenant workspace.
    - Connect your MongoDB instance by providing the connection string and database name (URI is encrypted).
    - Define your database structure (collections, fields, types, descriptions) using a straightforward JSON format.
    - The backend processes this schema, generating vector embeddings for each field and storing them in a dedicated vector index associated with your tenant. This forms the AI's "knowledge base" about _your_ data.

2.  **Query Processing (RAG Pipeline):**
    - You ask a question in the chat interface (e.g., "Show total sales per category last month").
    - The backend first classifies if it's a data-related query or general conversation.
    - For data queries, your question is embedded and used to search the schema vector index, retrieving the most relevant collection/field information (the "context").
    - This context, along with your question and recent chat history, is sent to a powerful LLM (e.g., Google Gemini).
    - The LLM, guided by the schema context and strict security prompts, generates a MongoDB Aggregation Pipeline.
    - The pipeline is executed against _your_ connected database (read-only).
    - If the query fails, an AI-powered repair mechanism attempts to fix it based on the error message.
    - The results are processed by another AI call to generate a natural language summary (Markdown) and suggest appropriate table/visualization configurations.
    - The summary, table, and chart (if applicable) are displayed in the chat interface.

---

## 🛠️ Tech Stack

IntelliQuery leverages modern technologies for a robust and intelligent experience:

**Frontend:** (`/frontend`)

- **Framework:** React (Vite)
- **UI:** Tailwind CSS, shadcn/ui
- **State Management:** React Context API
- **Routing:** React Router DOM
- **Data Fetching:** Axios
- **Visualizations:** Chart.js, react-chartjs-2
- **Styling & Animation:** Framer Motion, tailwind-merge, clsx

**Backend:** (`/backend`)

- **Framework:** Node.js, Express
- **Database:** MongoDB Atlas (Platform Data & Vector Search)
- **ODM:** Mongoose
- **AI Orchestration:** LangChain.js (@langchain/langgraph)
- **LLMs:** Google Gemini (via `@langchain/google-genai`), OpenAI (optional)
- **Embeddings:** @xenova/transformers (local, server-side)
- **Authentication:** JWT, bcryptjs
- **Real-time:** Server-Sent Events (SSE) for chat streaming
- **Other:** Nodemailer (Email), crypto (Encryption)

---

## ⚙️ Project Structure

```

intelliquery/
├── backend/
│   ├── src/
│   │   ├── config/       \# Database connection
│   │   ├── langgraph/    \# AI agent, tools (query gen, executor, formatter)
│   │   ├── middleware/   \# Authentication, validation
│   │   ├── models/       \# Mongoose schemas (User, Tenant, Schema, etc.)
│   │   ├── routes/       \# API endpoints (auth, chat, onboarding, etc.)
│   │   ├── utils/        \# Helpers (email, crypto, embeddings, mongoClient)
│   │   └── index.js      \# Server entry point
│   ├── .env.example    \# Environment variable template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/   \# Reusable UI components (shadcn/ui, custom)
│   │   ├── context/      \# React context (Auth, Theme)
│   │   ├── layouts/      \# Page structure (App, Public)
│   │   ├── lib/          \# Utilities, API client
│   │   ├── pages/        \# Route components (Login, Dashboard, Settings)
│   │   ├── routes/       \# AppRouter component
│   │   ├── App.jsx       \# Main App component
│   │   └── main.jsx      \# React entry point
│   ├── public/         \# Static assets
│   ├── .env.example    \# Environment variable template
│   ├── tailwind.config.js \# Tailwind configuration
│   ├── vite.config.js  \# Vite configuration
│   └── package.json
│
├── .gitignore
└── README.md           \# You are here\!

```

---

## 📝 Usage

1.  **Sign Up:** Create a new account and organization.
2.  **Onboarding - Connect Database:** Provide your MongoDB connection string and the specific database name you want to query.
3.  **Onboarding - Provide Schema:** Define your database structure using the JSON format. A template is available in `backend/etc/schema.template.json`. This step triggers the schema embedding process.
4.  **Chat:** Once onboarded, navigate to the dashboard and start asking questions about your data in the chat interface\!
5.  **Settings (Admin):** Manage team members, update database connection details, and modify the schema if needed.

---

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## 👤 Author

- **Aniket Thapa**
  - GitHub: [@aniket-thapa](https://github.com/aniket-thapa)
  - LinkedIn: [@aniket-thapa](https://linkedin.com/in/aniket-thapa)
  - Twitter: [@aniket_thapa](https://x.com/aniketthapa_dev)
  - Email: [aniketthapa04@gmail.com](mailto:aniketthapa04@gmail.com)
